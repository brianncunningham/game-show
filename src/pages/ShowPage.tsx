import { Box, Typography } from '@mui/material';
import { GameShowStandaloneShell } from '../features/gameShow/GameShowStandaloneShell';
import { ShowBoard } from '../features/gameShow/ShowBoard';
import { useGameShowState } from '../features/gameShow/useGameShowState';

export const ShowPage = () => {
  const { state, isLoading, error } = useGameShowState();

  if (isLoading) {
    return (
      <GameShowStandaloneShell>
        <Box sx={{ p: 6 }}>
          <Typography variant="h3">Loading show screen…</Typography>
        </Box>
      </GameShowStandaloneShell>
    );
  }

  if (error || !state) {
    return (
      <GameShowStandaloneShell>
        <Box sx={{ p: 6 }}>
          <Typography color="error" variant="h4">{error ?? 'Show state unavailable'}</Typography>
        </Box>
      </GameShowStandaloneShell>
    );
  }

  return (
    <GameShowStandaloneShell>
      <Box sx={{ position: 'relative' }}>
        <ShowBoard state={state} />
      </Box>
    </GameShowStandaloneShell>
  );
};

export default ShowPage;
