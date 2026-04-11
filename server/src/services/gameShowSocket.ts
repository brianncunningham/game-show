import type { Server as HttpServer } from 'http';
import { WebSocket } from 'ws';
import { gameShowStore } from './gameShowStore.js';
import { registerWsPath, initWebSocketManager } from './webSocketManager.js';
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
  initWebSocketManager(server);

  gameShowStore.subscribe((message: GameShowSocketMessage) => {
    broadcast(message);
  });

  registerWsPath('/ws/game-show', (socket) => {
    sockets.add(socket);
    socket.send(JSON.stringify({ type: 'snapshot', payload: gameShowStore.getState() }));
    socket.on('close', () => sockets.delete(socket));
  });
};
