import { Router } from 'express';
import { judgeController } from '../buzzer/judgeController.js';
import { simulateInput } from '../buzzer/inputs/simulationInput.js';
import type { BuzzerWindow } from '../buzzer/types.js';

const router = Router();

// ---------------------------------------------------------------------------
// Window-based commands (Protocol v2)
// ---------------------------------------------------------------------------

/**
 * POST /open-window
 * Body: { windowId, eligibleControllers, earlyBuzzPenalty }
 * Opens a new buzzing window in WAITING state (not yet armed).
 * Any existing window is closed first.
 */
router.post('/open-window', (req, res) => {
  const { windowId, eligibleControllers, earlyBuzzPenalty } = req.body as Partial<BuzzerWindow>;
  if (!windowId || !Array.isArray(eligibleControllers) || typeof earlyBuzzPenalty !== 'boolean') {
    res.status(400).json({ error: 'windowId (string), eligibleControllers (array), earlyBuzzPenalty (boolean) required' });
    return;
  }
  judgeController.openWindow({ windowId, eligibleControllers, earlyBuzzPenalty });
  res.json(judgeController.getWindowState());
});

/**
 * POST /arm-window
 * Body: { windowId }
 * Arms the active window — WAITING → ARMED.
 * Valid buzzes from eligible controllers are now accepted.
 */
router.post('/arm-window', (req, res) => {
  const { windowId } = req.body as { windowId?: string };
  if (!windowId) {
    res.status(400).json({ error: 'windowId required' });
    return;
  }
  judgeController.armWindow(windowId);
  res.json(judgeController.getWindowState());
});

/**
 * POST /close-window
 * Body: { windowId }
 * Closes the active window without a winner.
 * Use before opening a steal window or when a round ends with no buzz.
 */
router.post('/close-window', (req, res) => {
  const { windowId } = req.body as { windowId?: string };
  if (!windowId) {
    res.status(400).json({ error: 'windowId required' });
    return;
  }
  judgeController.closeWindow(windowId);
  res.json(judgeController.getWindowState());
});

/**
 * POST /reset
 * Hard reset — closes any active window and returns to clean idle.
 * Use between songs or on host abort.
 */
router.post('/reset', (_req, res) => {
  judgeController.reset();
  res.json(judgeController.getWindowState());
});

/**
 * GET /state
 * Returns current window state.
 */
router.get('/state', (_req, res) => {
  res.json(judgeController.getWindowState());
});

// ---------------------------------------------------------------------------
// Simulation (dev / diagnostics only)
// ---------------------------------------------------------------------------

/** POST /simulate/:controllerId — inject a buzz as if from hardware */
router.post('/simulate/:controllerId', (req, res) => {
  simulateInput(req.params.controllerId);
  res.json(judgeController.getWindowState());
});

// ---------------------------------------------------------------------------
// Legacy shims — keep old ARM endpoint working during diagnostics migration
// ---------------------------------------------------------------------------

/**
 * @deprecated Use /open-window + /arm-window instead.
 * Opens a catch-all window and immediately arms it, matching old behaviour.
 */
router.post('/arm', (_req, res) => {
  judgeController.openWindow({ windowId: 'legacy-arm', eligibleControllers: [], earlyBuzzPenalty: false });
  judgeController.armWindow('legacy-arm');
  res.json(judgeController.getWindowState());
});

export default router;
