import { Router } from 'express';
import { request as httpRequest } from 'http';
import { surveySaysStore } from './store.js';
import { createSSSave, deleteSSSave, listSSSaves, loadSSSave, patchSSSaveConfig } from './saveService.js';
import { sendToPico } from '../../shared/buzzer/inputs/hardwareInput.js';
import type { SurveySaysConfig } from './types.js';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const TEAM_COLORS: Record<string, number[]> = {
  'team-1': [0, 229, 255],   // cyan
  'team-2': [255, 106, 0],   // orange
};

const teamColor = (teamId: string): number[] =>
  TEAM_COLORS[teamId] ?? [255, 255, 255];

// ─── State ───────────────────────────────────────────────────────────────────

router.get('/state', (_req, res) => {
  res.json(surveySaysStore.getState());
});

router.post('/reset', (_req, res) => {
  res.json(surveySaysStore.reset());
});

// ─── Config ──────────────────────────────────────────────────────────────────

router.patch('/config', (req, res) => {
  const patch = req.body as Partial<SurveySaysConfig>;
  const current = surveySaysStore.getState();
  res.json(surveySaysStore.updateConfig({ config: { ...current.config, ...patch } }));
});

router.patch('/teams/:teamId/name', (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return; }
  res.json(surveySaysStore.setTeamName(req.params.teamId, name.trim()));
});

router.post('/teams/:teamId/score/adjust', (req, res) => {
  const { delta } = req.body as { delta?: number };
  if (typeof delta !== 'number') { res.status(400).json({ error: 'delta required' }); return; }
  res.json(surveySaysStore.adjustScore(req.params.teamId, delta));
});

// ─── Intro ───────────────────────────────────────────────────────────────────

router.post('/intro/hide', (_req, res) => {
  res.json(surveySaysStore.setShowIntro(false));
});

router.post('/intro/show', (_req, res) => {
  piLed({ effect: 'marquee', color: [245, 197, 24], color2: [255, 240, 80], bulb_size: 4, gap_size: 2, speed_ms: 25 });
  res.json(surveySaysStore.setShowIntro(true));
});

// ─── Board management ────────────────────────────────────────────────────────

router.post('/boards', (req, res) => {
  const { boards } = req.body as { boards?: unknown[] };
  if (!Array.isArray(boards)) { res.status(400).json({ error: 'boards array required' }); return; }
  res.json(surveySaysStore.setBoards(boards as import('./types.js').SurveyBoard[]));
});

router.post('/board/load/:boardId', (req, res) => {
  const { boardId } = req.params;
  const board = surveySaysStore.getState().boards.find(b => b.id === boardId);
  if (!board) { res.status(404).json({ error: 'Board not found' }); return; }
  piLed({ effect: 'flash', color: [0, 80, 220], flashes: 2, on_ms: 150, off_ms: 80 });
  res.json(surveySaysStore.loadBoard(boardId));
});

// ─── Face-off ────────────────────────────────────────────────────────────────

router.post('/faceoff/buzz/:teamId', (req, res) => {
  const color = teamColor(req.params.teamId);
  piLed({ effect: 'flash', color, flashes: 3, on_ms: 120, off_ms: 80 });
  res.json(surveySaysStore.recordBuzz(req.params.teamId));
});

router.post('/faceoff/strike/:teamId', (req, res) => {
  piLed({ effect: 'flash', color: [255, 20, 0], flashes: 4, on_ms: 120, off_ms: 80 });
  res.json(surveySaysStore.recordFaceOffStrike(req.params.teamId));
});

router.post('/faceoff/resolve/:winnerTeamId', (req, res) => {
  res.json(surveySaysStore.resolveFaceOff(req.params.winnerTeamId));
});

router.post('/faceoff/reset-buzzers', (_req, res) => {
  res.json(surveySaysStore.resetBuzzersOnly());
});

// ─── Play or Pass ─────────────────────────────────────────────────────────────

