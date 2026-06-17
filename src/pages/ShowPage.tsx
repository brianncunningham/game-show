import { Box, CircularProgress, Typography } from '@mui/material';
import { useActiveMode } from '../shared/hooks/useActiveMode';
import { getClientMode } from '../shared/modeRegistry';

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

  return <mode.ShowComponent />;
};

export default ShowPage;
