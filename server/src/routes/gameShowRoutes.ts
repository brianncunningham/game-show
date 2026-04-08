import { Router } from 'express';
import { gameShowStore } from '../services/gameShowStore.js';
import { createSave, deleteSave, listSaves, loadSave } from '../services/gameSaveService.js';

const router = Router();

router.get('/state', (_req, res) => {
  res.json(gameShowStore.getState());
});

router.post('/start', (_req, res) => {
  res.json(gameShowStore.startGame());
});

router.post('/players/random-assign', (_req, res) => {
  res.json(gameShowStore.randomAssignPlayers());
});

router.post('/reset', (_req, res) => {
  res.json(gameShowStore.reset());
});

router.post('/scores/reset', (_req, res) => {
  res.json(gameShowStore.resetScores());
});

router.post('/question/:questionId/select', (req, res) => {
  res.json(gameShowStore.selectQuestion(req.params.questionId));
});

router.post('/song/:songIndex/select', (req, res) => {
  res.json(gameShowStore.selectSong(Number(req.params.songIndex)));
});

router.post('/buzz/:teamId', (req, res) => {
  res.json(gameShowStore.setBuzzWinner(req.params.teamId));
});

router.post('/answer/correct', (_req, res) => {
  res.json(gameShowStore.markCorrect());
});

router.post('/answer/artist-bonus', (_req, res) => {
  res.json(gameShowStore.awardArtistBonus());
});

router.post('/answer/wrong', (_req, res) => {
  res.json(gameShowStore.markWrong());
});

router.post('/steal/success', (_req, res) => {
  res.json(gameShowStore.resolveSteal(true));
});

router.post('/steal/fail', (_req, res) => {
  res.json(gameShowStore.resolveSteal(false));
});

router.post('/round/next', (_req, res) => {
  res.json(gameShowStore.nextRound());
});

router.post('/round/reset', (_req, res) => {
  res.json(gameShowStore.resetRound());
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
  res.json(gameShowStore.randomFirstPick());
});

router.post('/first-pick/dismiss', (_req, res) => {
  res.json(gameShowStore.dismissFirstPick());
});

router.post('/show-board', (_req, res) => {
  res.json(gameShowStore.showBoard());
});

router.post('/show-rules/on', (_req, res) => {
  res.json(gameShowStore.toggleShowRules(true));
});

router.post('/show-rules/off', (_req, res) => {
  res.json(gameShowStore.toggleShowRules(false));
});

router.post('/show-intro/on', (_req, res) => {
  res.json(gameShowStore.toggleShowIntro(true));
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
  res.json(gameShowStore.endGame(winnerTeamId));
});

router.put('/config', (req, res) => {
  res.json(gameShowStore.updateConfig(req.body));
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

export default router;
