import { Router } from 'express';
import { request as httpRequest } from 'http';
import { gameShowStore } from '../services/gameShowStore.js';
import { createSave, deleteSave, listSaves, loadSave } from '../services/gameSaveService.js';
import { addKnownPlayers, deleteKnownPlayer, listKnownPlayers } from '../services/knownPlayersService.js';
import { sendToPico } from '../buzzer/inputs/hardwareInput.js';

const router = Router();

// Team index → LED color (team-a=0, team-b=1, team-c=2, team-d=3)
// Must match TEAM_LED_COLORS in hardwareInput.ts and screen TEAM_ACCENTS
const TEAM_COLORS: Record<string, number[]> = {
  'team-a': [0,   255, 100],  // Cyan   #00ff64
  'team-b': [255,  60,   0],  // Orange #ff3c00
  'team-c': [ 80,   0, 255],  // Purple #5000ff
  'team-d': [255,   0,  40],  // Pink   #ff0028
};
const ALL_TEAM_COLORS = Object.values(TEAM_COLORS);

function teamColor(teamId: string | null | undefined): number[] {
  return TEAM_COLORS[teamId ?? ''] ?? [255, 255, 255];
}

/**
 * Send an LED_EFFECT to the Pico.
 * - If JUDGE_URL is set (VPS): forward via HTTP POST to the Pi's /api/buzzer/led-effect.
 * - Otherwise (Pi itself): write directly to serial via sendToPico.
 */
function piLed(params: Record<string, unknown>): void {
  const judgeUrl = process.env['JUDGE_URL'];
  if (judgeUrl) {
    try {
      const u = new URL(judgeUrl);
      const body = JSON.stringify(params);
      const req = httpRequest({
        hostname: u.hostname,
        port: Number(u.port) || 3001,
        path: '/api/buzzer/led-effect',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      });
      req.on('error', () => { /* fire and forget */ });
      req.write(body);
      req.end();
    } catch { /* ignore */ }
  } else {
    sendToPico({ event: 'LED_EFFECT', ...params });
  }
}

router.get('/state', (_req, res) => {
  res.json(gameShowStore.getState());
});

router.post('/start', (_req, res) => {
  res.json(gameShowStore.startGame());
});

router.post('/players/random-assign', (_req, res) => {
  const state = gameShowStore.randomAssignPlayers();
  const activeColors = state.teams
    .filter(t => !t.eliminated)
    .map(t => TEAM_COLORS[t.id])
    .filter(Boolean) as number[][];
  piLed({ effect: 'spin', colors: ALL_TEAM_COLORS, settle_colors: activeColors, duration_ms: 3000 });
  res.json(state);
});

router.post('/reset', (_req, res) => {
  res.json(gameShowStore.reset());
});

router.post('/scores/reset', (_req, res) => {
  const state = gameShowStore.resetScores();
  piLed({ effect: 'wipe', color: [255, 255, 255], speed_ms: 2 });
  res.json(state);
});

router.post('/question/:questionId/select', (req, res) => {
  res.json(gameShowStore.selectQuestion(req.params.questionId));
});

router.post('/song/:songIndex/select', (req, res) => {
  const state = gameShowStore.selectSong(Number(req.params.songIndex));
  piLed({ effect: 'pulse', color: [0, 60, 180], bpm: 60, min_bright: 0.1, max_bright: 0.8 });
  res.json(state);
});

router.post('/buzz/:teamId', (req, res) => {
  res.json(gameShowStore.setBuzzWinner(req.params.teamId));
});

/** Resolve a judge controllerId → teamId and set the buzz winner (phone/hardware mode). */
router.post('/buzz/controller/:controllerId', (req, res) => {
  const result = gameShowStore.setBuzzWinnerFromController(req.params.controllerId);
  if (!result) {
    res.status(404).json({ error: `No controller assignment found for controllerId '${req.params.controllerId}'` });
    return;
  }
  // During a steal window, show the stealing team's color, not the original buzzer's
  const activeTeamId = result.roundState.stealingTeamId ?? result.roundState.buzzWinnerTeamId;
  const color = teamColor(activeTeamId);
  piLed({ effect: 'flash', color, flashes: 3, on_ms: 80, off_ms: 60, end_color: color });
  res.json(result);
});

router.post('/penalized-controller/:controllerId', (req, res) => {
  res.json(gameShowStore.addPenalizedController(req.params.controllerId));
});

router.delete('/penalized-controller/:controllerId', (req, res) => {
  res.json(gameShowStore.removePenalizedController(req.params.controllerId));
});

router.post('/answer/correct', (_req, res) => {
  const state = gameShowStore.markCorrect();
  piLed({ effect: 'flash', color: [0, 255, 60], flashes: 4, on_ms: 150, off_ms: 80, end_color: [0, 255, 60] });
  res.json(state);
});

router.post('/answer/artist-bonus', (_req, res) => {
  const state = gameShowStore.awardArtistBonus();
  const color = teamColor(state.roundState.buzzWinnerTeamId);
  piLed({ effect: 'sparkle', color, density: 0.12, speed_ms: 40, duration_ms: 3000, end_color: color });
  res.json(state);
});

router.post('/answer/wrong', (_req, res) => {
  const state = gameShowStore.markWrong();
  piLed({ effect: 'flash', color: [255, 20, 0], flashes: 4, on_ms: 120, off_ms: 80 });
  res.json(state);
});

router.post('/steal/arm', (_req, res) => {
  res.json(gameShowStore.setStealArmed(true));
});

router.post('/steal/team/:teamId', (req, res) => {
  res.json(gameShowStore.setStealingTeam(req.params.teamId));
});

