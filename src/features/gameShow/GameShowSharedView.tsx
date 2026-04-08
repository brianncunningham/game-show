import { Box, Card, CardContent, Chip, CircularProgress, Grid, List, ListItem, Stack, Typography } from '@mui/material';
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
        <Stack spacing={3}>
        <Box>
          <Typography variant="h3" gutterBottom>{title}</Typography>
          <Typography variant="h6" color="text.secondary">{subtitle}</Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label={`Status: ${state.status}`} color={state.status === 'live' ? 'success' : 'default'} />
          <Chip label={`Round ${state.currentRound}`} />
          <Chip label={`x${state.multiplier} multiplier`} />
          <Chip label={chooserTeam ? `Chooser: ${chooserTeam.name}` : 'Chooser pending'} />
          <Chip label={state.practiceMode ? 'Practice mode' : 'Scored game'} color={state.practiceMode ? 'warning' : 'primary'} />
          <Chip label={state.hostLocked ? 'Host locked' : 'Host unlocked'} color={state.hostLocked ? 'error' : 'success'} />
        </Stack>

        {controls}

        <Grid container spacing={2}>
          {state.teams.map((team) => (
            <Grid item xs={12} md={6} key={team.id}>
              <Card>
                <CardContent>
                  <Typography variant="h4">{team.name}</Typography>
                  <Typography variant="h2">{team.score}</Typography>
                  <Typography color="text.secondary">
                    {team.players.length ? team.players.join(', ') : 'No players assigned yet'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>Current question</Typography>
            {selectedQuestion ? (
              <Stack spacing={1}>
                <Typography variant="h4">{selectedQuestion.category}</Typography>
                <Typography variant="h6">{selectedQuestion.songLabel}</Typography>
                <Typography color="text.secondary">
                  Clip {selectedQuestion.clipStart}s to {selectedQuestion.clipStart + selectedQuestion.clipDuration}s, base {selectedQuestion.basePoints} pts
                </Typography>
              </Stack>
            ) : (
              <Typography color="text.secondary">No question selected yet.</Typography>
            )}
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>Round state</Typography>
                <Typography>Clip: {state.roundState.clipState}</Typography>
                <Typography>Answer: {state.roundState.answerState}</Typography>
                <Typography>Steal: {state.roundState.stealState}</Typography>
                <Typography>Buzz winner: {buzzWinner ? buzzWinner.name : 'Waiting for host selection'}</Typography>
                <Typography>
                  Last points: {state.roundState.lastPointsAwarded ?? 'None'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>Recent events</Typography>
                <List dense>
                  {state.eventLog.slice().reverse().slice(0, 6).map((entry) => (
                    <ListItem key={`${entry.at}-${entry.action}`} sx={{ px: 0 }}>
                      <Typography color="text.secondary">
                        {entry.action} at {new Date(entry.at).toLocaleTimeString()}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        </Stack>
      </Box>
    </GameShowStandaloneShell>
  );
};
