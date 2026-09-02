import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express from 'express';
import { attachGameShowSocket } from './shared/services/gameShowSocket.js';
import { attachBuzzerSocket } from './shared/buzzer/buzzerSocket.js';
import gameShowRoutes from './modes/nameThatTune/routes.js';
import buzzerRoutes from './shared/buzzer/buzzerRoutes.js';
import modeRoutes from './shared/routes/modeRoutes.js';
import buildInfoRoutes from './shared/routes/buildInfoRoutes.js';
import { initHardwareInput } from './shared/buzzer/inputs/hardwareInput.js';
import { request as httpRequest } from 'http';
import { WebSocket } from 'ws';
import { registerWsPath } from './shared/services/webSocketManager.js';
import { registerMode, initModeRegistry } from './shared/services/modeRegistry.js';
import { initModeSocket } from './shared/services/modeSocket.js';
import { nameThatTuneMode } from './modes/nameThatTune/index.js';
import { surveySaysMode } from './modes/surveySays/index.js';
import ssRoutes, { handlePiBuzzAccepted, handlePiWandTestBuzz } from './modes/surveySays/routes.js';
import { ttotoMode } from './modes/ttoto/index.js';
import ttotoRoutes, { handlePiBuzzAccepted as ttotoHandlePiBuzzAccepted } from './modes/ttoto/routes.js';

const PORT = Number(process.env.PORT ?? 3001);
const JUDGE_URL = process.env['JUDGE_URL'] ?? null;
const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '../../dist');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/mode', modeRoutes);
app.use('/api/build-info', buildInfoRoutes);
app.use('/api/game-show', gameShowRoutes);
app.use('/api/survey-says', ssRoutes);
app.use('/api/ttoto', ttotoRoutes);

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
    if (req.body && Object.keys(req.body as object).length > 0) {
      const body = JSON.stringify(req.body);
      proxy.setHeader('content-length', Buffer.byteLength(body));
      proxy.write(body);
      proxy.end();
    } else {
      req.pipe(proxy);
    }
  });
} else {
  app.use('/api/buzzer', buzzerRoutes);
}

app.use(express.static(DIST));
app.get('*', (_req, res) => {
  res.sendFile(join(DIST, 'index.html'));
});

const server = createServer(app);

// Keep a WS connection to the Pi alive-checked: a dropped Wi-Fi/Tailscale link
// on the Pi doesn't always send a clean TCP FIN, so the socket can go
// "zombie" (readyState stays OPEN but no data ever arrives again) without
// 'close'/'error' ever firing. Left alone, that silently swallows every real
// hardware buzz (or freezes the host's live status display) until the OS
// eventually times out the connection (which can take minutes). Ping/pong
// every 5s and force-terminate if a pong doesn't come back within 10s so
// callers' 'close' handlers fire promptly and can reconnect.
const PING_INTERVAL_MS = 5000;
const PONG_TIMEOUT_MS = 10000;

function keepAlive(ws: WebSocket, label: string): void {
  let pongTimer: ReturnType<typeof setTimeout> | null = null;
  const pingInterval = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return;
    pongTimer = setTimeout(() => {
      console.warn(`[${label}] no pong within timeout — terminating stale connection`);
      ws.terminate();
    }, PONG_TIMEOUT_MS);
    ws.ping();
  }, PING_INTERVAL_MS);
  ws.on('pong', () => {
    if (pongTimer) clearTimeout(pongTimer);
    pongTimer = null;
  });
  ws.on('close', () => {
    clearInterval(pingInterval);
    if (pongTimer) clearTimeout(pongTimer);
  });
}

attachGameShowSocket(server);
initModeSocket();
if (!JUDGE_URL) {
  attachBuzzerSocket(server);
} else {
  const judgeUrl = new URL(JUDGE_URL);
  const piHost = judgeUrl.hostname;
  const piPort = Number(judgeUrl.port) || 3001;
  registerWsPath('/ws/buzzer', (clientWs) => {
    const piWs = new WebSocket(`ws://${piHost}:${piPort}/ws/buzzer`, { perMessageDeflate: false });
    piWs.on('open', () => {
      keepAlive(piWs, 'BuzzerProxy');
      clientWs.on('message', (msg, isBinary) => piWs.readyState === WebSocket.OPEN && piWs.send(msg, { binary: isBinary }));
      piWs.on('message', (msg) => clientWs.readyState === WebSocket.OPEN && clientWs.send(msg.toString()));
    });
    piWs.on('close', () => clientWs.close());
    clientWs.on('close', () => piWs.close());
    piWs.on('error', () => clientWs.close());
    clientWs.on('error', () => piWs.close());
  });

  // Server-side sniffer: persistent WS connection to Pi that dispatches
  // BUZZ_ACCEPTED events into active mode game logic (since judgeController
  // on the VPS never receives buzzes — the Pi handles them locally).
  const connectPiSniffer = () => {
    const snifferWs = new WebSocket(`ws://${piHost}:${piPort}/ws/buzzer`, { perMessageDeflate: false });
    snifferWs.on('open', () => {
      console.log('[PiSniffer] connected');
      keepAlive(snifferWs, 'PiSniffer');
    });
    snifferWs.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; payload: Record<string, unknown> };
        if (msg.type === 'BUZZ_ACCEPTED') {
          const windowId = msg.payload['windowId'] as string | null;
          const controllerId = String(msg.payload['controllerId'] ?? '');
          console.log(`[PiSniffer] BUZZ_ACCEPTED windowId=${windowId} controllerId=${controllerId}`);
          // Both handlers no-op unless windowId matches their own mode's prefix (ss-* /
          // ttoto-*), so it's safe to call both regardless of which mode is active —
          // avoids needing the sniffer to track "which mode is active" itself.
          handlePiBuzzAccepted(windowId, controllerId);
          ttotoHandlePiBuzzAccepted(windowId, controllerId);
        }
        // Wand test: fire team-color LED on every BUZZ_RECEIVED (fires regardless of arm state)
        if (msg.type === 'BUZZ_RECEIVED' && msg.payload['windowId'] === 'ss-wand-test') {
          const controllerId = String(msg.payload['controllerId'] ?? '');
          if (controllerId) handlePiWandTestBuzz(controllerId);
        }
      } catch { /* ignore malformed */ }
    });
    snifferWs.on('close', () => {
      console.warn('[PiSniffer] disconnected — reconnecting in 3s...');
      setTimeout(connectPiSniffer, 3000);
    });
    snifferWs.on('error', () => snifferWs.close());
  };
  setTimeout(connectPiSniffer, 2000);
}

registerMode(nameThatTuneMode);
registerMode(surveySaysMode);
registerMode(ttotoMode);
initModeRegistry();

server.listen(PORT, () => {
  console.log(`Game show server listening on http://localhost:${PORT}`);
  void initHardwareInput();
});
