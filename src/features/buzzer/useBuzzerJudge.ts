/**
 * useBuzzerJudge
 *
 * Connects to the judge WebSocket in non-manual buzzer modes.
 * On BUZZ_ACCEPTED: resolves the controllerId → teamId server-side and sets the buzz winner.
 * On BUZZ_EARLY: logs to console (app penalty handling is future work).
 *
 * Only active when buzzerMode is 'phone' or 'hardware'.
 */

import { useEffect, useRef } from 'react';
import type { BuzzerMode } from '../gameShow/types';

const GAME_API = '/api/game-show';

const getBuzzerSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.port === '4174'
    ? `${window.location.hostname}:3001`
    : window.location.host;
  return `${protocol}//${host}/ws/buzzer`;
};

interface JudgeMessage {
  type: string;
  payload: Record<string, unknown>;
}

interface UseBuzzerJudgeOptions {
  buzzerMode: BuzzerMode;
  /** Called after the buzz winner has been set server-side (for Spotify pause etc.) */
  onBuzzAccepted?: (controllerId: string) => void;
  /** Called when a BUZZ_EARLY is detected (app may apply penalty in future). */
  onBuzzEarly?: (windowId: string, controllerId: string) => void;
}

export const useBuzzerJudge = ({ buzzerMode, onBuzzAccepted, onBuzzEarly }: UseBuzzerJudgeOptions) => {
  const onBuzzAcceptedRef = useRef(onBuzzAccepted);
  const onBuzzEarlyRef = useRef(onBuzzEarly);
  onBuzzAcceptedRef.current = onBuzzAccepted;
  onBuzzEarlyRef.current = onBuzzEarly;

  useEffect(() => {
    if (buzzerMode === 'manual') return;

    let socket: WebSocket | null = null;
    let cancelled = false;

    const connect = () => {
      socket = new WebSocket(getBuzzerSocketUrl());

      socket.onmessage = (event: MessageEvent<string>) => {
        if (cancelled) return;
        let msg: JudgeMessage;
        try {
          msg = JSON.parse(event.data) as JudgeMessage;
        } catch {
          return;
        }

        if (msg.type === 'BUZZ_ACCEPTED') {
          const controllerId = msg.payload.controllerId as string | undefined;
          if (!controllerId) return;
          console.log(`[BuzzerJudge] BUZZ_ACCEPTED controllerId=${controllerId} — resolving to team`);
          void fetch(`${GAME_API}/buzz/controller/${encodeURIComponent(controllerId)}`, {
            method: 'POST',
            credentials: 'include',
          }).then(r => {
            if (!r.ok) {
              console.warn(`[BuzzerJudge] buzz/controller/${controllerId} responded ${r.status}`);
            } else {
              onBuzzAcceptedRef.current?.(controllerId);
            }
          });
        }

        if (msg.type === 'BUZZ_EARLY') {
          const windowId = msg.payload.windowId as string | undefined;
          const controllerId = msg.payload.controllerId as string | undefined;
          if (windowId && controllerId) {
            console.warn(`[BuzzerJudge] BUZZ_EARLY windowId=${windowId} controllerId=${controllerId}`);
            onBuzzEarlyRef.current?.(windowId, controllerId);
          }
        }
      };

      socket.onerror = () => {
        if (!cancelled) {
          console.warn('[BuzzerJudge] WebSocket error — will not reconnect automatically');
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      socket?.close();
    };
  }, [buzzerMode]);
};
