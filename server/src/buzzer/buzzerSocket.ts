/**
 * Buzzer WebSocket channel — /ws/buzzer
 *
 * Broadcasts all judge events to connected clients.
 * Sends a STATE snapshot on each new connection.
 */

import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { judgeController } from './judgeController.js';
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
  const wss = new WebSocketServer({ server, path: '/ws/buzzer' });

  judgeController.onEvent((message) => {
    broadcast(message);
  });

  wss.on('connection', (socket: WebSocket) => {
    sockets.add(socket);

    const stateMsg = JSON.stringify({
      type: 'STATE',
      timestamp: new Date().toISOString(),
      payload: { state: judgeController.getState() },
    });
    socket.send(stateMsg);

    socket.on('close', () => {
      sockets.delete(socket);
    });
  });
};
