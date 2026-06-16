/**
 * Single WebSocket server that routes upgrade requests by path.
 * Using multiple WebSocketServer instances with { server, path } is unreliable
 * in the ws library — the first registered instance intercepts all upgrades.
 * This manager handles the upgrade event manually and dispatches by path.
 */

import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';

type PathHandler = (socket: WebSocket, request: IncomingMessage) => void;

const handlers = new Map<string, PathHandler>();

let initialized = false;

export const registerWsPath = (path: string, handler: PathHandler): void => {
  handlers.set(path, handler);
};

export const initWebSocketManager = (server: HttpServer): void => {
  if (initialized) return;
  initialized = true;

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = request.url ?? '';
    const path = url.split('?')[0];

    const handler = handlers.get(path);
    if (!handler) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      handler(ws, request);
    });
  });
};
