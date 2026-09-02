import { useEffect, useRef } from 'react';

const POLL_INTERVAL_MS = 60_000;

/**
 * Detects a server redeploy (a new `startedAt` from GET /api/build-info, which changes
 * every time the server process restarts — i.e. every deploy, since deploying always
 * ends in a pm2 restart) and force-reloads the page when it happens.
 *
 * Built for screens that get left open unattended for a whole event — the /show screens
 * above all. A SPA doesn't reload itself just because the server redeployed underneath
 * it; without this, a stale tab keeps running whatever JS bundle was loaded at the last
 * page load indefinitely, silently missing every fix/feature shipped since (this bit us
 * more than once while building TToTO's ID Please round — see
 * docs/ttoto-id-please-plan.md). Not wired into /host or /gameadmin: an abrupt reload
 * mid-action there is more disruptive than useful, and a host actively working the page
 * tends to refresh it themselves between games anyway.
 */
export function useAutoReloadOnNewBuild(): void {
  const startedAtRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/build-info');
        if (!res.ok || cancelled) return;
        const { startedAt } = await res.json() as { startedAt: string };
        if (cancelled) return;
        if (startedAtRef.current === null) {
          startedAtRef.current = startedAt;
        } else if (startedAtRef.current !== startedAt) {
          window.location.reload();
        }
      } catch {
        // Network hiccup or server mid-restart — try again next interval rather than
        // treating a single failed check as a signal either way.
      }
    };
    void check();
    const id = setInterval(() => { void check(); }, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
}
