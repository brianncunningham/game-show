# GameShow Pi — Wi-Fi Provisioning Reference

## What It Does
On every boot, the Pi tries to connect to Wi-Fi before starting the game-show server.
If no known network is available, it creates its own Wi-Fi AP so you can configure it.

---

## Boot Flow
1. Pi boots → `wifi-provision.service` runs
2. Tries home network (30s timeout)
3. Tries other saved networks (15s each)
4. If all fail → creates **GameShow-Setup** AP + starts config portal
5. Once connected → shuts down AP → starts game-show-server (pm2)

---

## AP Mode

| Item | Value |
|---|---|
| AP Network Name (SSID) | `GameShow-Setup` |
| AP Password | *(none — open network)* |
| Portal URL | `http://gameshow.local:8080` |
| Portal URL (fallback) | `http://192.168.4.1:8080` |

**Steps when away from home:**
1. On your phone/laptop, connect to `GameShow-Setup` Wi-Fi
2. Open browser → `http://gameshow.local:8080`
3. Select a saved network or enter new SSID + password
4. Pi connects, AP shuts down automatically

---

## Testing Without Losing Home Network

**Force AP mode:**
```bash
sudo touch /var/lib/wifi-provision/force-ap
sudo systemctl restart wifi-provision
```

**Test portal UI only (while on home network):**
```bash
# Access the portal from your laptop browser:
http://<pi-ip>:8080
```

**Return to normal:**
```bash
sudo rm /var/lib/wifi-provision/force-ap
sudo systemctl restart wifi-provision
```

---

## Managing Saved Networks

**List saved Wi-Fi connections:**
```bash
nmcli connection show
```

**Add a new network:**
```bash
nmcli device wifi connect "SSID-Name" password "yourpassword"
```

**Remove a network:**
```bash
nmcli connection delete "SSID-Name"
```

**Set which network is tried first (home):**
The script tries networks in order of most recently used. To force a specific one first,
reconnect to it manually so it becomes the most recent:
```bash
nmcli connection up "YourHomeSSID"
```

---

## Checking Status

**Live logs:**
```bash
journalctl -u wifi-provision -f
```

**Log file:**
```bash
cat /var/log/wifi-provision.log
```

**Current state:**
```bash
cat /var/lib/wifi-provision/status.json
```

**Service status:**
```bash
systemctl status wifi-provision
```

---

## Re-running Provisioning Manually
```bash
sudo systemctl restart wifi-provision
```

---

## Installation (first time only)
```bash
cd ~/path/to/game-show/wifi-provision
sudo bash install.sh
```

---

## File Locations

| File | Purpose |
|---|---|
| `/opt/wifi-provision/server.js` | Portal web server |
| `/opt/wifi-provision/public/index.html` | Portal UI |
| `/usr/local/bin/wifi-provision.sh` | Boot orchestration script |
| `/usr/local/bin/wifi-provision-success.sh` | Called after successful portal connect |
| `/etc/systemd/system/wifi-provision.service` | systemd unit |
| `/etc/hostapd/hostapd.conf` | AP configuration |
| `/etc/dnsmasq.d/ap.conf` | DHCP + DNS for AP clients |
| `/var/lib/wifi-provision/status.json` | Current state |
| `/var/lib/wifi-provision/force-ap` | Create this file to force AP mode |
| `/var/log/wifi-provision.log` | Log file |

---

## Interaction with Game-Show Server
- `wifi-provision.service` runs **before** pm2 — pm2 only starts after network confirmed
- Portal runs on port **8080** — no conflict with game-show-server (port 3001)
- Only `wlan0` is managed — no effect on Tailscale or other interfaces
