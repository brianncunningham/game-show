/**
 * Mode WebSocket — broadcasts MODE_CHANGED to all connected clients
 * whenever the active game mode is switched.
 *
 * Path: /ws/mode
 * Message: { type: 'MODE_CHANGED', modeId: string }
 */

import { WebSocket } from 'ws';
import { registerWsPath } from './webSocketManager.js';

const clients = new Set<WebSocket>();

export const initModeSocket = (): void => {
  registerWsPath('/ws/mode', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });
};

export const broadcastModeChanged = (modeId: string): void => {
  const msg = JSON.stringify({ type: 'MODE_CHANGED', modeId });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
};
