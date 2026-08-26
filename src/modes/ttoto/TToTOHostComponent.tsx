import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, Collapse, Divider, Grid, IconButton, MenuItem, Select, Stack, Typography,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import UndoIcon from '@mui/icons-material/Undo';
import type { TToTOState, TToTOChoiceKey } from './types';
import { CHOICE_LABELS, FLAVOR_LABELS } from './types';
import {
  getState, startGame, beginRound, revealChoices, recordBuzz, judge, next,
  newGame, undo, showIntro, hideIntro, listSaves, loadSave,
} from './api';
import type { TToTOSaveMeta } from './api';
import { TTOTO_COLORS } from './colors';

const TEAM_COLORS = [TTOTO_COLORS.team1, TTOTO_COLORS.team2] as const;
const CHOICE_ORDER: TToTOChoiceKey[] = ['this', 'that', 'the_other'];
const CHOICE_COLORS: Record<TToTOChoiceKey, string> = { this: TTOTO_COLORS.this, that: TTOTO_COLORS.that, the_other: TTOTO_COLORS.the_other };

const sectionLabelSx = {
  fontWeight: 700, fontSize: { xs: '0.8rem', md: '0.85rem' }, letterSpacing: '0.12em',
  textTransform: 'uppercase' as const, color: 'text.secondary', mb: 1,
};

const bigBtnSx = { py: { xs: 2, md: 1.5 }, fontSize: { xs: '1.05rem', md: '0.95rem' }, minHeight: { xs: 56, md: 44 } };

