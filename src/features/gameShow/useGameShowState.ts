import { useEffect, useMemo, useState } from 'react';
import { getGameShowState } from './api';
import type { GameShowSocketMessage, GameShowState } from './types';

const getSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // In Vite dev (port 4174), WS proxy is unreliable — connect directly to backend
  const host = window.location.port === '4174'
    ? `${window.location.hostname}:3001`
    : window.location.host;
  return `${protocol}//${host}/ws/game-show`;
};

export const useGameShowState = () => {
  const [state, setState] = useState<GameShowState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let cancelled = false;
    let refreshTimer: number | null = null;

    const load = async () => {
      try {
        const initialState = await getGameShowState();
        if (!cancelled) {
          setState(initialState);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load game show');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }
      refreshTimer = window.setTimeout(() => {
        void load();
      }, 120);
    };

    void load();

    socket = new WebSocket(getSocketUrl());
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as GameShowSocketMessage;
      if (message.type === 'snapshot') {
        setState(message.payload);
      } else {
        setState(message.payload.state);
        scheduleRefresh();
      }
    };

    socket.onerror = () => {
      setError('Game show live sync disconnected');
    };

    return () => {
      cancelled = true;
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }
      socket?.close();
    };
  }, []);

  return useMemo(() => ({ state, isLoading, error }), [state, isLoading, error]);
};
