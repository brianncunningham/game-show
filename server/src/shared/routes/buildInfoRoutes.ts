import { Router } from 'express';

// Captured once, at module load — i.e. once per server process start, which happens on
// every deploy (the deploy workflow always ends in a pm2 restart). Good enough as a
// "did the server just redeploy underneath me" signal without needing to read git/build
// metadata: any client that fetched this before the restart will see a different value
// after it. See src/shared/hooks/useAutoReloadOnNewBuild.ts for the client half.
const STARTED_AT = new Date().toISOString();

const router = Router();

/** GET /api/build-info — the running server's start time, for client-side stale-tab detection. */
router.get('/', (_req, res) => {
  res.json({ startedAt: STARTED_AT });
});

export default router;
