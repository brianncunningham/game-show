import { Button, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import {
  markCorrect,
  markStealFail,
  markStealSuccess,
  markWrong,
  nextRound,
  resetRound,
  resetScores,
  selectQuestion,
  setBuzzWinner,
  startGame,
  toggleHostLock,
  undoLastAction,
} from '../features/gameShow/api';
import { GameShowSharedView } from '../features/gameShow/GameShowSharedView';
import { useGameShowState } from '../features/gameShow/useGameShowState';

export const HostPage = () => {
  const { state, isLoading, error } = useGameShowState();

  const hasQuestion = Boolean(state?.roundState.selectedQuestionId);
  const hasBuzzWinner = Boolean(state?.roundState.buzzWinnerTeamId);
  const stealAvailable = state?.roundState.stealState === 'available';
  const answerResolved = state?.roundState.answerState === 'correct' || state?.roundState.stealState === 'resolved';
  const canPickQuestion = state?.status === 'live' && !hasQuestion;
  const canBuzz = state?.roundState.clipState === 'active' && !hasBuzzWinner;
  const canJudgeAnswer = hasQuestion && hasBuzzWinner && !answerResolved && !stealAvailable;
  const canAdvance = !hasQuestion || answerResolved;

  return (
    <GameShowSharedView
      title="Host Control"
      subtitle="Fast controls for running the round and pushing updates to the show screen."
      state={state}
      isLoading={isLoading}
      error={error}
      controls={
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button variant="contained" onClick={() => void startGame()} disabled={state?.status === 'live'}>
                  Start game
                </Button>
                <Button color="info" variant="contained" onClick={() => void toggleHostLock()}>
                  {state?.hostLocked ? 'Unlock host' : 'Lock host'}
                </Button>
                <Button variant="outlined" onClick={() => void undoLastAction()}>
                  Undo
                </Button>
                <Button variant="outlined" onClick={() => void resetRound()}>
                  Reset round
                </Button>
                <Button color="error" variant="outlined" onClick={() => void resetScores()}>
                  Reset scores
                </Button>
                <Button variant="contained" onClick={() => void nextRound()} disabled={!canAdvance}>
                  Next round
                </Button>
              </Stack>

              <Divider />

              <Stack spacing={1}>
                <Typography variant="subtitle1">1. Choose question</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  {state?.questions.map((question) => (
                    <Button
                      key={question.id}
                      variant="outlined"
                      disabled={!canPickQuestion}
                      onClick={() => void selectQuestion(question.id)}
                    >
                      {question.category || 'Category'}: {question.songLabel || question.id}
                    </Button>
                  ))}
                </Stack>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle1">2. Pick buzz winner</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Button color="secondary" variant="contained" disabled={!canBuzz} onClick={() => void setBuzzWinner('team-a')}>
                    Team A buzzed
                  </Button>
                  <Button color="secondary" variant="contained" disabled={!canBuzz} onClick={() => void setBuzzWinner('team-b')}>
                    Team B buzzed
                  </Button>
                </Stack>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle1">3. Judge answer</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Button color="success" variant="contained" disabled={!canJudgeAnswer} onClick={() => void markCorrect()}>
                    Correct
                  </Button>
                  <Button color="error" variant="contained" disabled={!canJudgeAnswer} onClick={() => void markWrong()}>
                    Wrong
                  </Button>
                </Stack>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle1">4. Resolve steal</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Button color="warning" variant="contained" disabled={!stealAvailable} onClick={() => void markStealSuccess()}>
                    Steal success
                  </Button>
                  <Button color="inherit" variant="outlined" disabled={!stealAvailable} onClick={() => void markStealFail()}>
                    Steal fail
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      }
    />
  );
};

export default HostPage;
