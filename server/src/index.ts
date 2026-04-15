import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express from 'express';
import { attachGameShowSocket } from './services/gameShowSocket.js';
import { attachBuzzerSocket } from './buzzer/buzzerSocket.js';
import gameShowRoutes from './routes/gameShowRoutes.js';
import buzzerRoutes from './routes/buzzerRoutes.js';
import { initHardwareInput } from './buzzer/inputs/hardwareInput.js';
import { request as httpRequest } from 'http';
import { connect as netConnect } from 'net';

const PORT = Number(process.env.PORT ?? 3001);
const JUDGE_URL = process.env['JUDGE_URL'] ?? null;
const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '../../dist');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/game-show', gameShowRoutes);

if (JUDGE_URL) {
  const judgeUrl = new URL(JUDGE_URL);
  console.log(`[Judge] Proxying /api/buzzer → ${JUDGE_URL}`);
  app.use('/api/buzzer', (req, res) => {
    const bindAddr = process.env['BIND_ADDR'];
    const options = {
      hostname: judgeUrl.hostname,
      port: Number(judgeUrl.port) || 3001,
      path: `/api/buzzer${req.url}`,
      method: req.method,
      headers: { ...req.headers, host: judgeUrl.host },
      ...(bindAddr ? { localAddress: bindAddr } : {}),
    };
    const proxy = httpRequest(options, (piRes) => {
      res.writeHead(piRes.statusCode ?? 502, piRes.headers);
      piRes.pipe(res);
    });
    proxy.on('error', (err) => res.status(502).send(err.message));
    req.pipe(proxy);
  });
} else {
  app.use('/api/buzzer', buzzerRoutes);
}

app.use(express.static(DIST));
app.get('*', (_req, res) => {
  res.sendFile(join(DIST, 'index.html'));
});

const server = createServer(app);

attachGameShowSocket(server);
if (!JUDGE_URL) {
  attachBuzzerSocket(server);
} else {
  const judgeUrl = new URL(JUDGE_URL);
  const piHost = judgeUrl.hostname;
  const piPort = Number(judgeUrl.port) || 3001;
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/ws/buzzer') return;
    let upgraded = false;
    const piSocket = netConnect(piPort, piHost, () => {
      const reqLine = `GET /ws/buzzer HTTP/1.1\r\nHost: ${piHost}:${piPort}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${req.headers['sec-websocket-key']}\r\nSec-WebSocket-Version: 13\r\n\r\n`;
      piSocket.write(reqLine);
    });
    piSocket.on('data', (data: Buffer) => {
      if (!upgraded) {
        upgraded = true;
      }
      socket.write(data);
    });
    socket.on('data', (data: Buffer) => piSocket.write(data));
    socket.on('end', () => piSocket.end());
    piSocket.on('end', () => socket.end());
    piSocket.on('error', () => socket.destroy());
    socket.on('error', () => piSocket.destroy());
  });
}

server.listen(PORT, () => {
  console.log(`Game show server listening on http://localhost:${PORT}`);
  void initHardwareInput();
});
