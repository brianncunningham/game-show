import { Router } from 'express';
import { judgeController } from '../buzzer/judgeController.js';

const router = Router();

/** ARM the judge — transition IDLE → ARMED */
router.post('/arm', (_req, res) => {
  judgeController.arm();
  res.json({ state: judgeController.getState() });
});

/** RESET the judge — any state → IDLE */
router.post('/reset', (_req, res) => {
  judgeController.reset();
  res.json({ state: judgeController.getState() });
});

/** GET current judge state */
router.get('/state', (_req, res) => {
  res.json({ state: judgeController.getState() });
});

/** Simulate a buzz from a named controllerId (dev/diagnostics only) */
router.post('/simulate/:controllerId', (req, res) => {
  judgeController.simulateBuzz(req.params.controllerId);
  res.json({ state: judgeController.getState() });
});

export default router;