router.post('/steal/success', (_req, res) => {
  // Capture stealingTeamId BEFORE resolveSteal clears it from state
  const stealingTeamId = gameShowStore.getState().roundState.stealingTeamId;
  const state = gameShowStore.resolveSteal(true);
  const color = teamColor(stealingTeamId ?? state.roundState.buzzWinnerTeamId);
  piLed({ effect: 'flash', color: [0, 255, 60], flashes: 4, on_ms: 150, off_ms: 80, end_color: color });
  res.json(state);
});

router.post('/steal/fail', (_req, res) => {
  const state = gameShowStore.resolveSteal(false);
  piLed({ effect: 'flash', color: [255, 20, 0], flashes: 4, on_ms: 120, off_ms: 80 });
  res.json(state);
});

router.post('/reveal/:mode', (req, res) => {
  const mode = req.params.mode as 'none' | 'title' | 'artist' | 'both';
  res.json(gameShowStore.setRevealState(mode));
});

router.post('/teams/:teamId/eliminate', (req, res) => {
  res.json(gameShowStore.eliminateTeam(req.params.teamId));
});

router.post('/teams/:teamId/reinstate', (req, res) => {
  res.json(gameShowStore.reinstateTeam(req.params.teamId));
});

router.post('/round/next', (_req, res) => {
  const state = gameShowStore.nextRound();
  piLed({ effect: 'rainbow', speed_ms: 15, brightness: 0.9, duration_ms: 4000, end_color: [0, 60, 180] });
  res.json(state);
});

router.post('/round/reset', (_req, res) => {
  const state = gameShowStore.resetRound();
  piLed({ effect: 'pulse', color: [0, 60, 180], bpm: 60, min_bright: 0.1, max_bright: 0.8 });
  res.json(state);
});

router.post('/undo', (_req, res) => {
  res.json(gameShowStore.undo());
});

router.post('/host-lock/toggle', (_req, res) => {
  res.json(gameShowStore.toggleHostLock());
});

router.post('/sudden-death', (_req, res) => {
  res.json(gameShowStore.triggerSuddenDeath());
});

router.post('/first-pick/random', (_req, res) => {
  const state = gameShowStore.randomFirstPick();
  const color = teamColor(state.firstPickTeamId);
  piLed({ effect: 'spin', colors: ALL_TEAM_COLORS, settle_colors: [color], duration_ms: 5500 });
  res.json(state);
});

router.post('/first-pick/dismiss', (_req, res) => {
  res.json(gameShowStore.dismissFirstPick());
});

router.post('/show-board', (_req, res) => {
  const state = gameShowStore.showBoard();
  piLed({ effect: 'pulse', color: [0, 60, 180], bpm: 60, min_bright: 0.1, max_bright: 0.8 });
  res.json(state);
});

router.post('/wand-test', (_req, res) => {
  res.json(gameShowStore.showWandTest());
});

router.post('/show-rules/on', (_req, res) => {
  const state = gameShowStore.toggleShowRules(true);
  piLed({ effect: 'off' });
  res.json(state);
});

router.post('/show-rules/off', (_req, res) => {
  res.json(gameShowStore.toggleShowRules(false));
});

router.post('/show-intro/on', (_req, res) => {
  const state = gameShowStore.toggleShowIntro(true);
  piLed({ effect: 'marquee', color: [255,200,0], color2: [0,180,255], bulb_size: 4, gap_size: 2, speed_ms: 25 });
  res.json(state);
});

router.post('/show-intro/off', (_req, res) => {
  res.json(gameShowStore.toggleShowIntro(false));
});

router.post('/game/end', (req, res) => {
  const { winnerTeamId } = req.body as { winnerTeamId?: string };
  if (!winnerTeamId) {
    res.status(400).json({ error: 'winnerTeamId is required' });
    return;
  }
  const state = gameShowStore.endGame(winnerTeamId);
  // Golden sparkle celebration for game winner
  piLed({ effect: 'sparkle', color: [255, 180, 0], density: 0.2, speed_ms: 30 });
  res.json(state);
});

router.put('/config', (req, res) => {
  res.json(gameShowStore.updateConfig(req.body));
});

router.post('/buzzer-mode', (req, res) => {
  const { mode } = req.body as { mode?: string };
  if (mode !== 'manual' && mode !== 'phone' && mode !== 'hardware') {
    res.status(400).json({ error: 'mode must be manual, phone, or hardware' });
    return;
  }
  res.json(gameShowStore.setBuzzerMode(mode));
});

router.patch('/state', (req, res) => {
  res.json(gameShowStore.patch(req.body));
});

router.get('/saves', (_req, res) => {
  res.json(listSaves());
});

router.post('/saves', (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const questions = gameShowStore.getState().questions;
  res.json(createSave(name.trim(), questions));
});

router.post('/saves/:id/load', (req, res) => {
  const save = loadSave(req.params.id);
  if (!save) {
    res.status(404).json({ error: 'Save not found' });
    return;
  }
  res.json(gameShowStore.updateConfig({ questions: save.questions }));
});

router.delete('/saves/:id', (req, res) => {
  const ok = deleteSave(req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Save not found' });
    return;
  }
  res.json({ ok: true });
});

router.get('/known-players', (_req, res) => {
  res.json(listKnownPlayers());
});

router.post('/known-players', (req, res) => {
  const { names } = req.body as { names?: string[] };
  if (!Array.isArray(names)) {
    res.status(400).json({ error: 'names array required' });
    return;
  }
  res.json(addKnownPlayers(names));
});

router.delete('/known-players/:name', (req, res) => {
  res.json(deleteKnownPlayer(decodeURIComponent(req.params.name)));
});

export default router;
