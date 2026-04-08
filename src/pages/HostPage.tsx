import { Box, Button, Card, CardContent, Chip, Divider, Grid, Stack, Typography } from '@mui/material';
import {
  awardArtistBonus,
  endGame,
  markCorrect,
  randomAssignPlayers,
  showIntroOff,
  showIntroOn,
  showRulesOff,
  showRulesOn,
  randomFirstPick,
  dismissFirstPick,
  showBoard,
  markStealFail,
  markStealSuccess,
  markWrong,
  nextRound,
  resetRound,
  resetScores,
  selectQuestion,
  selectSong,
  setBuzzWinner,
  startGame,
  toggleHostLock,
  triggerSuddenDeath,
  undoLastAction,
} from '../features/gameShow/api';
import { GameShowSharedView } from '../features/gameShow/GameShowSharedView';
import { useGameShowState } from '../features/gameShow/useGameShowState';

const sectionLabelSx = {
  fontWeight: 700,
  fontSize: { xs: '0.8rem', md: '0.85rem' },
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
  mb: 1,
};

const bigBtnSx = {
  py: { xs: 2, md: 1.5 },
  fontSize: { xs: '1.05rem', md: '0.95rem' },
  minHeight: { xs: 56, md: 44 },
};

const SONG_COUNT = 3;

