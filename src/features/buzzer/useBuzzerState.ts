import { useEffect, useRef, useState } from 'react';

export type JudgeState = 'IDLE' | 'ARMED' | 'LOCKED';

export interface BuzzerEvent {
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

const getBuzzerSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // In Vite dev (port 4174), WS proxy is unreliable — connect directly to backend
  const host = window.location.port === '4174'
    ? `${window.location.hostname}:3001`
    : window.location.host;
  return `${protocol}//${host}/ws/buzzer`;
};

const MAX_LOG = 50;

export const useBuzzerState = () => {
  const [judgeState, setJudgeState] = useState<JudgeState>('IDLE');
  const [eventLog, setEventLog] = useState<BuzzerEvent[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(getBuzzerSocketUrl());
    socketRef.current = socket;

    socket.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as BuzzerEvent;

      setEventLog(prev => [msg, ...prev].slice(0, MAX_LOG));

      if (msg.type === 'STATE') {
        const payload = msg.payload as { state: JudgeState };
        setJudgeState(payload.state);
      }
      if (msg.type === 'BUZZ_ACCEPTED') {
        setJudgeState('LOCKED');
      }
    };

    socket.onerror = () => {
      console.warn('[Buzzer] WebSocket error');
    };

    return () => {
      socket.close();
    };
  }, []);

  return { judgeState, eventLog };
};
