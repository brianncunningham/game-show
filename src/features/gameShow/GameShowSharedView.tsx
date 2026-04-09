import { Box, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { GameShowStandaloneShell } from './GameShowStandaloneShell';
import type { GameShowState } from './types';

interface GameShowSharedViewProps {
  title: string;
  subtitle: string;
  state: GameShowState | null;
  isLoading: boolean;
  error: string | null;
  controls?: React.ReactNode;
}

export const GameShowSharedView = ({ title, subtitle, state, isLoading, error, controls }: GameShowSharedViewProps) => {
  if (isLoading) {
    return (
      <GameShowStandaloneShell>
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '100vh' }}>
          <CircularProgress />
        </Stack>
      </GameShowStandaloneShell>
    );
  }

  if (error || !state) {
    return (
      <GameShowStandaloneShell>
        <Box sx={{ p: 4 }}>
          <Typography color="error">{error ?? 'No game show state available.'}</Typography>
        </Box>
      </GameShowStandaloneShell>
    );
  }

  const selectedQuestion = state.questions.find((question) => question.id === state.roundState.selectedQuestionId) ?? null;
  const buzzWinner = state.teams.find((team) => team.id === state.roundState.buzzWinnerTeamId) ?? null;
  const chooserTeam = state.teams.find((team) => team.id === state.chooserTeamId) ?? null;

  return (
    <GameShowStandaloneShell>
      <Box sx={{ p: 4 }}>
        <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
          <Typography variant="h5" sx={{ fontWeight: 700, flexShrink: 0 }}>{title}</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Chip label={`Status: ${state.status}`} color={state.status === 'live' ? 'success' : 'default'} size="small" />
            <Chip label={`Round ${state.currentRound}`} size="small" />
            <Chip label={`×${state.multiplier}`} size="small" />
            {chooserTeam && <Chip label={`${chooserTeam.name}'s pick`} color="warning" size="small" />}
            <Chip label={state.practiceMode ? 'Practice' : 'Scored'} color={state.practiceMode ? 'warning' : 'primary'} size="small" />
            <Chip label={state.hostLocked ? 'Locked' : 'Unlocked'} color={state.hostLocked ? 'error' : 'success'} size="small" />
          </Stack>
        </Stack>

        {controls}

        <Grid container spacing={1.5}>
          {state.teams.map((team) => (
            <Grid item xs={6} key={team.id}>
              <Card variant="outlined">
                <CardContent sx={{ py: '10px !important' }}>
                  <Typography variant="overline" sx={{ fontWeight: 700, lineHeight: 1 }}>{team.name}</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1, my: 0.5 }}>{team.score}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {team.players.length ? team.players.join(', ') : 'No players'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        </Stack>
      </Box>
    </GameShowStandaloneShell>
  );
};
