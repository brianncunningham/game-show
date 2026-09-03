import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, Collapse, Divider, Grid, IconButton, MenuItem, Select, Stack, Typography,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import UndoIcon from '@mui/icons-material/Undo';
import type { TToTOState, TToTOChoiceKey, TToTOPhase } from './types';
import { CHOICE_LABELS, FLAVOR_LABELS } from './types';
import {
  getState, startGame, beginRound, revealMedia, replayMedia, revealChoices, recordBuzz, judge, next,
  newGame, endGame, undo, showIntro, hideIntro, listSaves, loadSave,
  showWandTest, hideWandTest, randomAssignPlayers,
} from './api';
import type { TToTOSaveMeta } from './api';
import { TTOTO_COLORS } from './colors';
import { ledEffect } from '../../features/buzzer/buzzerApi';
import { useSpotify, initiateSpotifyLogin } from '../../features/spotify/useSpotify';

// ID Please ("media_id") only — the host's Replay control stays available for the whole
// question, not just the initial reveal beat (see docs/ttoto-id-please-plan.md §6): teams
// may want another listen/look, and the show screen's full-bleed event overlays can step
// on a revealed image for a moment during buzz/steal/resolved.
const MEDIA_REPLAYABLE_PHASES: TToTOPhase[] = ['media_shown', 'armed', 'answering', 'steal', 'steal_armed', 'resolved'];

const TEAM_COLORS = [TTOTO_COLORS.team1, TTOTO_COLORS.team2] as const;
const CHOICE_ORDER: TToTOChoiceKey[] = ['this', 'that', 'the_other'];
const CHOICE_COLORS: Record<TToTOChoiceKey, string> = { this: TTOTO_COLORS.this, that: TTOTO_COLORS.that, the_other: TTOTO_COLORS.the_other };

