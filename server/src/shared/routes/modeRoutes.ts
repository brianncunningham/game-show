import { Router } from 'express';
import { getActiveModeId, getRegisteredModes, switchMode } from '../services/modeRegistry.js';

const router = Router();

/** GET /api/mode — returns current active mode id + all registered modes */
router.get('/', (_req, res) => {
  res.json({
    activeModeId: getActiveModeId(),
    modes: getRegisteredModes().map((m) => ({ id: m.id, displayName: m.displayName })),
  });
});

/** POST /api/mode — switch active mode (confirm-reset is enforced by the client before calling) */
router.post('/', (req, res) => {
  const { modeId } = req.body as { modeId?: string };
  if (!modeId) {
    res.status(400).json({ error: 'modeId is required' });
    return;
  }
  const ok = switchMode(modeId);
  if (!ok) {
    res.status(404).json({ error: `Unknown mode: ${modeId}` });
    return;
  }
  res.json({ activeModeId: modeId });
});

export default router;
