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
import { createProxyMiddleware } from 'http-proxy-middleware';

const PORT = Number(process.env.PORT ?? 3001);
const JUDGE_URL = process.env['JUDGE_URL'] ?? null;
const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '../../dist');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/game-show', gameShowRoutes);

if (JUDGE_URL) {
  console.log(`[Judge] Proxying /api/buzzer and /ws/buzzer → ${JUDGE_URL}`);
  app.use(createProxyMiddleware({
    target: JUDGE_URL,
    changeOrigin: true,
    pathFilter: ['/api/buzzer', '/ws/buzzer'],
  }));
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
}

server.listen(PORT, () => {
  console.log(`Game show server listening on http://localhost:${PORT}`);
  void initHardwareInput();
});