/** Host-only context for a question, e.g. "Tomato is technically a fruit..." — never shown on /show. */
function HostNote({ note }: { note?: string }) {
  if (!note) return null;
  return (
    <Typography variant="body2" sx={{
      mb: 1.5, p: 1, borderRadius: 1, bgcolor: 'rgba(255,224,71,0.1)', border: '1px solid rgba(255,224,71,0.35)', color: TTOTO_COLORS.warning,
    }}>
      💡 {note}
    </Typography>
  );
}

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
  // ID Please ("media_id") song playback. Reuses NTT's Spotify Connect integration as-is
  // (see docs/ttoto-id-please-plan.md §2) — same localStorage token, so a host who's
  // already connected Spotify via /host for Name That Tune this session doesn't need to
  // reconnect here. Image questions never touch this.
  const spotify = useSpotify();
  // Mirrors NTTHostComponent's local pause/resume + connectivity-test state — this app
  // never asks the server whether Spotify is actually playing (it can't know; playback
  // happens on a separate Connect device, not this process), so "is it paused" is purely
  // a local UI toggle, same as NTT's spotifyPaused.
  const [spotifyPaused, setSpotifyPaused] = useState(false);
  const [spotifyTesting, setSpotifyTesting] = useState(false);
  // Real diagnostic feedback for a song that fails to play — useSpotify's play() now
  // resolves { ok: false, error } instead of silently swallowing a non-2xx response
  // (previously the only symptom of e.g. a malformed track ID was total silence).
  const [songPlayError, setSongPlayError] = useState<string | null>(null);

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

  // Clear any stale song-playback error the moment the question actually changes —
  // otherwise an error from question N would keep showing on question N+1.
  useEffect(() => {
    setSongPlayError(null);
  }, [state?.roundState.currentRoundIndex, state?.roundState.currentQuestionIndex]);

  // Wraps a navigation action (Game Screen, Next, etc.) so it always dismisses an active
  // wand test first. Without this, the /show screen's wand-test overlay renders ahead of
  // every other phase check (see TToTOShowComponent.tsx) and never goes away just because
  // the game moved on underneath it — wandTestSeq only changes via an explicit hide.
  const navAct = (fn: () => Promise<TToTOState>) => act(async () => {
    if ((state?.wandTestSeq ?? 0) > 0) await hideWandTest();
    return fn();
  });

  const handleLoadSave = async (id: string) => {
    setLoadingSaveId(id);
    try {
      if ((state?.wandTestSeq ?? 0) > 0) await hideWandTest();
      setState(await loadSave(id));
    } finally { setLoadingSaveId(null); }
  };

  if (!state) {
    return (
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Typography color="text.secondary">Connecting…</Typography>
      </Box>
    );
  }

  const { roundState, teams, rounds, config } = state;
  const {
    phase, currentRoundIndex, currentQuestionIndex, eliminatedChoices, answeringTeamId, resolvedCorrectly,
    displayChoices, correctChoice, stealEligibleTeamId, stealWindowOpen,
  } = roundState;
  const round = rounds[currentRoundIndex];
  const question = round?.questions[currentQuestionIndex];
  const mult = config.roundMultipliers[currentRoundIndex] ?? config.roundMultipliers[config.roundMultipliers.length - 1] ?? 1;
  const answeringTeam = teams.find(t => t.id === answeringTeamId);
  const stealEligibleTeam = teams.find(t => t.id === stealEligibleTeamId);

  // ID Please ("media_id") only. Starts Spotify playback client-side (same pattern NTT's
  // NTTHostComponent uses: the server call and the Spotify call are two independent
  // actions fired together) whenever the current question is a song — a no-op if it's an
  // image, or if Spotify isn't connected (the host can always fall back to playing it
  // manually on their own device; the round still advances either way).
  const playMediaIfSong = () => {
    if (question?.mediaType === 'song' && question.mediaRef && spotify.isConnected) {
      setSongPlayError(null);
      void spotify.play(question.mediaRef, question.mediaStartMs ?? 0).then(result => {
        if (!result.ok) setSongPlayError(result.error ?? 'Playback failed.');
      });
      setSpotifyPaused(false);
    }
  };
  const handleRevealMedia = (): Promise<TToTOState> => { playMediaIfSong(); return revealMedia(); };
  const handleReplayMedia = (): Promise<TToTOState> => { playMediaIfSong(); return replayMedia(); };
  const toggleSpotifyPause = () => {
    if (spotifyPaused) { void spotify.resume(); setSpotifyPaused(false); }
    else { void spotify.pause(); setSpotifyPaused(true); }
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, maxWidth: 860, mx: 'auto' }}>
      {/* Status bar */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
        {round && <Chip label={`Round ${round.roundNumber}`} color="primary" size="small" />}
        <Chip label={phase.replace(/_/g, ' ').toUpperCase()} size="small"
          color={phase === 'answering' ? 'warning' : phase === 'steal' || phase === 'steal_armed' ? 'error' : phase === 'armed' ? 'info' : 'default'} />
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
        {/* Persistent Spotify status/config — always visible on this page, not gated to
            a media_id round or any particular phase, so it can be set up before a game
            even starts and rechecked/reconnected/switched at any point during or after
            one (explicit host request: this is account/device setup, not something tied
            to being mid-question). Mirrors NTTHostComponent's spotifyStatus header
            (device selector, refresh, a connectivity Test button using the same reference
            track) — TToTO's host has no shared header slot to hook into, so this is its
            own card instead. An empty device list here is the most likely reason a song
            doesn't audibly play: Spotify Connect has nothing to hand playback off to. */}
        <Card variant="outlined">
          <CardContent sx={{ py: '10px !important' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <Typography sx={{ ...sectionLabelSx, mb: 0 }}>Spotify</Typography>
              {spotify.isConnected ? (
                <>
                  <Chip label="Connected ●" color="success" size="small" />
                  <Select
                    size="small" displayEmpty value={spotify.activeDeviceId ?? ''}
                    onChange={(e) => spotify.setActiveDeviceId(e.target.value || null)}
                    sx={{ fontSize: '0.8rem', minWidth: 160 }}
                  >
                    <MenuItem value=""><em>Active device (auto)</em></MenuItem>
                    {spotify.devices.map(d => (
                      <MenuItem key={d.id} value={d.id}>{d.name}{d.is_active ? ' ●' : ''}</MenuItem>
                    ))}
                  </Select>
                  <IconButton size="small" onClick={() => void spotify.fetchDevices()} title="Refresh devices">
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                  <Button
                    size="small" variant="text" color={spotifyTesting ? 'warning' : 'inherit'} sx={{ minWidth: 0 }}
                    onClick={() => {
                      if (spotifyTesting) { void spotify.pause(); setSpotifyTesting(false); }
                      else { void spotify.play('3BQHpFgAp4l80e1XslIjNI', 0); setSpotifyTesting(true); }
                    }}
                  >
                    {spotifyTesting ? 'Stop Test' : 'Test'}
                  </Button>
                  {spotify.devices.length === 0 && (
                    <Typography variant="caption" color="warning.main">
                      No devices found — open Spotify and start playing something anywhere, then hit refresh.
                    </Typography>
                  )}
                </>
              ) : (
                <Button size="small" variant="outlined" color="success" onClick={() => void initiateSpotifyLogin()}>
                  Connect Spotify
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* ID Please (media_id) only — a dedicated, hard-to-miss Replay/Pause card rather
            than a small button buried in the crowded status bar above (which is exactly
            what happened: it was there, just easy to overlook). Visible any time the
            current question's media is up, media_shown through resolved (see
            MEDIA_REPLAYABLE_PHASES). Pause/Resume is song-only (nothing to pause for a
            static image; sound effects are short enough not to need it). */}
        {round?.flavor === 'media_id' && question && MEDIA_REPLAYABLE_PHASES.includes(phase) && (
          <Card sx={{ border: '2px solid', borderColor: 'secondary.main' }}>
            <CardContent sx={{ py: '10px !important' }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                <Typography sx={{ ...sectionLabelSx, mb: 0 }}>Media</Typography>
                <Box sx={{ flex: 1 }} />
                {question.mediaType === 'song' && (
                  <Button variant="outlined" color="secondary" sx={bigBtnSx} onClick={() => toggleSpotifyPause()}>
                    {spotifyPaused ? '▶ Resume' : '⏸ Pause'}
                  </Button>
                )}
                <Button variant="contained" color="secondary" sx={bigBtnSx} onClick={act(() => handleReplayMedia())}>
                  🔁 Replay {question.mediaType === 'song' ? 'Song' : question.mediaType === 'sound' ? 'Sound' : 'Image'}
                </Button>
              </Stack>
              {songPlayError && (
                <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1 }}>
                  ⚠ {songPlayError}
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

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
                  <Button fullWidth variant="contained" sx={bigBtnSx} onClick={navAct(() => newGame())}>New Game</Button>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Button fullWidth variant={state.showIntro ? 'contained' : 'outlined'} color="secondary" sx={bigBtnSx}
                    onClick={navAct(() => showIntro())}>
                    🎬 Intro Screen
                  </Button>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Button fullWidth variant={!state.showIntro ? 'contained' : 'outlined'} color="primary" sx={bigBtnSx}
                    onClick={navAct(() => hideIntro())}>
                    📺 Game Screen
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button fullWidth variant="outlined" color="warning" sx={bigBtnSx}
                    disabled={phase === 'idle' || phase === 'game_over'} onClick={navAct(() => endGame())}>
                    🏆 End Game
                  </Button>
                </Grid>
                {config.buzzerMode !== 'manual' && (
                  <Grid item xs={12} sm={4}>
                    <Button fullWidth variant="contained" color="secondary" sx={bigBtnSx}
                      disabled={state.playerPool.length === 0}
                      onClick={act(() => randomAssignPlayers())}>
                      🎲 Randomize Teams {state.playerPool.length === 0 ? '(add players in /gameadmin)' : ''}
                    </Button>
                  </Grid>
                )}
                {config.buzzerMode !== 'manual' && (
                  <Grid item xs={12} sm={4}>
                    <Button fullWidth variant="outlined" color="info" sx={bigBtnSx} onClick={act(() => showWandTest())}>
                      🪄 Wand Test
                    </Button>
                  </Grid>
                )}
                {config.buzzerMode !== 'manual' && (
                  <Grid item xs={12} sm={4}>
                    <Button fullWidth variant="outlined" color="inherit" sx={{ ...bigBtnSx, opacity: 0.55 }}
                      onClick={() => { void ledEffect('off'); }}>
                      💡 Clear LEDs
                    </Button>
                  </Grid>
                )}
              </Grid>
              {config.buzzerMode !== 'manual' && (state.wandTestSeq ?? 0) > 0 && (
                <Button size="small" variant="text" color="warning" sx={{ mt: 1 }} onClick={act(() => hideWandTest())}>
                  ✕ Stop Wand Test
                </Button>
              )}
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
              <Button fullWidth variant="contained" color="info" sx={bigBtnSx} onClick={navAct(() => beginRound())}>
                Begin Round →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Triage only: category answers are up on /show, prompt still hidden from the
            audience. The host sees the prompt here so they're ready to read it the moment
            they click through — "Reveal Question" opens buzzers immediately, no separate
            arm step, so there's no reason to show it before the host is ready to go. */}
        {phase === 'categories_shown' && question && (
          <Card sx={{ border: '2px solid', borderColor: 'info.main' }}>
            <CardContent>
              <Typography sx={{ ...sectionLabelSx, mb: 1 }}>Categories Revealed</Typography>
              <Typography variant="body1" sx={{ mb: 1.5, p: 1.25, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)', fontStyle: 'italic' }}>
                "{question.prompt}" <Typography component="span" variant="caption" color="text.secondary">(hidden from audience until you reveal)</Typography>
              </Typography>
              <HostNote note={question.hostNote} />
              {correctChoice && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Correct answer: <strong>{CHOICE_LABELS[correctChoice]}</strong> ({displayChoices?.[correctChoice]})
                </Typography>
              )}
              <Button fullWidth variant="contained" color="info" sx={bigBtnSx} onClick={navAct(() => revealChoices())}>
                Reveal Question →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Reading: prompt visible, choices hidden. ID Please ("media_id") gets a cue
            badge here — before anything reveals on /show — so the host can verbally tell
            the room to listen or watch a beat ahead of tapping through, plus its own
            "Reveal Media" step instead of jumping straight to choices. */}
        {phase === 'reading' && question && (
          <Card sx={{ border: '2px solid', borderColor: 'info.main' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography sx={{ ...sectionLabelSx, mb: 0 }}>Reading</Typography>
                {round?.flavor === 'media_id' && question.mediaType && (
                  <Chip size="small" color="secondary" label={
                    question.mediaType === 'song' ? '🎵 LISTEN UP' : question.mediaType === 'sound' ? '🔊 LISTEN UP' : '🖼 WATCH THE SCREEN'
                  } />
                )}
              </Stack>
              <Typography variant="body1" sx={{ mb: 1.5, p: 1.25, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)', fontStyle: 'italic' }}>
                "{question.prompt}"
              </Typography>
              <HostNote note={question.hostNote} />
              {correctChoice && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Correct answer: <strong>{CHOICE_LABELS[correctChoice]}</strong> ({displayChoices?.[correctChoice]})
                </Typography>
              )}
              {round?.flavor === 'media_id' ? (
                <Button fullWidth variant="contained" color="info" sx={bigBtnSx} onClick={navAct(() => handleRevealMedia())}>
                  Reveal Media →
                </Button>
              ) : (
                <Button fullWidth variant="contained" color="info" sx={bigBtnSx} onClick={navAct(() => revealChoices())}>
                  Reveal Choices →
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* media_shown: media (song/image/sound) revealed on /show, choices still hidden.
            Host gets a preview (image thumbnail, or just the ref for songs/sounds — host
            is always fully informed in this app, same principle as the always-visible
            correct-choice flag) plus the persistent Replay control up in the status bar. */}
        {phase === 'media_shown' && question && (
          <Card sx={{ border: '2px solid', borderColor: 'info.main' }}>
            <CardContent>
              <Typography sx={{ ...sectionLabelSx, mb: 1 }}>Media Revealed</Typography>
              <Typography variant="body1" sx={{ mb: 1.5, p: 1.25, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)', fontStyle: 'italic' }}>
                "{question.prompt}"
              </Typography>
              {question.mediaType === 'image' && question.mediaRef && (
                <Box sx={{ mb: 1.5, textAlign: 'center' }}>
                  <img src={`/ttoto/media/${question.mediaRef}`} alt="" style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 4 }} />
                </Box>
              )}
              {question.mediaType === 'song' && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  🎵 Spotify track: <code>{question.mediaRef}</code>
                  {question.mediaStartMs ? ` (starts at ${(question.mediaStartMs / 1000).toFixed(1)}s)` : ''}
                  {!spotify.isConnected && ' — not connected, play it manually if needed.'}
                </Typography>
              )}
              {question.mediaType === 'sound' && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  🔊 Sound effect: <code>{question.mediaRef}</code> — playing on the show screen.
                </Typography>
              )}
              <HostNote note={question.hostNote} />
              {correctChoice && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Correct answer: <strong>{CHOICE_LABELS[correctChoice]}</strong> ({displayChoices?.[correctChoice]})
                </Typography>
              )}
              <Button fullWidth variant="contained" color="info" sx={bigBtnSx} onClick={navAct(() => revealChoices())}>
                Reveal Answers →
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
              <HostNote note={question.hostNote} />
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

        {/* TIMED_WINDOW steal window: the countdown/eligibility runs for real on the wands,
            but the host can still manually call it (hardware misbehaving, or just prefers
            to run it by ear) — /buzz/:teamId is phase-aware server-side and dispatches to
            the same recordStealBuzz() a real wand press would. Buttons respect the same
            exclusivity the wands do: only the currently-eligible team's button is enabled
            during the exclusive stage, both once it's open to both. */}
        {phase === 'steal_armed' && question && (
          <Card sx={{ border: '2px solid', borderColor: 'error.main' }}>
            <CardContent>
              <Typography sx={{ ...sectionLabelSx, mb: 1 }}>
                🪄 {stealWindowOpen ? 'Steal Open to Both Teams' : `Waiting for ${stealEligibleTeam?.name ?? ''} to Steal`}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {stealWindowOpen
                  ? 'Either team can buzz in now — pick whoever actually buzzed, or let the wands call it.'
                  : `Exclusive window is live on the wands — only ${stealEligibleTeam?.name ?? 'the other team'} can buzz until it opens.`}
              </Typography>
              <Grid container spacing={1.5}>
                {teams.map((t, i) => {
                  const eligible = stealWindowOpen || t.id === stealEligibleTeamId;
                  return (
                    <Grid item xs={6} key={t.id}>
                      <Button fullWidth variant="outlined" disabled={!eligible}
                        sx={{ ...bigBtnSx, borderColor: TEAM_COLORS[i], color: TEAM_COLORS[i] }}
                        onClick={act(() => recordBuzz(t.id))}>
                        {t.name} Buzzed
                      </Button>
                    </Grid>
                  );
                })}
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
              <HostNote note={question.hostNote} />
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
              <HostNote note={question.hostNote} />
              {round?.flavor === 'category_sort' && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Categories stay up — Next shows the next item and opens buzzers immediately.
                </Typography>
              )}
              <Button fullWidth variant="contained" color="primary" sx={bigBtnSx} onClick={navAct(() => next())}>
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