router.post('/playorpass/:choice', (req, res) => {
  const choice = req.params.choice as 'play' | 'pass';
  if (choice !== 'play' && choice !== 'pass') {
    res.status(400).json({ error: 'choice must be play or pass' });
    return;
  }
  res.json(surveySaysStore.setPlayOrPass(choice));
});

// ─── Main Play ───────────────────────────────────────────────────────────────

router.post('/answer/reveal/:rank', (req, res) => {
  const rank = parseInt(req.params.rank, 10);
  if (isNaN(rank)) { res.status(400).json({ error: 'rank must be a number' }); return; }
  piLed({ effect: 'flash', color: [0, 255, 60], flashes: 3, on_ms: 150, off_ms: 80 });
  res.json(surveySaysStore.revealAnswer(rank));
});

router.post('/answer/reveal-post/:rank', (req, res) => {
  const rank = parseInt(req.params.rank, 10);
  if (isNaN(rank)) { res.status(400).json({ error: 'rank must be a number' }); return; }
  res.json(surveySaysStore.revealAnswerPostRound(rank));
});

router.post('/strike', (_req, res) => {
  piLed({ effect: 'flash', color: [255, 20, 0], flashes: 4, on_ms: 120, off_ms: 80 });
  res.json(surveySaysStore.addStrike());
});

// ─── Steal ───────────────────────────────────────────────────────────────────

router.post('/steal/team/:teamId', (req, res) => {
  const color = teamColor(req.params.teamId);
  piLed({ effect: 'marquee', color, speed_ms: 30 });
  res.json(surveySaysStore.setStealingTeam(req.params.teamId));
});

router.post('/steal/success/:rank', (req, res) => {
  const rank = parseInt(req.params.rank, 10);
  const { stealingTeamId } = surveySaysStore.getState().roundState;
  const color = teamColor(stealingTeamId ?? 'team-1');
  piLed({ effect: 'sparkle', color, density: 0.2, speed_ms: 30 });
  res.json(surveySaysStore.resolveSteal(true, isNaN(rank) ? undefined : rank));
});

router.post('/steal/fail', (_req, res) => {
  piLed({ effect: 'flash', color: [255, 20, 0], flashes: 3, on_ms: 120, off_ms: 80 });
  res.json(surveySaysStore.resolveSteal(false));
});

// ─── Round transitions ────────────────────────────────────────────────────────

router.post('/round/next', (_req, res) => {
  piLed({ effect: 'rainbow', speed_ms: 15, brightness: 0.9, duration_ms: 4000 });
  res.json(surveySaysStore.advanceRound());
});

router.post('/game/over', (_req, res) => {
  const state = surveySaysStore.getState();
  const winner = [...state.teams].sort((a, b) => b.score - a.score)[0];
  const color = teamColor(winner.id);
  piLed({ effect: 'sparkle', color, density: 0.2, speed_ms: 30 });
  res.json(surveySaysStore.setPhase('game_over'));
});

// ─── Saves ────────────────────────────────────────────────────────────────────

router.get('/saves', (_req, res) => {
  res.json(listSSSaves());
});

router.post('/saves', (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return; }
  const state = surveySaysStore.getState();
  res.json(createSSSave(name.trim(), state.boards, state.config));
});

router.post('/saves/:id/load', (req, res) => {
  const save = loadSSSave(req.params.id);
  if (!save) { res.status(404).json({ error: 'Save not found' }); return; }
  const state = surveySaysStore.setBoards(save.boards);
  if (save.config) surveySaysStore.updateConfig({ config: { ...state.config, ...save.config } });
  res.json(surveySaysStore.getState());
});

router.patch('/saves/:id/config', (req, res) => {
  const save = loadSSSave(req.params.id);
  if (!save) { res.status(404).json({ error: 'Save not found' }); return; }
  const patched = patchSSSaveConfig(save.id, surveySaysStore.getState().config);
  if (!patched) { res.status(500).json({ error: 'Failed to patch save' }); return; }
  res.json(patched);
});

router.delete('/saves/:id', (req, res) => {
  const ok = deleteSSSave(req.params.id);
  if (!ok) { res.status(404).json({ error: 'Save not found' }); return; }
  res.json({ ok: true });
});

export default router;
