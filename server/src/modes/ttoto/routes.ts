import { Router } from 'express';
import { ttotoStore } from './store.js';
import {
  createTToTOSave, deleteTToTOSave, listTToTOSaves, loadTToTOSave, updateTToTOSave,
} from './saveService.js';
import type { TToTOConfig, TToTOChoiceKey, TToTORound } from './types.js';

const router = Router();

// ─── State ───────────────────────────────────────────────────────────────────

router.get('/state', (_req, res) => {
  res.json(ttotoStore.getState());
});

router.post('/reset', (_req, res) => {
  res.json(ttotoStore.reset());
});

router.post('/undo', (_req, res) => {
  res.json(ttotoStore.undo());
});

// ─── Config / teams ──────────────────────────────────────────────────────────

router.patch('/config', (req, res) => {
  res.json(ttotoStore.updateConfig(req.body as Partial<TToTOConfig>));
});

router.patch('/teams/:teamId/name', (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return; }
  res.json(ttotoStore.setTeamName(req.params.teamId, name.trim()));
});

router.post('/teams/:teamId/score/adjust', (req, res) => {
  const { delta } = req.body as { delta?: number };
  if (typeof delta !== 'number') { res.status(400).json({ error: 'delta required' }); return; }
  res.json(ttotoStore.adjustScore(req.params.teamId, delta));
});

// ─── Content ─────────────────────────────────────────────────────────────────

router.post('/rounds', (req, res) => {
  const { rounds } = req.body as { rounds?: unknown[] };
  if (!Array.isArray(rounds)) { res.status(400).json({ error: 'rounds array required' }); return; }
  res.json(ttotoStore.setRounds(rounds as TToTORound[]));
});

// ─── Intro ───────────────────────────────────────────────────────────────────

router.post('/intro/show', (_req, res) => {
  res.json(ttotoStore.setShowIntro(true));
});

router.post('/intro/hide', (_req, res) => {
  res.json(ttotoStore.setShowIntro(false));
});

// ─── Round/question flow ─────────────────────────────────────────────────────

router.post('/game/start', (_req, res) => {
  res.json(ttotoStore.startGame());
});

router.post('/round/begin', (_req, res) => {
  res.json(ttotoStore.beginRound());
});

router.post('/reveal-choices', (_req, res) => {
  res.json(ttotoStore.revealChoices());
});

router.post('/buzz/:teamId', (req, res) => {
  res.json(ttotoStore.recordBuzz(req.params.teamId));
});

router.post('/judge', (req, res) => {
  const { choice } = req.body as { choice?: TToTOChoiceKey };
  if (!choice || !['this', 'that', 'the_other'].includes(choice)) {
    res.status(400).json({ error: 'choice must be this | that | the_other' });
    return;
  }
  res.json(ttotoStore.judge(choice));
});

router.post('/next', (_req, res) => {
  res.json(ttotoStore.next());
});

router.post('/game/new', (_req, res) => {
  res.json(ttotoStore.newGame());
});

router.post('/game/end', (_req, res) => {
  res.json(ttotoStore.endGame());
});

// ─── Saves ───────────────────────────────────────────────────────────────────

router.get('/saves', (_req, res) => {
  res.json(listTToTOSaves());
});

router.post('/saves', (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return; }
  const state = ttotoStore.getState();
  res.json(createTToTOSave(name.trim(), state.rounds, state.config));
});

router.post('/saves/:id/load', (req, res) => {
  const save = loadTToTOSave(req.params.id);
  if (!save) { res.status(404).json({ error: 'Save not found' }); return; }
  const state = ttotoStore.setRounds(save.rounds);
  if (save.config) ttotoStore.updateConfig({ ...state.config, ...save.config });
  // Loading a game always starts fresh: scores 0, idle.
  res.json(ttotoStore.newGame());
});

router.patch('/saves/:id', (req, res) => {
  const state = ttotoStore.getState();
  const updated = updateTToTOSave(req.params.id, state.rounds, state.config);
  if (!updated) { res.status(404).json({ error: 'Save not found' }); return; }
  res.json(updated);
});

router.delete('/saves/:id', (req, res) => {
  const ok = deleteTToTOSave(req.params.id);
  if (!ok) { res.status(404).json({ error: 'Save not found' }); return; }
  res.json({ ok: true });
});

export default router;
