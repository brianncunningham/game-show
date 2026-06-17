import { Box, CircularProgress, Typography } from '@mui/material';
import { useActiveMode } from '../shared/hooks/useActiveMode';
import { getClientMode } from '../shared/modeRegistry';

export const HostPage = () => {
  const { modeState, isLoading } = useActiveMode();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const mode = modeState.activeModeId ? getClientMode(modeState.activeModeId) : null;

  if (!mode) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error" variant="h4">No active game mode.</Typography>
      </Box>
    );
  }

  return <mode.HostComponent />;
};

export default HostPage;
