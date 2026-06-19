import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, Collapse,
  Divider, Grid, IconButton, MenuItem, Select,
  Stack, Typography,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import UndoIcon from '@mui/icons-material/Undo';
import type { SurveySaysState, SurveyAnswer } from './types';
import {
  getState,
  revealQuestion, recordBuzz, faceOffAnswer, faceOffStrike,
  showBoard,
  setPlayOrPass,
  revealAnswer, revealAnswerPostRound, addStrike,
  stealSuccess, stealFail,
  nextRound, newGame, endGame, undo,
  loadBoard, randomAssignPlayers,
  hideIntro, showIntro,
  listSaves, loadSave,
} from './api';
import type { SSSaveMeta } from './api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAM_COLORS = ['#00e5ff', '#ff6a00'] as const;

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

// ─── Main component ───────────────────────────────────────────────────────────

export const SSHostComponent = () => {
  const [state, setState] = useState<SurveySaysState | null>(null);
  const [saves, setSaves] = useState<SSSaveMeta[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [gameOpen, setGameOpen] = useState(false);
  const [showScreenOpen, setShowScreenOpen] = useState(true);

  const refresh = useCallback(async () => {
    try { setState(await getState()); } catch { /* ignore */ }
  }, []);

  const refreshSaves = useCallback(async () => {
    try { setSaves(await listSaves()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void refresh();
    void refreshSaves();
    const id = setInterval(() => { void refresh(); }, 800);
    return () => clearInterval(id);
  }, [refresh, refreshSaves]);

  const act = useCallback((fn: () => Promise<SurveySaysState>) => async () => {
    try { setState(await fn()); } catch (e) { console.error(e); }
  }, []);

  const handleLoadSave = async (id: string) => {
    setLoadingId(id);
    try { setState(await loadSave(id)); } finally { setLoadingId(null); }
  };

  if (!state) {
    return (
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Typography color="text.secondary">Connecting…</Typography>
      </Box>
    );
  }

  const { roundState, teams, boards, config } = state;
  const { phase, currentRound, currentBoardId, faceOffState, strikeCount,
          roundBank, revealedAnswers, controllingTeamId, stealingTeamId,
          faceOffWinnerTeamId, faceOffTurnTeamId } = roundState;

  const currentBoard = boards.find(b => b.id === currentBoardId);
  const mult = config.multiplierSchedule[currentRound - 1]
    ?? config.multiplierSchedule[config.multiplierSchedule.length - 1]
    ?? 1;

  const unrevealedAnswers: SurveyAnswer[] = currentBoard
    ? currentBoard.answers.filter(a => !revealedAnswers.some(r => r.rank === a.rank))
    : [];

  // The team currently answering during face-off (turn alternates automatically).
  const faceOffAnsweringTeam = teams.find(t => t.id === faceOffTurnTeamId);
  const faceOffAnsweringColor = faceOffAnsweringTeam
    ? (faceOffAnsweringTeam.id === teams[0].id ? TEAM_COLORS[0] : TEAM_COLORS[1])
    : undefined;

  // Current player up (rotation wraps by each family's own size).
  const playerAt = (t: typeof teams[number] | undefined, idx: number): string | null =>
    t && t.players.length ? t.players[((idx % t.players.length) + t.players.length) % t.players.length] : null;
  const faceOffPlayer = playerAt(faceOffAnsweringTeam, roundState.faceOffPlayerIndex);

  // The non-controlling team gets the steal
  const stealEligibleTeam = teams.find(t => t.id !== controllingTeamId);
  const stealTeamColor = stealEligibleTeam
    ? (stealEligibleTeam.id === teams[0].id ? TEAM_COLORS[0] : TEAM_COLORS[1])
    : undefined;

  const isPostRound = phase === 'post_round';
  const isSteal = phase === 'steal';
  const isMainPlay = phase === 'main_play';
  const isFaceOff = phase === 'face_off';
  const isPlayOrPass = phase === 'play_or_pass';
  const isGameOver = phase === 'game_over';
  const isIdle = phase === 'idle';

  const boardsForRound = boards.filter(b => b.round === currentRound);
  const controllingTeam = teams.find(t => t.id === controllingTeamId);
  const controllingColor = controllingTeam
    ? (controllingTeam.id === teams[0].id ? TEAM_COLORS[0] : TEAM_COLORS[1])
    : undefined;
  const mainPlayPlayer = playerAt(controllingTeam, roundState.mainPlayPlayerIndex);

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, maxWidth: 860, mx: 'auto' }}>

      {/* ── Status bar ── */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label={`Round ${currentRound}`} color="primary" size="small" />
        <Chip label={phase.replace(/_/g, ' ').toUpperCase()} size="small"
          color={isMainPlay ? 'warning' : isSteal ? 'error' : isFaceOff ? 'info' : isPostRound ? 'default' : 'default'} />
        {mult > 1 && <Chip label={`×${mult}`} size="small" sx={{ background: '#f5c51822', color: '#f5c518', border: '1px solid #f5c51844' }} />}
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="outlined" color="inherit" startIcon={<UndoIcon fontSize="small" />}
          onClick={act(() => undo())} sx={{ minWidth: 0 }}>
          Undo
        </Button>
        {teams.map((t, i) => (
          <Typography key={t.id} sx={{ fontWeight: 700, fontSize: '0.9rem', color: TEAM_COLORS[i] }}>
            {t.name}: {t.score}
          </Typography>
        ))}
      </Stack>

      <Stack spacing={2}>

        {/* ── Load Game ── */}
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

        {/* ── Game controls (collapsible) ── */}
        <Card>
          <CardContent sx={{ pb: gameOpen ? undefined : '12px !important' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between"
              onClick={() => setGameOpen(o => !o)} sx={{ cursor: 'pointer', userSelect: 'none' }}>
              <Typography sx={sectionLabelSx}>Game</Typography>
              <IconButton size="small">{gameOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
            </Stack>
            <Collapse in={gameOpen}>
              <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                <Grid item xs={6} sm={4}>
                  <Button fullWidth variant="contained" sx={bigBtnSx}
                    onClick={act(() => newGame())}>
                    New Game
                  </Button>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Button fullWidth variant="contained" color="info" sx={bigBtnSx}
                    disabled={!isPostRound}
                    onClick={act(() => nextRound())}>
                    Next Round
                  </Button>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Button fullWidth color="error" variant="outlined" sx={bigBtnSx}
                    onClick={act(() => endGame())}>
                    End Game
                  </Button>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Button fullWidth variant="contained" color="secondary" sx={bigBtnSx}
                    disabled={state.playerPool.length === 0}
                    onClick={act(() => randomAssignPlayers())}>
                    🎲 Randomize Families {state.playerPool.length === 0 ? '(add players in /gameadmin)' : ''}
                  </Button>
                </Grid>
              </Grid>
            </Collapse>
          </CardContent>
        </Card>

        {/* ── Show Screen (collapsible) ── */}
        <Card variant="outlined">
          <CardContent sx={{ pb: showScreenOpen ? undefined : '12px !important' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between"
              onClick={() => setShowScreenOpen(o => !o)} sx={{ cursor: 'pointer', userSelect: 'none' }}>
              <Typography sx={sectionLabelSx}>Show Screen</Typography>
              <IconButton size="small">{showScreenOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
            </Stack>
            <Collapse in={showScreenOpen}>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="nowrap">
                <Button fullWidth variant={state.showIntro ? 'contained' : 'outlined'} color="secondary"
                  sx={{ ...bigBtnSx, flex: 1, fontSize: { xs: '0.7rem', md: '0.8rem' } }}
                  onClick={act(() => showIntro())}>
                  🎬 Intro Screen
                </Button>
                <Button fullWidth variant={!state.showIntro ? 'contained' : 'outlined'} color="primary"
                  sx={{ ...bigBtnSx, flex: 1, fontSize: { xs: '0.7rem', md: '0.8rem' } }}
                  onClick={act(() => hideIntro())}>
                  📺 Game Board
                </Button>
              </Stack>
            </Collapse>
          </CardContent>
        </Card>

        <Divider />

        {/* ── Step 1: Load Board ── */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <Chip label="1" size="small" color={isIdle ? 'primary' : 'default'} />
              <Typography sx={{ ...sectionLabelSx, mb: 0 }}>Load Board — Round {currentRound}</Typography>
            </Stack>
            {boardsForRound.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No boards for round {currentRound}. Load a game above or add content in /gameadmin.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {boardsForRound.map(b => (
                  <Button key={b.id} fullWidth
                    variant={b.id === currentBoardId ? 'contained' : 'outlined'}
                    color="primary"
                    sx={{ ...bigBtnSx, justifyContent: 'flex-start', textTransform: 'none' }}
                    onClick={act(() => loadBoard(b.id))}>
                    {b.question}
                  </Button>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* ── Step 2: Face-Off ── */}
        {isFaceOff && (
          <Card sx={{ border: '2px solid', borderColor: 'info.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="2" size="small" color="info" />
                <Typography sx={{ ...sectionLabelSx, mb: 0 }}>
                  Face-Off —&nbsp;
                  {faceOffState === 'announcing' && 'Announcing face-off players'}
                  {faceOffState === 'showing_board' && 'Board showing — reveal question when ready'}
                  {faceOffState === 'waiting_buzz' && '🔵 Buzzers armed — waiting for buzz'}
                  {faceOffState === 'answering' && `${faceOffAnsweringTeam?.name ?? ''} answering`}
                  {faceOffState === 'resolved' && 'Resolved'}
                </Typography>
                {faceOffState === 'answering' && faceOffAnsweringColor && (
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: faceOffAnsweringColor, flexShrink: 0 }} />
                )}
              </Stack>

              {/* ── Sub-step A: announcing face-off ── */}
              {faceOffState === 'announcing' && (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Show screen is displaying the face-off matchup. When ready, show the board.
                  </Typography>
                  <Button fullWidth variant="contained" color="info" sx={bigBtnSx}
                    onClick={act(() => showBoard())}>
                    Show Board →
                  </Button>
                </>
              )}

              {/* ── Sub-step B: board showing — reveal question (auto-arms buzzers) ── */}
              {faceOffState === 'showing_board' && (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    There {currentBoard ? (currentBoard.answers.length === 1 ? 'is 1 answer' : `are ${currentBoard.answers.length} answers`) : 'are answers'} on the board.
                  </Typography>
                  <Button fullWidth variant="contained" color="info" sx={bigBtnSx}
                    onClick={act(() => revealQuestion())}>
                    Reveal Question →
                  </Button>
                </>
              )}

              {/* ── Sub-step B: armed, waiting for buzz (hardware or manual fallback) ── */}
              {faceOffState === 'waiting_buzz' && (
                <>
                  {currentBoard && (
                    <Typography variant="body2" sx={{ mb: 1, p: 1, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)', fontStyle: 'italic', color: 'text.primary' }}>
                      "{currentBoard.question}"
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Buzzers armed — waiting for buzz.
                  </Typography>
                  <Grid container spacing={1.5}>
                    {teams.map((t, i) => (
                      <Grid item xs={6} key={t.id}>
                        <Button fullWidth variant="outlined"
                          sx={{ ...bigBtnSx, borderColor: TEAM_COLORS[i], color: TEAM_COLORS[i] }}
                          onClick={act(() => recordBuzz(t.id))}>
                          {t.name} Buzzed
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {/* ── Sub-step C: a team is answering — only answer-or-strike, gameplay decides winner ── */}
              {faceOffState === 'answering' && currentBoard && (
                <>
                  <Box sx={{ mb: 1.5, p: 1.25, borderRadius: 1.5,
                    border: `2px solid ${faceOffAnsweringColor}`,
                    background: `${faceOffAnsweringColor}1a` }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: faceOffAnsweringColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🔔 {faceOffPlayer ? `${faceOffPlayer} — ` : ''}{faceOffAnsweringTeam?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {faceOffPlayer ? `${faceOffPlayer} is up. ` : ''}Tap the answer they gave, or strike if wrong. The winner is decided automatically.
                    </Typography>
                  </Box>

                  <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                    {currentBoard.answers.map(a => {
                      const isRevealed = revealedAnswers.some(r => r.rank === a.rank);
                      return (
                        <Button key={a.rank} fullWidth variant="outlined" size="small"
                          disabled={isRevealed}
                          sx={{ justifyContent: 'space-between', textTransform: 'none', opacity: isRevealed ? 0.4 : 1 }}
                          onClick={act(() => faceOffAnswer(a.rank))}>
                          <span>{a.rank}. {a.text}</span>
                          <Typography component="span" sx={{ color: '#f5c518', fontWeight: 700 }}>{a.points}</Typography>
                        </Button>
                      );
                    })}
                  </Stack>

                  <Button fullWidth color="error" variant="contained" sx={bigBtnSx}
                    onClick={act(() => faceOffStrike())}>
                    ✕ Strike — {faceOffAnsweringTeam?.name} (wrong)
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Play or Pass ── */}
        {isPlayOrPass && (
          <Card sx={{ border: '2px solid', borderColor: 'warning.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="3" size="small" color="warning" />
                <Typography sx={{ ...sectionLabelSx, mb: 0 }}>Play or Pass</Typography>
                {faceOffWinnerTeamId && (() => {
                  const w = teams.find(t => t.id === faceOffWinnerTeamId);
                  const wIdx = teams.findIndex(t => t.id === faceOffWinnerTeamId);
                  return w ? <Chip label={`${w.name} won face-off`} size="small" sx={{ ml: 'auto', color: TEAM_COLORS[wIdx], border: `1px solid ${TEAM_COLORS[wIdx]}` }} variant="outlined" /> : null;
                })()}
              </Stack>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Button fullWidth variant="contained" color="success" sx={bigBtnSx}
                    onClick={act(() => setPlayOrPass('play'))}>
                    Play
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button fullWidth variant="outlined" color="warning" sx={bigBtnSx}
                    onClick={act(() => setPlayOrPass('pass'))}>
                    Pass
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* ── Step 4: Main Play ── */}
        {isMainPlay && currentBoard && (
          <Card sx={{ border: '2px solid', borderColor: 'warning.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="4" size="small" color="warning" />
                <Typography sx={{ ...sectionLabelSx, mb: 0 }}>Main Play</Typography>
                {controllingTeam && (
                  <Chip label={mainPlayPlayer ? `${mainPlayPlayer} — ${controllingTeam.name}` : `${controllingTeam.name} playing`} size="small"
                    sx={{ ml: 'auto', color: controllingColor, border: `1px solid ${controllingColor}` }} variant="outlined" />
                )}
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  Bank: <strong style={{ color: '#f5c518' }}>{roundBank}</strong>
                  {mult > 1 && ` ×${mult}`}
                </Typography>
              </Stack>

              {/* Strike indicator */}
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Strikes:</Typography>
                {[0, 1, 2].map(i => (
                  <Box key={i} sx={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: `1.5px solid ${i < strikeCount ? '#ff2020' : '#ffffff33'}`,
                    background: i < strikeCount ? '#ff202033' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {i < strikeCount && <Typography sx={{ fontSize: '0.65rem', color: '#ff2020', fontWeight: 900 }}>✕</Typography>}
                  </Box>
                ))}
              </Stack>

              {/* Answer reveal — only controlling team guesses */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                Correct answer ({controllingTeam?.name}):
              </Typography>
              <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                {currentBoard.answers.map(a => {
                  const isRevealed = revealedAnswers.some(r => r.rank === a.rank);
                  return (
                    <Button key={a.rank} fullWidth
                      variant={isRevealed ? 'text' : 'outlined'}
                      color={isRevealed ? 'success' : 'primary'} size="small"
                      disabled={isRevealed}
                      sx={{ justifyContent: 'space-between', textTransform: 'none', opacity: isRevealed ? 0.45 : 1 }}
                      onClick={act(() => revealAnswer(a.rank))}>
                      <span>{a.rank}. {a.text}</span>
                      <Typography component="span" sx={{ color: isRevealed ? 'success.main' : '#f5c518', fontWeight: 700 }}>{a.points}</Typography>
                    </Button>
                  );
                })}
              </Stack>

              <Button fullWidth color="error" variant="outlined" sx={bigBtnSx}
                onClick={act(() => addStrike())}>
                ✕ Wrong Answer — Strike ({strikeCount}/3)
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 5: Steal ── */}
        {isSteal && currentBoard && (
          <Card sx={{ border: '2px solid', borderColor: 'error.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="5" size="small" color="error" />
                <Typography sx={{ ...sectionLabelSx, mb: 0 }}>Steal Opportunity</Typography>
                {stealEligibleTeam && (
                  <Chip label={stealEligibleTeam.name} size="small"
                    sx={{ ml: 'auto', color: stealTeamColor, border: `1px solid ${stealTeamColor}` }} variant="outlined" />
                )}
              </Stack>

              <Box sx={{ mb: 1.5, p: 1.25, borderRadius: 1.5,
                border: `2px solid ${stealTeamColor}`, background: `${stealTeamColor}1a` }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: stealTeamColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🗡️ {stealEligibleTeam?.name} steals for {roundBank}{mult > 1 ? ` ×${mult}` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  One guess. Tap their answer to win the bank, or strike to give it back.
                </Typography>
              </Box>

              {unrevealedAnswers.length > 0 && (
                <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                  {unrevealedAnswers.map(a => (
                    <Button key={a.rank} fullWidth variant="outlined" size="small" color="warning"
                      sx={{ justifyContent: 'space-between', textTransform: 'none' }}
                      onClick={act(() => stealSuccess(a.rank))}>
                      <span>{a.rank}. {a.text}</span>
                      <Typography component="span" sx={{ color: '#f5c518', fontWeight: 700 }}>{a.points}</Typography>
                    </Button>
                  ))}
                </Stack>
              )}

              <Button fullWidth color="error" variant="contained" sx={bigBtnSx}
                onClick={act(() => stealFail())}>
                ✕ Strike — Steal Failed
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Post-Round: reveal remaining ── */}
        {isPostRound && currentBoard && (
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="6" size="small" />
                <Typography sx={{ ...sectionLabelSx, mb: 0 }}>Post-Round — Reveal Remaining</Typography>
              </Stack>
              <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                {currentBoard.answers.map(a => {
                  const isRevealed = revealedAnswers.some(r => r.rank === a.rank);
                  return (
                    <Button key={a.rank} fullWidth
                      variant={isRevealed ? 'text' : 'outlined'}
                      color={isRevealed ? 'success' : 'inherit'} size="small"
                      disabled={isRevealed}
                      sx={{ justifyContent: 'space-between', textTransform: 'none', opacity: isRevealed ? 0.45 : 1 }}
                      onClick={act(() => revealAnswerPostRound(a.rank))}>
                      <span>{a.rank}. {a.text}</span>
                      <Typography component="span" sx={{ color: isRevealed ? 'success.main' : '#f5c518', fontWeight: 700 }}>{a.points}</Typography>
                    </Button>
                  );
                })}
              </Stack>
              <Divider sx={{ my: 1 }} />
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Button fullWidth variant="contained" color="primary" sx={bigBtnSx}
                    onClick={act(() => nextRound())}>
                    Next Round →
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button fullWidth variant="outlined" color="warning" sx={bigBtnSx}
                    onClick={act(() => endGame())}>
                    🏆 End Game
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* ── Game Over ── */}
        {isGameOver && (
          <Card sx={{ border: '2px solid', borderColor: 'warning.main', bgcolor: 'rgba(245,197,24,0.06)' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="🏆" size="small" color="warning" />
                <Typography sx={{ ...sectionLabelSx, color: 'warning.main', mb: 0 }}>Game Over</Typography>
              </Stack>
              <Grid container spacing={1.5}>
                {[...teams].sort((a, b) => b.score - a.score).map((t, i) => (
                  <Grid item xs={6} key={t.id}>
                    <Card variant="outlined" sx={{ textAlign: 'center', p: 1.5, borderColor: i === 0 ? 'warning.main' : 'divider' }}>
                      <Typography variant="caption" sx={{ color: TEAM_COLORS[teams.indexOf(t)], fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {i === 0 ? '🥇 ' : ''}{t.name}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900 }}>{t.score}</Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Button fullWidth variant="contained" sx={{ mt: 2, ...bigBtnSx }} onClick={act(() => newGame())}>
                New Game
              </Button>
            </CardContent>
          </Card>
        )}

      </Stack>
    </Box>
  );
};

export default SSHostComponent;
