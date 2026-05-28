const express = require('express');
const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;
const STATUS_FILE = '/var/lib/wifi-provision/status.json';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function writeStatus(data) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data));
  } catch (e) {}
}

function getSavedNetworks() {
  try {
    const output = execSync(
      "nmcli -t -f NAME,TYPE connection show | grep ':802-11-wireless' | cut -d: -f1",
      { encoding: 'utf8' }
    ).trim();
    return output ? output.split('\n').filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

function getCurrentIP() {
  try {
    return execSync("hostname -I | awk '{print $1}'", { encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

app.get('/api/status', (req, res) => {
  try {
    const raw = fs.existsSync(STATUS_FILE) ? fs.readFileSync(STATUS_FILE, 'utf8') : '{}';
    res.json(JSON.parse(raw));
  } catch (e) {
    res.json({});
  }
});

app.get('/api/networks', (req, res) => {
  res.json({ networks: getSavedNetworks() });
});

app.post('/api/connect', (req, res) => {
  const { ssid, password, saved } = req.body;

  if (!ssid) {
    return res.status(400).json({ error: 'SSID required' });
  }

  writeStatus({ state: 'connecting', ssid });
  res.json({ ok: true, message: `Attempting to connect to ${ssid}...` });

  const connectCmd = saved
    ? `nmcli connection up "${ssid}"`
    : password
      ? `nmcli device wifi connect "${ssid}" password "${password}"`
      : `nmcli device wifi connect "${ssid}"`;

  exec(connectCmd, { timeout: 30000 }, (err, stdout, stderr) => {
    if (err) {
      writeStatus({ state: 'failed', ssid, error: stderr || err.message });
      return;
    }

    const ip = getCurrentIP();
    writeStatus({ state: 'connected', ssid, ip });

    exec('/usr/local/bin/wifi-provision-success.sh', (err2) => {
      if (err2) console.error('Success script error:', err2.message);
    });
  });
});

app.post('/api/scan', (req, res) => {
  exec('nmcli device wifi rescan && sleep 2 && nmcli -t -f SSID,SIGNAL,SECURITY device wifi list', 
    { timeout: 15000 }, 
    (err, stdout) => {
      if (err) return res.status(500).json({ error: 'Scan failed' });
      const networks = stdout.trim().split('\n')
        .filter(Boolean)
        .map(line => {
          const parts = line.split(':');
          return { ssid: parts[0], signal: parts[1], security: parts[2] };
        })
        .filter(n => n.ssid);
      res.json({ networks });
    }
  );
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Wi-Fi provisioning portal running on port ${PORT}`);
});
