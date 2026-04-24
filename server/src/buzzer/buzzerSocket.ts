/**
 * Buzzer WebSocket channel — /ws/buzzer
 *
 * Broadcasts all judge events to connected clients.
 * Sends a STATE snapshot on each new connection.
 */

import type { Server as HttpServer } from 'http';
import { WebSocket } from 'ws';
import { judgeController } from './judgeController.js';
import { gameShowStore } from '../services/gameShowStore.js';
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
    // Clear penalties when a new window opens (client handles adding via API on BUZZ_EARLY)
    if (message.type === 'WINDOW_STATE') {
      const payload = message.payload as { windowState: string; isSteal?: boolean; eligibleControllers?: string[] };
      if (payload.windowState === 'WAITING' && payload.isSteal) {
        // Clear penalties for controllers that are eligible again
        const eligible = payload.eligibleControllers ?? [];
        const penalized = gameShowStore.getState().roundState.penalizedControllerIds;
        const toRemove = eligible.length > 0
          ? penalized.filter(id => eligible.includes(id))
          : penalized; // empty eligible = all eligible
        for (const id of toRemove) {
          gameShowStore.removePenalizedController(id);
        }
      } else if (payload.windowState === 'WAITING' && !payload.isSteal) {
        // Fresh round — clear all penalties
        const penalized = [...gameShowStore.getState().roundState.penalizedControllerIds];
        for (const id of penalized) {
          gameShowStore.removePenalizedController(id);
        }
      }
    }
    broadcast(message);
  });

  registerWsPath('/ws/buzzer', (socket) => {
    sockets.add(socket);
    const { windowId, windowState } = judgeController.getWindowState();
    socket.send(JSON.stringify({
      type: 'WINDOW_STATE',
      timestamp: new Date().toISOString(),
      payload: { windowId, windowState },
    }));
    socket.on('close', () => sockets.delete(socket));
  });
};