export const TToTOHostComponent = () => {
  const [state, setState] = useState<TToTOState | null>(null);
  const [gameOpen, setGameOpen] = useState(false);
  const [saves, setSaves] = useState<TToTOSaveMeta[]>([]);
  const [loadingSaveId, setLoadingSaveId] = useState<string | null>(null);

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

  const act = useCallback((fn: () => Promise<TToTOState>) => async () => {
    try { setState(await fn()); } catch (e) { console.error(e); }
  }, []);

  const handleLoadSave = async (id: string) => {
    setLoadingSaveId(id);
    try { setState(await loadSave(id)); } finally { setLoadingSaveId(null); }
  };

  if (!state) {
    return (
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Typography color="text.secondary">Connecting…</Typography>
      </Box>
    );
  }

  const { roundState, teams, rounds, config } = state;
  const { phase, currentRoundIndex, currentQuestionIndex, eliminatedChoices, answeringTeamId, resolvedCorrectly, displayChoices, correctChoice } = roundState;
  const round = rounds[currentRoundIndex];
  const question = round?.questions[currentQuestionIndex];
  const mult = config.roundMultipliers[currentRoundIndex] ?? config.roundMultipliers[config.roundMultipliers.length - 1] ?? 1;
  const answeringTeam = teams.find(t => t.id === answeringTeamId);

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, maxWidth: 860, mx: 'auto' }}>
      {/* Status bar */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
        {round && <Chip label={`Round ${round.roundNumber}`} color="primary" size="small" />}
        <Chip label={phase.replace(/_/g, ' ').toUpperCase()} size="small"
          color={phase === 'answering' ? 'warning' : phase === 'steal' ? 'error' : phase === 'armed' ? 'info' : 'default'} />
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
        {/* Load Game */}
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
                  disabled={loadingSaveId !== null}
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
            <Stack direction="row" alignItems="center" justifyContent="space-between"
              onClick={() => setGameOpen(o => !o)} sx={{ cursor: 'pointer', userSelect: 'none' }}>
              <Typography sx={sectionLabelSx}>Game</Typography>
              <IconButton size="small">{gameOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
            </Stack>
            <Collapse in={gameOpen}>
              <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                <Grid item xs={6} sm={4}>
                  <Button fullWidth variant="contained" sx={bigBtnSx} onClick={act(() => newGame())}>New Game</Button>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Button fullWidth variant={state.showIntro ? 'contained' : 'outlined'} color="secondary" sx={bigBtnSx}
                    onClick={act(() => showIntro())}>
                    🎬 Intro Screen
                  </Button>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Button fullWidth variant={!state.showIntro ? 'contained' : 'outlined'} color="primary" sx={bigBtnSx}
                    onClick={act(() => hideIntro())}>
                    📺 Game Screen
                  </Button>
                </Grid>
              </Grid>
            </Collapse>
          </CardContent>
        </Card>

        <Divider />

        {/* No content loaded */}
        {rounds.length === 0 && (
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                No rounds loaded. Add content in /gameadmin, or load a save.
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Idle: start game */}
        {rounds.length > 0 && phase === 'idle' && (
          <Card sx={{ border: '2px solid', borderColor: 'primary.main' }}>
            <CardContent>
              <Typography sx={{ ...sectionLabelSx, mb: 1.5 }}>Ready to Start</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {rounds.length} round{rounds.length !== 1 ? 's' : ''} loaded.
              </Typography>
              <Button fullWidth variant="contained" color="primary" sx={bigBtnSx} onClick={act(() => startGame())}>
                Start Game →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Round intro */}
        {phase === 'round_intro' && round && (
          <Card sx={{ border: '2px solid', borderColor: 'info.main' }}>
            <CardContent>
              <Typography sx={{ ...sectionLabelSx, mb: 1.5 }}>
                Round {round.roundNumber} — {FLAVOR_LABELS[round.flavor]}
              </Typography>
              <Button fullWidth variant="contained" color="info" sx={bigBtnSx} onClick={act(() => beginRound())}>
                Begin Round →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Reading: prompt visible, choices hidden */}
        {phase === 'reading' && question && (
          <Card sx={{ border: '2px solid', borderColor: 'info.main' }}>
            <CardContent>
              <Typography sx={{ ...sectionLabelSx, mb: 1 }}>Reading</Typography>
              <Typography variant="body1" sx={{ mb: 1.5, p: 1.25, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)', fontStyle: 'italic' }}>
                "{question.prompt}"
              </Typography>
              {correctChoice && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Correct answer: <strong>{CHOICE_LABELS[correctChoice]}</strong> ({displayChoices?.[correctChoice]})
                </Typography>
              )}
              <Button fullWidth variant="contained" color="info" sx={bigBtnSx} onClick={act(() => revealChoices())}>
                Reveal Choices →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Armed: waiting for manual buzz */}
        {phase === 'armed' && question && (
          <Card sx={{ border: '2px solid', borderColor: 'success.main' }}>
            <CardContent>
              <Typography sx={{ ...sectionLabelSx, mb: 1 }}>🔵 Buzzers Armed — Waiting for Buzz</Typography>
              <Typography variant="body1" sx={{ mb: 1.5, p: 1.25, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)', fontStyle: 'italic' }}>
                "{question.prompt}"
              </Typography>
              <Grid container spacing={1.5}>
                {teams.map((t, i) => (
                  <Grid item xs={6} key={t.id}>
                    <Button fullWidth variant="outlined" sx={{ ...bigBtnSx, borderColor: TEAM_COLORS[i], color: TEAM_COLORS[i] }}
                      onClick={act(() => recordBuzz(t.id))}>
                      {t.name} Buzzed
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Answering / steal: judge via the 3-choice tap UI */}
        {(phase === 'answering' || phase === 'steal') && question && (
          <Card sx={{ border: '2px solid', borderColor: phase === 'steal' ? 'error.main' : 'warning.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: phase === 'steal' ? 'error.main' : 'warning.main' }} />
                <Typography sx={{ ...sectionLabelSx, mb: 0 }}>
                  {phase === 'steal' ? `${answeringTeam?.name ?? ''} — Stealing` : `${answeringTeam?.name ?? ''} — On the Clock`}
                </Typography>
              </Stack>
              <Typography variant="body1" sx={{ mb: 1.5, p: 1.25, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)', fontStyle: 'italic' }}>
                "{question.prompt}"
              </Typography>
              <Grid container spacing={1.5}>
                {CHOICE_ORDER.map((choice) => {
                  const isCorrect = choice === correctChoice;
                  const eliminated = eliminatedChoices.includes(choice);
                  return (
                    <Grid item xs={12} sm={4} key={choice}>
                      <Button fullWidth disabled={eliminated} variant={isCorrect ? 'contained' : 'outlined'}
                        sx={{
                          ...bigBtnSx, flexDirection: 'column', gap: 0.5, textTransform: 'none',
                          borderColor: CHOICE_COLORS[choice],
                          color: isCorrect ? '#f2f5fb' : eliminated ? undefined : CHOICE_COLORS[choice],
                          bgcolor: isCorrect ? CHOICE_COLORS[choice] : undefined,
                          textDecoration: eliminated ? 'line-through' : undefined,
                        }}
                        onClick={act(() => judge(choice))}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {isCorrect && <CheckCircleIcon fontSize="small" />}
                          <span style={{ fontWeight: 700 }}>{CHOICE_LABELS[choice]}</span>
                        </Stack>
                        <Typography variant="caption" sx={{ opacity: 0.85 }}>{displayChoices?.[choice]}</Typography>
                      </Button>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Resolved: show result, advance */}
        {phase === 'resolved' && question && (
          <Card sx={{ border: '2px solid', borderColor: resolvedCorrectly ? 'success.main' : 'default' }}>
            <CardContent>
              <Typography sx={{ ...sectionLabelSx, mb: 1.5 }}>
                {resolvedCorrectly ? `${answeringTeam?.name ?? ''} got it! ✓` : `Nobody got it — it was ${correctChoice ? CHOICE_LABELS[correctChoice] : ''}`}
              </Typography>
              <Button fullWidth variant="contained" color="primary" sx={bigBtnSx} onClick={act(() => next())}>
                Next →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Game over */}
        {phase === 'game_over' && (
          <Card sx={{ border: '2px solid', borderColor: 'primary.main' }}>
            <CardContent>
              <Typography sx={{ ...sectionLabelSx, mb: 1.5 }}>Game Over</Typography>
              <Button fullWidth variant="contained" sx={bigBtnSx} onClick={act(() => newGame())}>New Game</Button>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
};

export default TToTOHostComponent;
