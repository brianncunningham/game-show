import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useActiveMode } from '../shared/hooks/useActiveMode';
import { getClientMode } from '../shared/modeRegistry';

const CURSOR_IDLE_MS = 2000;

// Hides the mouse cursor after a period of inactivity (for screen mirroring) while
// still letting it reappear on movement/click, so the host can access browser chrome
// (e.g. "click to enable sound" prompts, exiting fullscreen) when needed.
const useAutoHideCursor = (idleMs: number = CURSOR_IDLE_MS) => {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const showAndScheduleHide = () => {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), idleMs);
    };
    showAndScheduleHide();
    window.addEventListener('mousemove', showAndScheduleHide);
    window.addEventListener('mousedown', showAndScheduleHide);
    return () => {
      window.removeEventListener('mousemove', showAndScheduleHide);
      window.removeEventListener('mousedown', showAndScheduleHide);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idleMs]);

  return visible;
};

const unlockAudio = () => {
  const audio = new Audio('/buzz.mp3');
  audio.volume = 0;
  void audio.play().then(() => { audio.pause(); }).catch(() => { /* ignore */ });
  window.removeEventListener('click', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
};
window.addEventListener('click', unlockAudio);
window.addEventListener('keydown', unlockAudio);

export const ShowPage = () => {
  const { modeState, isLoading } = useActiveMode();
  const cursorVisible = useAutoHideCursor();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#070d1f' }}>
        <CircularProgress />
      </Box>
    );
  }

  const mode = modeState.activeModeId ? getClientMode(modeState.activeModeId) : null;

  if (!mode) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#070d1f' }}>
        <Typography color="error" variant="h4">No active game mode.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ cursor: cursorVisible ? 'default' : 'none' }}>
      <mode.ShowComponent />
    </Box>
  );
};

export default ShowPage;
