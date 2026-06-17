import { useCallback, useEffect, useState } from 'react';
import type { ModeState } from '../types/gameMode';

const MODE_CHANNEL = 'game-show:mode';

export const useActiveMode = () => {
  const [modeState, setModeState] = useState<ModeState>({ activeModeId: null, modes: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMode = useCallback(async () => {
    try {
      const res = await fetch('/api/mode');
      if (!res.ok) throw new Error('Failed to fetch active mode');
      const data = await res.json() as ModeState;
      setModeState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch active mode');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMode();

    const channel = new BroadcastChannel(MODE_CHANNEL);
    channel.onmessage = () => { void fetchMode(); };

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/mode`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = () => { void fetchMode(); };

    return () => {
      channel.close();
      ws.close();
    };
  }, [fetchMode]);

  const switchMode = useCallback(async (modeId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modeId }),
      });
      if (!res.ok) return false;
      await fetchMode();
      new BroadcastChannel(MODE_CHANNEL).postMessage({ modeId });
      return true;
    } catch {
      return false;
    }
  }, [fetchMode]);

  return { modeState, isLoading, error, switchMode, refetch: fetchMode };
};
