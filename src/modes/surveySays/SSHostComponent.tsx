import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, Divider,
  Stack, Typography,
} from '@mui/material';
import type { SurveySaysState, SurveyBoard, SurveyAnswer } from './types';
import {
  getState,
  recordBuzz, recordFaceOffStrike, resolveFaceOff, resetBuzzersOnly,
  setPlayOrPass,
  revealAnswer, revealAnswerPostRound, addStrike,
  setStealingTeam, stealSuccess, stealFail,
  nextRound, endGame,
  adjustScore,
  loadBoard,
} from './api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAM_COLORS = ['#00e5ff', '#ff6a00'] as const;
const sectionLabelSx = { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'text.disabled', mb: 1 };
const bigBtnSx = { fontWeight: 700, py: 1.2 };

// ─── Main component ───────────────────────────────────────────────────────────

export const SSHostComponent = () => {
  const [state, setState] = useState<SurveySaysState | null>(null);

  const refresh = useCallback(async () => {
    try { setState(await getState()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => { void refresh(); }, 800);
    return () => clearInterval(id);
  }, [refresh]);

  const act = useCallback((fn: () => Promise<SurveySaysState>) => async () => {
    try { setState(await fn()); } catch (e) { console.error(e); }
  }, []);

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
          faceOffWinnerTeamId } = roundState;

  const currentBoard: SurveyBoard | undefined = boards.find(b => b.id === currentBoardId);
  const mult = config.multiplierSchedule[currentRound - 1] ?? config.multiplierSchedule[config.multiplierSchedule.length - 1] ?? 1;

  const unrevealedAnswers: SurveyAnswer[] = currentBoard
    ? currentBoard.answers.filter(a => !revealedAnswers.some(r => r.rank === a.rank))
    : [];

  const isPostRound = phase === 'post_round';
  const isSteal = phase === 'steal';
  const isMainPlay = phase === 'main_play';
  const isFaceOff = phase === 'face_off';
  const isPlayOrPass = phase === 'play_or_pass';

  const boardsForRound = boards.filter(b => b.round === currentRound);

  return (
    <Box sx={{ p: 2, maxWidth: 900, mx: 'auto' }}>
      {/* ── Status bar ── */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label={`Round ${currentRound}`} color="primary" size="small" />
        <Chip label={phase.replace('_', ' ').toUpperCase()} size="small"
          color={isMainPlay ? 'warning' : isSteal ? 'error' : isFaceOff ? 'info' : 'default'} />
        {mult > 1 && <Chip label={`×${mult}`} size="small" sx={{ background: '#f5c51833', color: '#f5c518', border: '1px solid #f5c51866' }} />}
        <Box sx={{ flex: 1 }} />
        {teams.map((t, i) => (
          <Typography key={t.id} sx={{ fontWeight: 700, color: TEAM_COLORS[i] }}>
            {t.name}: {t.score}
          </Typography>
        ))}
      </Stack>

      <Stack spacing={2}>

        {/* ── Board selection (idle / between rounds) ── */}
        {(phase === 'idle' || boardsForRound.length > 0) && (
          <Card>
            <CardContent>
              <Typography sx={sectionLabelSx}>Load Board — Round {currentRound}</Typography>
              {boardsForRound.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No boards loaded for round {currentRound}. Load a game in /gameadmin.</Typography>
              ) : (
                <Stack spacing={1}>
                  {boardsForRound.map(b => (
                    <Button
                      key={b.id}
                      fullWidth
                      variant={b.id === currentBoardId ? 'contained' : 'outlined'}
                      color="primary"
                      sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                      onClick={act(() => loadBoard(b.id))}
                    >
                      {b.question}
                    </Button>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Face-Off ── */}
        {isFaceOff && (
          <Card sx={{ border: '1px solid', borderColor: 'info.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="Face-Off" size="small" color="info" />
                <Typography sx={{ ...sectionLabelSx, mb: 0 }}>
                  {faceOffState === 'waiting_buzz' ? 'Waiting for buzz…'
                    : faceOffState === 'player_a_answered' ? 'Player A answered — judge answer'
                    : faceOffState === 'player_b_answering' ? 'Player B answering…'
                    : 'Face-off resolved'}
                </Typography>
              </Stack>

              {/* Manual buzz buttons */}
              {faceOffState === 'waiting_buzz' && (
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                  {teams.map((t, i) => (
                    <Button key={t.id} fullWidth variant="outlined" sx={{ ...bigBtnSx, borderColor: TEAM_COLORS[i], color: TEAM_COLORS[i] }}
                      onClick={act(() => recordBuzz(t.id))}>
                      {t.name} Buzzes
                    </Button>
                  ))}
                </Stack>
              )}

              {/* Answer buttons for face-off judgment */}
              {(faceOffState === 'player_a_answered' || faceOffState === 'player_b_answering') && currentBoard && (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Click answer if correct — or mark strike:
                  </Typography>
                  <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                    {currentBoard.answers.map(a => (
                      <Button key={a.rank} fullWidth variant="outlined" size="small"
                        sx={{ justifyContent: 'space-between', textTransform: 'none' }}
                        onClick={act(() => revealAnswer(a.rank))}>
                        <span>{a.rank}. {a.text}</span>
                        <Typography component="span" sx={{ color: '#f5c518', fontWeight: 700 }}>{a.points}</Typography>
                      </Button>
                    ))}
                  </Stack>
                  <Divider sx={{ my: 1 }} />
                  <Stack direction="row" spacing={1}>
                    {teams.map((t, i) => (
                      <Button key={t.id} fullWidth color="error" variant="outlined" sx={bigBtnSx}
                        onClick={act(() => recordFaceOffStrike(t.id))}>
                        Strike — {t.name}
                      </Button>
                    ))}
                  </Stack>
                </>
              )}

              {/* Resolve face-off winner */}
              {(faceOffState === 'player_a_answered' || faceOffState === 'player_b_answering') && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                    Award face-off to:
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {teams.map((t, i) => (
                      <Button key={t.id} fullWidth variant="contained"
                        sx={{ ...bigBtnSx, background: TEAM_COLORS[i] + 'cc' }}
                        onClick={act(() => resolveFaceOff(t.id))}>
                        {t.name} Wins Face-Off
                      </Button>
                    ))}
                  </Stack>
                </>
              )}

              {/* Reset buzzers (next pair) */}
              <Divider sx={{ my: 1.5 }} />
              <Button fullWidth variant="outlined" color="inherit" sx={bigBtnSx}
                onClick={act(() => resetBuzzersOnly())}>
                Reset Buzzers (Next Pair, Same Question)
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Play or Pass ── */}
        {isPlayOrPass && (
          <Card sx={{ border: '1px solid', borderColor: 'warning.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="Play or Pass" size="small" color="warning" />
                <Typography sx={{ ...sectionLabelSx, mb: 0 }}>
                  {faceOffWinnerTeamId ? `${teams.find(t => t.id === faceOffWinnerTeamId)?.name ?? faceOffWinnerTeamId} won face-off` : ''}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button fullWidth variant="contained" color="success" sx={bigBtnSx}
                  onClick={act(() => setPlayOrPass('play'))}>
                  Play
                </Button>
                <Button fullWidth variant="outlined" color="warning" sx={bigBtnSx}
                  onClick={act(() => setPlayOrPass('pass'))}>
                  Pass
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* ── Main Play ── */}
        {(isMainPlay || isSteal || isPostRound) && currentBoard && (
          <Card sx={{ border: '1px solid', borderColor: isMainPlay ? 'warning.main' : isSteal ? 'error.main' : 'divider' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip
                  label={isMainPlay ? 'Main Play' : isSteal ? 'Steal' : 'Post-Round'}
                  size="small"
                  color={isMainPlay ? 'warning' : isSteal ? 'error' : 'default'}
                />
                {controllingTeamId && (
                  <Typography sx={{ ...sectionLabelSx, mb: 0 }}>
                    {teams.find(t => t.id === controllingTeamId)?.name ?? controllingTeamId} playing
                  </Typography>
                )}
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  Bank: <strong style={{ color: '#f5c518' }}>{roundBank}</strong>
                  {mult > 1 && ` × ${mult}`}
                </Typography>
              </Stack>

              {/* Strikes display */}
              {isMainPlay && (
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Strikes:</Typography>
                  {[0, 1, 2].map(i => (
                    <Box key={i} sx={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: `1.5px solid ${i < strikeCount ? '#ff2020' : '#ffffff33'}`,
                      background: i < strikeCount ? '#ff202033' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {i < strikeCount && <Typography sx={{ fontSize: '0.6rem', color: '#ff2020', fontWeight: 900 }}>✕</Typography>}
                    </Box>
                  ))}
                </Stack>
              )}

              {/* Answer reveal buttons */}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                {isPostRound ? 'Reveal remaining answers:' : 'Correct answer:'}
              </Typography>
              <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                {currentBoard.answers.map(a => {
                  const isRevealed = revealedAnswers.some(r => r.rank === a.rank);
                  return (
                    <Button key={a.rank} fullWidth variant={isRevealed ? 'text' : 'outlined'}
                      color={isRevealed ? 'success' : 'primary'} size="small"
                      disabled={isRevealed}
                      sx={{ justifyContent: 'space-between', textTransform: 'none', opacity: isRevealed ? 0.5 : 1 }}
                      onClick={act(() => isPostRound ? revealAnswerPostRound(a.rank) : revealAnswer(a.rank))}>
                      <span>{a.rank}. {a.text}</span>
                      <Typography component="span" sx={{ color: isRevealed ? 'success.main' : '#f5c518', fontWeight: 700 }}>{a.points}</Typography>
                    </Button>
                  );
                })}
              </Stack>

              {/* Wrong answer / strike (main play only) */}
              {isMainPlay && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Button fullWidth color="error" variant="outlined" sx={bigBtnSx}
                    onClick={act(() => addStrike())}>
                    Wrong Answer / Strike ({strikeCount}/3)
                  </Button>
                </>
              )}

              {/* Steal controls */}
              {isSteal && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography sx={{ ...sectionLabelSx, mb: 1 }}>Steal — assign team:</Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                    {teams.map((t, i) => (
                      <Button key={t.id} fullWidth
                        variant={stealingTeamId === t.id ? 'contained' : 'outlined'}
                        sx={{ ...bigBtnSx, borderColor: TEAM_COLORS[i], color: stealingTeamId === t.id ? '#000' : TEAM_COLORS[i],
                          background: stealingTeamId === t.id ? TEAM_COLORS[i] : 'transparent' }}
                        onClick={act(() => setStealingTeam(t.id))}>
                        {t.name}
                      </Button>
                    ))}
                  </Stack>
                  {stealingTeamId && unrevealedAnswers.length > 0 && (
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                        Steal answer:
                      </Typography>
                      <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                        {unrevealedAnswers.map(a => (
                          <Button key={a.rank} fullWidth variant="outlined" size="small" color="error"
                            sx={{ justifyContent: 'space-between', textTransform: 'none' }}
                            onClick={act(() => stealSuccess(a.rank))}>
                            <span>{a.rank}. {a.text}</span>
                            <Typography component="span" sx={{ color: '#f5c518', fontWeight: 700 }}>{a.points}</Typography>
                          </Button>
                        ))}
                      </Stack>
                    </>
                  )}
                  <Button fullWidth color="error" variant="contained" sx={bigBtnSx}
                    onClick={act(() => stealFail())}>
                    Steal Failed
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Round / Game transitions ── */}
        {(isPostRound || phase === 'game_over') && (
          <Card>
            <CardContent>
              <Typography sx={sectionLabelSx}>Round End</Typography>
              <Stack direction="row" spacing={1}>
                {phase !== 'game_over' && (
                  <Button fullWidth variant="contained" color="primary" sx={bigBtnSx}
                    onClick={act(() => nextRound())}>
                    Next Round (Round {currentRound + 1})
                  </Button>
                )}
                <Button fullWidth variant={phase === 'game_over' ? 'contained' : 'outlined'} color="warning" sx={bigBtnSx}
                  onClick={act(() => endGame())}>
                  End Game
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* ── Score adjustments ── */}
        <Card>
          <CardContent>
            <Typography sx={sectionLabelSx}>Score Adjustments</Typography>
            <Stack spacing={1}>
              {teams.map((t, i) => (
                <Stack key={t.id} direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" sx={{ color: TEAM_COLORS[i], fontWeight: 700, minWidth: 100 }}>{t.name}</Typography>
                  <Typography variant="body2" sx={{ minWidth: 48 }}>{t.score} pts</Typography>
                  <Button size="small" variant="outlined" onClick={act(() => adjustScore(t.id, -10))}>−10</Button>
                  <Button size="small" variant="outlined" onClick={act(() => adjustScore(t.id, +10))}>+10</Button>
                  <Button size="small" variant="outlined" onClick={act(() => adjustScore(t.id, -50))}>−50</Button>
                  <Button size="small" variant="outlined" onClick={act(() => adjustScore(t.id, +50))}>+50</Button>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>

      </Stack>
    </Box>
  );
};

export default SSHostComponent;
