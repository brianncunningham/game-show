import { Box, Button, Card, CardContent, Chip, Collapse, Divider, Grid, IconButton, MenuItem, Select, Stack, Typography } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useCallback, useEffect, useState } from 'react';
import { initiateSpotifyLogin, useSpotify } from '../features/spotify/useSpotify';
import { openWindow, armWindow, closeWindow, resetJudge } from '../features/buzzer/buzzerApi';
import { useBuzzerJudge } from '../features/buzzer/useBuzzerJudge';
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
  eliminateTeam,
  reinstateTeam,
  armSteal,
  setStealingTeam,
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
  setRevealState,
  listSaves,
  loadSave,
} from '../features/gameShow/api';
import type { GameSaveMeta } from '../features/gameShow/api';
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
  const [gameOpen, setGameOpen] = useState(false);
  const [spotifyTesting, setSpotifyTesting] = useState(false);
  const [spotifyPaused, setSpotifyPaused] = useState(false);
  const [saves, setSaves] = useState<GameSaveMeta[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showScreenOpen, setShowScreenOpen] = useState(false);
  const [eliminateConfirm, setEliminateConfirm] = useState<string | null>(null);
  const spotify = useSpotify();

  const buzzerMode = state?.buzzerMode ?? 'manual';
  const isJudgeMode = buzzerMode !== 'manual';

  /** Local tracking of the currently open steal window (not armed yet). */
  const [activeStealWindowId, setActiveStealWindowId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Buzzer judge integration (phone / hardware modes only)
  // ---------------------------------------------------------------------------

  /** Pause Spotify when the judge accepts a buzz. */
  const handleBuzzAccepted = useCallback((controllerId: string) => {
    console.log(`[Host] Judge accepted buzz from controller ${controllerId} — pausing Spotify`);
    if (spotify.isConnected) {
      void spotify.pause();
      setSpotifyPaused(true);
    }
  }, [spotify]);

  useBuzzerJudge({ buzzerMode, onBuzzAccepted: handleBuzzAccepted });

  /**
   * Build a stable windowId for the current song + steal round.
   * Format: song-{questionId}-{songIndex}-steal-{n}  (steal-0 = initial buzz)
   */
  const buildWindowId = useCallback((questionId: string, songIndex: number, stealN: number): string => {
    return `song-${questionId}-${songIndex}-steal-${stealN}`;
  }, []);

  /**
   * Get controller IDs eligible for the given set of teamIds.
   * Empty array means all controllers (used when no eligibility filter needed).
   */
  const eligibleControllerIds = useCallback((
    excludedTeamIds: string[],
    assignments: NonNullable<typeof state>['controllerAssignments'],
  ): string[] => {
    if (excludedTeamIds.length === 0) return [];
    return assignments
      .filter(a => !excludedTeamIds.includes(a.teamId))
      .map(a => a.controllerId);
  }, []);

  /** Open + immediately arm an initial buzz window for a song. Clears any steal window. */
  const openAndArmInitialWindow = useCallback((questionId: string, songIndex: number) => {
    if (!isJudgeMode) return;
    setActiveStealWindowId(null);
    const windowId = buildWindowId(questionId, songIndex, 0);
    void openWindow({ windowId, eligibleControllers: [], earlyBuzzPenalty: false })
      .then(() => armWindow(windowId));
  }, [isJudgeMode, buildWindowId]);

  /**
   * Open a steal window (WAITING, not yet armed) for the given attempted teams.
   * The host will arm it by pressing Resume on the Spotify pause button.
   */
  const openStealWindow = useCallback((
    questionId: string,
    songIndex: number,
    attemptedTeamIds: string[],
    assignments: NonNullable<typeof state>['controllerAssignments'],
  ) => {
    if (!isJudgeMode) return;
    const windowId = buildWindowId(questionId, songIndex, attemptedTeamIds.length);
    const eligible = eligibleControllerIds(attemptedTeamIds, assignments);
    void closeWindow(buildWindowId(questionId, songIndex, attemptedTeamIds.length - 1))
      .catch(() => {})
      .then(() => openWindow({ windowId, eligibleControllers: eligible, earlyBuzzPenalty: true, isSteal: true }));
    setActiveStealWindowId(windowId);
  }, [isJudgeMode, buildWindowId, eligibleControllerIds]);

  // Arm the current steal window when the host resumes the song.
  const armActiveStealWindow = useCallback(() => {
    if (!isJudgeMode) return;
    if (activeStealWindowId) void armWindow(activeStealWindowId);
    void armSteal();
  }, [isJudgeMode, activeStealWindowId]);

  const refreshSaves = useCallback(async () => {
    const list = await listSaves();
    setSaves(list.sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
  }, []);

  useEffect(() => { void refreshSaves(); }, [refreshSaves]);

  const handleLoadSave = async (id: string) => {
    setLoadingId(id);
    try { await loadSave(id); } finally { setLoadingId(null); }
  };

  const hasQuestion = Boolean(state?.roundState.selectedQuestionId);
  const hasBuzzWinner = Boolean(state?.roundState.buzzWinnerTeamId);
  const stealAvailable = state?.roundState.stealState === 'available';
  const answerResolved = state?.roundState.answerState === 'correct' || state?.roundState.stealState === 'resolved';
  const canPickQuestion = (state?.status === 'live' || state?.status === 'sudden_death') && !hasQuestion;
  const canBuzz = state?.roundState.clipState === 'active' && !hasBuzzWinner;
  const canJudgeAnswer = hasQuestion && hasBuzzWinner && !answerResolved && !stealAvailable;
  const canArtistBonus = state?.roundState.answerState === 'correct' && Boolean(state?.roundState.buzzWinnerTeamId) && !state?.roundState.artistBonusUsed;
  const canRevealBoth = Boolean(state?.roundState.selectedQuestionId) && state?.roundState.activeSongIndex != null;
  const isSuddenDeath = state?.status === 'sudden_death';

  const selectedQuestion = state?.questions.find(q => q.id === state.roundState.selectedQuestionId);
  const usedQuestionIds = state?.roundState.usedQuestionIds ?? [];
  const activeSongIndex = state?.roundState.activeSongIndex ?? null;
  const currentRoundQuestions = state?.questions.filter(q => q.round === state.currentRound) ?? [];
  const activeTeams = state?.teams.filter(t => !t.eliminated) ?? [];
  const attemptedTeamIds = state?.roundState.attemptedTeamIds ?? [];
  const eligibleStealers = activeTeams.filter(t => !attemptedTeamIds.includes(t.id));
  const stealingTeamId = state?.roundState.stealingTeamId ?? null;
  const stealingTeam = stealingTeamId ? state?.teams.find(t => t.id === stealingTeamId) : null;

  const allSongsDone = activeSongIndex === SONG_COUNT - 1;
  const stealInProgress = stealAvailable && Boolean(stealingTeamId);
  const canPickSong = hasQuestion && !stealInProgress && !allSongsDone;
  const canAdvance = !hasQuestion || answerResolved || (stealAvailable && !stealInProgress);

  const multiplier = state?.multiplier ?? 1;
  const basePoints = 100;
  const expectedPoints = basePoints * multiplier;
  const chooserTeam = state?.teams.find(t => t.id === state.chooserTeamId) ?? null;
  const eliminationEnabled = state?.eliminationEnabled ?? false;

  return (
    <GameShowSharedView
      title="Host Control"
      subtitle=""
      spotifyStatus={
        <Stack direction="row" spacing={1} alignItems="center">
          {spotify.isConnected ? (
            <>
              <Chip label="Spotify ●" color="success" size="small" />
              <Select
                size="small"
                value={spotify.activeDeviceId ?? ''}
                onChange={(e) => spotify.setActiveDeviceId(e.target.value || null)}
                sx={{ fontSize: '0.8rem', minWidth: 140 }}
                displayEmpty
              >
                <MenuItem value=""><em>Active device (auto)</em></MenuItem>
                {spotify.devices.map(d => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}{d.is_active ? ' ●' : ''}
                  </MenuItem>
                ))}
              </Select>
              <IconButton size="small" onClick={() => void spotify.fetchDevices()} title="Refresh devices">
                <RefreshIcon fontSize="small" />
              </IconButton>
              <Button
                size="small"
                variant="text"
                color={spotifyTesting ? 'warning' : 'inherit'}
                sx={{ opacity: 0.8, minWidth: 0 }}
                onClick={() => {
                  if (spotifyTesting) {
                    void spotify.pause();
                    setSpotifyTesting(false);
                  } else {
                    void spotify.play('3BQHpFgAp4l80e1XslIjNI', 0);
                    setSpotifyTesting(true);
                    setSpotifyPaused(false);
                  }
                }}
              >
                {spotifyTesting ? 'End Test' : 'Test'}
              </Button>
              <Button size="small" variant="text" color="inherit" sx={{ opacity: 0.6, minWidth: 0 }} onClick={() => spotify.disconnect()}>Disconnect</Button>
            </>
          ) : (
            <Button size="small" variant="outlined" color="success" onClick={() => void initiateSpotifyLogin()}>Connect Spotify</Button>
          )}
        </Stack>
      }
      state={state}
      isLoading={isLoading}
      error={error}
      controls={
        <Stack spacing={2}>

          {/* Load game */}
          {saves.length > 0 && (
            <Card>
              <CardContent sx={{ py: '10px !important' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ ...sectionLabelSx, mb: 0, flexShrink: 0 }}>Load game</Typography>
                  <Select
                    size="small"
                    displayEmpty
                    value=""
                    onChange={(e) => { if (e.target.value) void handleLoadSave(e.target.value as string); }}
                    disabled={loadingId !== null}
                    sx={{ flex: 1, fontSize: '0.85rem' }}
                  >
                    <MenuItem value="" disabled><em>Select a save…</em></MenuItem>
                    {saves.map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                    ))}
                  </Select>
                  <IconButton size="small" onClick={() => void refreshSaves()} title="Refresh saves">
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Game controls */}
          <Card>
            <CardContent sx={{ pb: gameOpen ? undefined : '12px !important' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" onClick={() => setGameOpen(o => !o)} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                <Typography sx={sectionLabelSx}>Game</Typography>
                <IconButton size="small">{gameOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
              </Stack>
              <Collapse in={gameOpen}>
              <Box sx={{ mt: 1 }}>
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
              </Box>
              </Collapse>
            </CardContent>
          </Card>

          {/* Show Screen Controls */}
          <Card variant="outlined">
            <CardContent sx={{ pb: showScreenOpen ? undefined : '12px !important' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" onClick={() => setShowScreenOpen(o => !o)} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                <Typography sx={sectionLabelSx}>Show Screen</Typography>
                <IconButton size="small">{showScreenOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
              </Stack>
              <Collapse in={showScreenOpen}>
              <Box sx={{ mt: 1 }}>
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
              </Box>
              </Collapse>
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
                  {activeTeams.map((team) => (
                    <Grid item xs={activeTeams.length <= 2 ? 6 : activeTeams.length === 3 ? 4 : 3} key={team.id}>
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
                        <Stack spacing={0.5}>
                          <Button
                            fullWidth
                            variant={isActive ? 'contained' : 'outlined'}
                            color={isActive && !isResolved ? 'primary' : 'inherit'}
                            sx={{ ...bigBtnSx, opacity: isPast || isResolved ? 0.45 : 1, flexDirection: 'column', alignItems: 'center', gap: 0.25 }}
                            disabled={(!canPickSong && !isActive) || isPast || isResolved}
                            onClick={() => {
                              void selectSong(i);
                              if (isJudgeMode && state?.roundState.selectedQuestionId) {
                                openAndArmInitialWindow(state.roundState.selectedQuestionId, i);
                              }
                              const trackId = songMeta?.spotifyTrackId;
                              const startMs = songMeta?.clipStartMs ?? 0;
                              if (trackId && spotify.isConnected) {
                                void spotify.play(trackId, startMs);
                                setSpotifyPaused(false);
                              }
                            }}
                          >
                            <span>{isResolved ? '✓ Song ' + (i + 1) : 'Song ' + (i + 1)}</span>
                            {isActive && songMeta?.title && (
                              <span style={{ fontSize: '0.78em', opacity: 0.85, fontWeight: 400 }}>
                                {songMeta.title}{songMeta.artist ? ` — ${songMeta.artist}` : ''}
                              </span>
                            )}
                          </Button>
                          {isActive && spotify.isConnected && (
                            <Button
                              fullWidth
                              variant="outlined"
                              color="warning"
                              size="small"
                              onClick={() => {
                                if (spotifyPaused) {
                                  void spotify.resume();
                                  setSpotifyPaused(false);
                                  armActiveStealWindow();
                                } else {
                                  void spotify.pause();
                                  setSpotifyPaused(true);
                                }
                              }}
                            >
                              {spotifyPaused ? '▶ Resume' : '⏸ Pause'}
                            </Button>
                          )}
                        </Stack>
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
                <Chip label="2" size="small" color={canBuzz ? 'secondary' : hasBuzzWinner ? 'success' : 'default'} />
                <Typography sx={sectionLabelSx} mb={0}>Pick buzz winner</Typography>
                {(hasBuzzWinner || stealingTeamId) && (() => {
                  const controllerId = stealingTeamId
                    ? state?.roundState.stealWinnerControllerId
                    : state?.roundState.buzzWinnerControllerId;
                  const winnerAssignment = state?.controllerAssignments.find(a => a.controllerId === controllerId);
                  return winnerAssignment ? (
                    <Chip label={`⚡ ${winnerAssignment.playerName}`} size="small" color={stealingTeamId ? 'warning' : 'secondary'} sx={{ ml: 'auto', fontWeight: 900 }} />
                  ) : null;
                })()}
              </Stack>
              <Grid container spacing={1.5}>
                {activeTeams.map((team) => {
                  const isStealWinnerTeam = stealingTeamId === team.id;
                  const isBuzzWinnerTeam = !stealingTeamId && state?.roundState.buzzWinnerTeamId === team.id;
                  const isHighlighted = isStealWinnerTeam || isBuzzWinnerTeam;
                  const buzzerAssignment = isStealWinnerTeam
                    ? state?.controllerAssignments.find(a => a.controllerId === state.roundState.stealWinnerControllerId)
                    : isBuzzWinnerTeam
                      ? state?.controllerAssignments.find(a => a.controllerId === state.roundState.buzzWinnerControllerId)
                      : null;
                  const penalizedPlayers = team.players.filter(playerName => {
                    const a = state?.controllerAssignments.find(ca => ca.teamId === team.id && ca.playerName === playerName);
                    return a ? (state?.roundState.penalizedControllerIds ?? []).includes(a.controllerId) : false;
                  });
                  return (
                    <Grid item xs={activeTeams.length <= 2 ? 6 : activeTeams.length === 3 ? 4 : 3} key={team.id}>
                      <Button
                        fullWidth
                        color={isStealWinnerTeam ? 'warning' : isBuzzWinnerTeam ? 'success' : 'secondary'}
                        variant="contained"
                        sx={{ ...bigBtnSx, fontSize: { xs: '1.1rem', md: '1rem' }, flexDirection: 'column', gap: 0.25 }}
                        disabled={!canBuzz}
                        onClick={() => void setBuzzWinner(team.id)}
                      >
                        <span>{isHighlighted ? `⚡ ${team.name}` : `${team.name} buzzed`}</span>
                        {buzzerAssignment && (
                          <span style={{ fontSize: '0.8em', fontWeight: 700, opacity: 0.9 }}>{buzzerAssignment.playerName}</span>
                        )}
                        {penalizedPlayers.length > 0 && (
                          <span style={{ fontSize: '0.72em', color: '#ff8888', fontWeight: 700 }}>🚫 {penalizedPlayers.join(', ')}</span>
                        )}
                      </Button>
                    </Grid>
                  );
                })}
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
                <Button fullWidth color="success" variant="contained" sx={{ ...bigBtnSx, flex: 1, fontSize: { xs: '0.7rem', md: '0.75rem' } }} disabled={!canJudgeAnswer} onClick={() => {
                  void markCorrect();
                  if (isJudgeMode) void resetJudge();
                }}>
                  ✓ Correct ({expectedPoints} pts)
                </Button>
                <Button fullWidth color="error" variant="contained" sx={{ ...bigBtnSx, flex: 1, fontSize: { xs: '0.7rem', md: '0.75rem' } }} disabled={!canJudgeAnswer} onClick={() => {
                  void markWrong();
                  if (isJudgeMode && state?.roundState.selectedQuestionId && state.roundState.activeSongIndex != null) {
                    const nextAttempted = [...(state.roundState.attemptedTeamIds), state.roundState.buzzWinnerTeamId!].filter(Boolean) as string[];
                    openStealWindow(
                      state.roundState.selectedQuestionId,
                      state.roundState.activeSongIndex,
                      nextAttempted,
                      state.controllerAssignments,
                    );
                  }
                }}>
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
                <Button
                  fullWidth
                  color="warning"
                  variant="outlined"
                  sx={{ ...bigBtnSx, flex: 1, fontSize: { xs: '0.7rem', md: '0.75rem' } }}
                  disabled={!canRevealBoth}
                  onClick={() => void setRevealState('both')}
                >
                  ♪★ Reveal Both
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Step 4: Steal */}
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="4" size="small" color={stealAvailable ? 'warning' : 'default'} />
                <Typography sx={sectionLabelSx} mb={0}>
                  {stealingTeam ? `Steal: ${stealingTeam.name}` : 'Steal — pick team'}
                </Typography>
              </Stack>
              {stealAvailable && !stealingTeam && (
                <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                  {eligibleStealers.map((team) => (
                    <Grid item xs={eligibleStealers.length <= 2 ? 6 : eligibleStealers.length === 3 ? 4 : 3} key={team.id}>
                      <Button
                        fullWidth
                        color="warning"
                        variant="outlined"
                        sx={bigBtnSx}
                        onClick={() => void setStealingTeam(team.id)}
                      >
                        {team.name} steals
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              )}
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Button fullWidth color="warning" variant="contained" sx={bigBtnSx} disabled={!stealAvailable || !stealingTeam} onClick={() => {
                    void markStealSuccess();
                    if (isJudgeMode) void resetJudge();
                  }}>
                    Steal success
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button fullWidth color="inherit" variant="outlined" sx={bigBtnSx} disabled={!stealAvailable || !stealingTeam} onClick={() => {
                    void markStealFail();
                    if (isJudgeMode && state?.roundState.selectedQuestionId && state.roundState.activeSongIndex != null && stealingTeamId) {
                      const nextAttempted = [...(state.roundState.attemptedTeamIds), stealingTeamId].filter(Boolean) as string[];
                      const remaining = activeTeams.filter(t => !nextAttempted.includes(t.id));
                      if (remaining.length > 0) {
                        openStealWindow(
                          state.roundState.selectedQuestionId,
                          state.roundState.activeSongIndex,
                          nextAttempted,
                          state.controllerAssignments,
                        );
                      } else {
                        void resetJudge();
                      }
                    }
                  }}>
                    Steal fail
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Eliminate team */}
          {eliminationEnabled && (
            <Card sx={{ border: '1px solid', borderColor: 'error.dark' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Typography sx={{ ...sectionLabelSx, color: 'error.main' }} mb={0}>Eliminate team</Typography>
                </Stack>
                <Grid container spacing={1.5}>
                  {state?.teams.map((team) => {
                    const isEliminated = team.eliminated;
                    const isArmed = eliminateConfirm === team.id;
                    return (
                      <Grid item xs={state.teams.length <= 2 ? 6 : state.teams.length === 3 ? 4 : 3} key={team.id}>
                        {isEliminated ? (
                          <Button
                            fullWidth
                            color="inherit"
                            variant="outlined"
                            sx={{ ...bigBtnSx, opacity: 0.5 }}
                            onClick={() => void reinstateTeam(team.id)}
                          >
                            ↩ Reinstate {team.name}
                          </Button>
                        ) : (
                          <Button
                            fullWidth
                            color={isArmed ? 'error' : 'inherit'}
                            variant={isArmed ? 'contained' : 'outlined'}
                            sx={bigBtnSx}
                            onClick={() => {
                              if (isArmed) {
                                void eliminateTeam(team.id);
                                setEliminateConfirm(null);
                              } else {
                                setEliminateConfirm(team.id);
                              }
                            }}
                            onBlur={() => setEliminateConfirm(null)}
                          >
                            {isArmed ? `Confirm: Eliminate ${team.name}` : `Eliminate ${team.name}`}
                          </Button>
                        )}
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          )}

        </Stack>
      }
    />
  );
};

export default HostPage;