export const HostPage = () => {
  const { state, isLoading, error } = useGameShowState();

  const hasQuestion = Boolean(state?.roundState.selectedQuestionId);
  const hasBuzzWinner = Boolean(state?.roundState.buzzWinnerTeamId);
  const stealAvailable = state?.roundState.stealState === 'available';
  const answerResolved = state?.roundState.answerState === 'correct' || state?.roundState.stealState === 'resolved';
  const canPickQuestion = (state?.status === 'live' || state?.status === 'sudden_death') && !hasQuestion;
  const canBuzz = state?.roundState.clipState === 'active' && !hasBuzzWinner;
  const canJudgeAnswer = hasQuestion && hasBuzzWinner && !answerResolved && !stealAvailable;
  const canArtistBonus = state?.roundState.answerState === 'correct' && Boolean(state?.roundState.buzzWinnerTeamId) && !state?.roundState.artistBonusUsed;
  const canAdvance = !hasQuestion || answerResolved;
  const isSuddenDeath = state?.status === 'sudden_death';

  const selectedQuestion = state?.questions.find(q => q.id === state.roundState.selectedQuestionId);
  const usedQuestionIds = state?.roundState.usedQuestionIds ?? [];
  const activeSongIndex = state?.roundState.activeSongIndex ?? null;
  const currentRoundQuestions = state?.questions.filter(q => q.round === state.currentRound) ?? [];

  const allSongsDone = activeSongIndex === SONG_COUNT - 1;
  const canPickSong = hasQuestion && !stealAvailable && !allSongsDone;

  const multiplier = state?.multiplier ?? 1;
  const basePoints = 100;
  const expectedPoints = basePoints * multiplier;
  const chooserTeam = state?.teams.find(t => t.id === state.chooserTeamId) ?? null;

  return (
    <GameShowSharedView
      title="Host Control"
      subtitle=""
      state={state}
      isLoading={isLoading}
      error={error}
      controls={
        <Stack spacing={2}>

          {/* Game controls */}
          <Card>
            <CardContent>
              <Typography sx={sectionLabelSx}>Game</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={6} sm={4} md="auto">
                  <Button fullWidth variant="contained" sx={bigBtnSx} onClick={() => { void showIntroOff(); void showRulesOff(); void startGame(); }} disabled={state?.status === 'live' || state?.status === 'sudden_death' || state?.status === 'complete'}>
                    Start game
                  </Button>
                </Grid>
                <Grid item xs={6} sm={4} md="auto">
                  <Button fullWidth variant="contained" color="info" sx={bigBtnSx} onClick={() => void nextRound()} disabled={!canAdvance}>
                    Next round
                  </Button>
                </Grid>
                <Grid item xs={6} sm={4} md="auto">
                  <Button fullWidth color="error" variant="outlined" sx={bigBtnSx} onClick={() => void triggerSuddenDeath()} disabled={isSuddenDeath}>
                    Sudden Death
                  </Button>
                </Grid>
                <Grid item xs={6} sm={4} md="auto">
                  <Button fullWidth color="info" variant="outlined" sx={bigBtnSx} onClick={() => void toggleHostLock()}>
                    {state?.hostLocked ? 'Unlock host' : 'Lock host'}
                  </Button>
                </Grid>
                <Grid item xs={6} sm={4} md="auto">
                  <Button fullWidth variant="outlined" sx={bigBtnSx} onClick={() => void undoLastAction()}>
                    Undo
                  </Button>
                </Grid>
                <Grid item xs={6} sm={4} md="auto">
                  <Button fullWidth variant="outlined" sx={bigBtnSx} onClick={() => void resetRound()}>
                    Reset round
                  </Button>
                </Grid>
                <Grid item xs={6} sm={4} md="auto">
                  <Button fullWidth color="error" variant="outlined" sx={bigBtnSx} onClick={() => void resetScores()}>
                    Reset scores
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md="auto">
                  <Button
                    fullWidth
                    variant="contained"
                    sx={{ ...bigBtnSx, background: 'linear-gradient(90deg, #b8860b, #ffd700)', color: '#000', fontWeight: 900, '&:hover': { background: 'linear-gradient(90deg, #ffd700, #b8860b)' } }}
                    disabled={!state || state.status === 'complete'}
                    onClick={() => {
                      if (!state) return;
                      const winner = [...state.teams].sort((a, b) => b.score - a.score)[0];
                      if (winner) void endGame(winner.id);
                    }}
                  >
                    🏆 Finalize Game
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Show Screen Controls */}
          <Card variant="outlined">
            <CardContent>
              <Typography sx={sectionLabelSx}>Show Screen</Typography>
              <Stack direction="row" spacing={1} flexWrap="nowrap">
                {[
                  { label: '🎬 Show Intro', color: 'secondary' as const, onClick: () => { void showIntroOn(); } },
                  { label: '📋 Show Rules', color: 'warning' as const, onClick: () => { void showIntroOff(); void showRulesOn(); } },
                  { label: '🎲 Randomize', color: 'info' as const, onClick: () => { void showIntroOff(); void showRulesOff(); void randomAssignPlayers(); } },
                  { label: '🎯 First Pick', color: 'success' as const, onClick: () => { void showIntroOff(); void showRulesOff(); void randomFirstPick(); } },
                  { label: '📺 Game Board', color: 'inherit' as const, onClick: () => { void showBoard(); } },
                ].map(({ label, color, onClick }) => (
                  <Button key={label} variant="outlined" color={color} sx={{ ...bigBtnSx, flex: 1, minWidth: 0, fontSize: { xs: '0.7rem', md: '0.75rem' } }} onClick={onClick}>
                    {label}
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Divider />

          {/* Sudden Death: Award the Win */}
          {isSuddenDeath && (
            <Card sx={{ border: '2px solid', borderColor: 'error.main', bgcolor: 'rgba(200,30,30,0.06)' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Chip label="⚡" size="small" color="error" />
                  <Typography sx={{ ...sectionLabelSx, color: 'error.main' }} mb={0}>Sudden Death — Award the Win</Typography>
                </Stack>
                <Grid container spacing={1.5}>
                  {state?.teams.map((team) => (
                    <Grid item xs={6} key={team.id}>
                      <Button
                        fullWidth
                        color="error"
                        variant="contained"
                        sx={{ ...bigBtnSx, fontSize: { xs: '1.1rem', md: '1rem' } }}
                        onClick={() => void endGame(team.id)}
                      >
                        🏆 {team.name} Wins!
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Choose theme OR Song cards — hidden during sudden death */}
          {!isSuddenDeath && (
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="1" size="small" color={canPickQuestion || canPickSong ? 'primary' : 'default'} />
                <Typography sx={sectionLabelSx} mb={0}>
                  {hasQuestion ? `Theme: ${selectedQuestion?.category ?? '—'} — Choose song` : 'Choose theme'}
                </Typography>
                {!hasQuestion && chooserTeam && (
                  <Chip label={`${chooserTeam.name}'s pick`} size="small" color="warning" sx={{ ml: 'auto' }} />
                )}
                {hasQuestion && (
                  <Button size="small" variant="text" color="inherit" onClick={() => void resetRound()} sx={{ ml: 'auto', opacity: 0.6 }}>
                    ← Back to themes
                  </Button>
                )}
              </Stack>

              {allSongsDone && (
                <Button
                  fullWidth
                  variant="contained"
                  color="warning"
                  sx={{ ...bigBtnSx, mb: 1.5 }}
                  onClick={() => void resetRound()}
                >
                  ✓ Theme complete — Back to themes
                </Button>
              )}

              {!hasQuestion ? (
                <Stack direction="row" spacing={1} flexWrap="nowrap">
                  {currentRoundQuestions.map((question) => {
                    const isUsed = usedQuestionIds.includes(question.id);
                    return (
                      <Box key={question.id} sx={{ flex: 1, minWidth: 0 }}>
                        {isUsed ? (
                          <Box sx={{
                            height: bigBtnSx.minHeight,
                            border: '1px dashed',
                            borderColor: 'divider',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.3,
                          }}>
                            <Typography variant="caption">{question.category}</Typography>
                          </Box>
                        ) : (
                          <Button
                            fullWidth
                            variant="outlined"
                            sx={{ ...bigBtnSx, textAlign: 'center', justifyContent: 'center', fontSize: { xs: '0.7rem', md: '0.75rem' }, minWidth: 0 }}
                            disabled={!canPickQuestion}
                            onClick={() => void selectQuestion(question.id)}
                          >
                            {question.category || 'Category'}
                          </Button>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <Grid container spacing={1.5}>
                  {Array.from({ length: SONG_COUNT }, (_, i) => {
                    const isActive = activeSongIndex === i;
                    const isPast = activeSongIndex !== null && i < activeSongIndex;
                    const isResolved = isActive && answerResolved;
                    const songMeta = selectedQuestion?.songs?.[i];
                    return (
                      <Grid item xs={4} key={i}>
                        <Button
                          fullWidth
                          variant={isActive ? 'contained' : 'outlined'}
                          color={isActive && !isResolved ? 'primary' : 'inherit'}
                          sx={{ ...bigBtnSx, opacity: isPast || isResolved ? 0.45 : 1, flexDirection: 'column', alignItems: 'center', gap: 0.25 }}
                          disabled={!canPickSong || isPast || isResolved}
                          onClick={() => void selectSong(i)}
                        >
                          <span>{isResolved ? '✓ Song ' + (i + 1) : 'Song ' + (i + 1)}</span>
                          {isActive && songMeta?.title && (
                            <span style={{ fontSize: '0.78em', opacity: 0.85, fontWeight: 400 }}>
                              {songMeta.title}{songMeta.artist ? ` — ${songMeta.artist}` : ''}
                            </span>
                          )}
                        </Button>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </CardContent>
          </Card>
          )}

          {/* Step 2: Buzz winner */}
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="2" size="small" color={canBuzz ? 'secondary' : 'default'} />
                <Typography sx={sectionLabelSx} mb={0}>Pick buzz winner</Typography>
              </Stack>
              <Grid container spacing={1.5}>
                {state?.teams.map((team) => (
                  <Grid item xs={6} key={team.id}>
                    <Button
                      fullWidth
                      color="secondary"
                      variant="contained"
                      sx={{ ...bigBtnSx, fontSize: { xs: '1.1rem', md: '1rem' } }}
                      disabled={!canBuzz}
                      onClick={() => void setBuzzWinner(team.id)}
                    >
                      {team.name} buzzed
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Step 3: Judge answer */}
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="3" size="small" color={canJudgeAnswer ? 'success' : 'default'} />
                <Typography sx={sectionLabelSx} mb={0}>Judge answer</Typography>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="nowrap">
                <Button fullWidth color="success" variant="contained" sx={{ ...bigBtnSx, flex: 1, fontSize: { xs: '0.7rem', md: '0.75rem' } }} disabled={!canJudgeAnswer} onClick={() => void markCorrect()}>
                  ✓ Correct ({expectedPoints} pts)
                </Button>
                <Button fullWidth color="error" variant="contained" sx={{ ...bigBtnSx, flex: 1, fontSize: { xs: '0.7rem', md: '0.75rem' } }} disabled={!canJudgeAnswer} onClick={() => void markWrong()}>
                  ✗ Wrong
                </Button>
                <Button
                  fullWidth
                  color="info"
                  variant={canArtistBonus ? 'contained' : 'outlined'}
                  sx={{ ...bigBtnSx, flex: 1, fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                  disabled={!canArtistBonus}
                  onClick={() => void awardArtistBonus()}
                >
                  + Artist bonus (+{50 * multiplier} pts)
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Step 4: Steal */}
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="4" size="small" color={stealAvailable ? 'warning' : 'default'} />
                <Typography sx={sectionLabelSx} mb={0}>Resolve steal</Typography>
              </Stack>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Button fullWidth color="warning" variant="contained" sx={bigBtnSx} disabled={!stealAvailable} onClick={() => void markStealSuccess()}>
                    Steal success
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button fullWidth color="inherit" variant="outlined" sx={bigBtnSx} disabled={!stealAvailable} onClick={() => void markStealFail()}>
                    Steal fail
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

        </Stack>
      }
    />
  );
};

export default HostPage;
