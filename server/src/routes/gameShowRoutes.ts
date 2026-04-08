import { Router } from 'express';
import { gameShowStore } from '../services/gameShowStore';

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

router.post('/buzz/:teamId', (req, res) => {
  res.json(gameShowStore.setBuzzWinner(req.params.teamId));
});

router.post('/answer/correct', (_req, res) => {
  res.json(gameShowStore.markCorrect());
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

router.put('/config', (req, res) => {
  res.json(gameShowStore.updateConfig(req.body));
});

router.patch('/state', (req, res) => {
  res.json(gameShowStore.patch(req.body));
});

export default router;
