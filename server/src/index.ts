import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express from 'express';
import { attachGameShowSocket } from './services/gameShowSocket.js';
import gameShowRoutes from './routes/gameShowRoutes.js';

const PORT = Number(process.env.PORT ?? 3001);
const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '../../dist');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/game-show', gameShowRoutes);

app.use(express.static(DIST));
app.get('*', (_req, res) => {
  res.sendFile(join(DIST, 'index.html'));
});

const server = createServer(app);

attachGameShowSocket(server);

server.listen(PORT, () => {
  console.log(`Game show server listening on http://localhost:${PORT}`);
});
