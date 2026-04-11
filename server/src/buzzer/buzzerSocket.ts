/**
 * Buzzer WebSocket channel — /ws/buzzer
 *
 * Broadcasts all judge events to connected clients.
 * Sends a STATE snapshot on each new connection.
 */

import type { Server as HttpServer } from 'http';
import { WebSocket } from 'ws';
import { judgeController } from './judgeController.js';
import { registerWsPath, initWebSocketManager } from '../services/webSocketManager.js';
import type { JudgeToAppMessage } from './types.js';

const sockets = new Set<WebSocket>();

const broadcast = (message: JudgeToAppMessage) => {
  const raw = JSON.stringify(message);
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(raw);
    }
  }
};

export const attachBuzzerSocket = (server: HttpServer): void => {
  initWebSocketManager(server);

  judgeController.onEvent((message) => {
    broadcast(message);
  });

  registerWsPath('/ws/buzzer', (socket) => {
    sockets.add(socket);
    socket.send(JSON.stringify({
      type: 'STATE',
      timestamp: new Date().toISOString(),
      payload: { state: judgeController.getState() },
    }));
    socket.on('close', () => sockets.delete(socket));
  });
};
