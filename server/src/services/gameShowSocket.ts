import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { gameShowStore } from './gameShowStore.js';
import type { GameShowSocketMessage } from '../types/gameShow.js';

const sockets = new Set<WebSocket>();

const broadcast = (message: GameShowSocketMessage) => {
  const raw = JSON.stringify(message);
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(raw);
    }
  }
};

export const attachGameShowSocket = (server: HttpServer) => {
  const wss = new WebSocketServer({ server, path: '/ws/game-show' });

  gameShowStore.subscribe((message: GameShowSocketMessage) => {
    broadcast(message);
  });

  wss.on('connection', (socket: WebSocket) => {
    sockets.add(socket);
    socket.send(JSON.stringify({ type: 'snapshot', payload: gameShowStore.getState() }));

    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  return wss;
};
