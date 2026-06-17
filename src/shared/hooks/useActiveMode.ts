import { useCallback, useEffect, useState } from 'react';
import type { ModeState } from '../types/gameMode';

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
      return true;
    } catch {
      return false;
    }
  }, [fetchMode]);

  return { modeState, isLoading, error, switchMode, refetch: fetchMode };
};
