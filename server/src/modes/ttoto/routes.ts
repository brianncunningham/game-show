import { Router } from 'express';
import { request as httpRequest } from 'http';
import { ttotoStore } from './store.js';
import {
  createTToTOSave, deleteTToTOSave, listTToTOSaves, loadTToTOSave, updateTToTOSave,
} from './saveService.js';
import { sendToPico } from '../../shared/buzzer/inputs/hardwareInput.js';
import { judgeController } from '../../shared/buzzer/judgeController.js';
import { addKnownPlayers, deleteKnownPlayer, listKnownPlayers } from '../../shared/services/knownPlayersService.js';
import type { TToTOConfig, TToTOChoiceKey, TToTORound, TToTOTeam } from './types.js';

const router = Router();

// ─── Hardware wand buzzer (Phase 2) ───────────────────────────────────────────
// Mirrors Survey Says's routes.ts pattern (same judgeController, same Pi/VPS relay
// helpers, duplicated locally rather than shared since each mode's routes.ts already
// does the same). One wand per PLAYER (config.buzzerMode === 'hardware-player'),
// looked up via controllerAssignments — see store.ts's buildControllerAssignments.

// When running as hardware relay on Pi (HARDWARE_INPUT=1), this process is a dumb judge
// only. All game logic (LEDs, recordBuzz) must run via the VPS sniffer to avoid double-firing.
const IS_PI = process.env['HARDWARE_INPUT'] === '1';

const ARMED_WINDOW_ID = 'ttoto-armed';
const WAND_TEST_WINDOW_ID = 'ttoto-wand-test';

// TTOTO_COLORS.team1/team2 from src/modes/ttoto/colors.ts, duplicated here (server has no
// import path into client src) — keep these in sync if the client palette changes.
const TEAM_COLORS: Record<string, number[]> = {
  'team-1': [59, 130, 246],   // blue
  'team-2': [236, 72, 153],   // magenta/pink
};
const teamColor = (teamId: string): number[] => TEAM_COLORS[teamId] ?? [255, 255, 255];

/** Maps a hardware controller press to its team, via controllerAssignments. */
function teamIdForController(controllerId: string): string | undefined {
  const { controllerAssignments } = ttotoStore.getState();
  return controllerAssignments.find(a => a.controllerId === controllerId)?.teamId;
}

/**
 * Every controller belonging to one of the given teams, MINUS anyone already in
 * attemptedControllerIds for the current question — this is what makes the per-player
 * steal lockout actually bite: a team isn't excluded as a whole, just the specific wand
 * that already buzzed in and missed this question. Passing all team IDs (both teams) is
 * how "open to both teams" ends up meaning "both teams' remaining players", not literally
 * everyone including whoever just missed.
 */
function eligibleControllersForTeams(teamIds: string[]): string[] {
  const { controllerAssignments, roundState } = ttotoStore.getState();
  const attempted = new Set(roundState.attemptedControllerIds);
  return controllerAssignments
    .filter(a => teamIds.includes(a.teamId) && !attempted.has(a.controllerId))
    .map(a => a.controllerId);
}

function allTeamIds(): string[] {
  return ttotoStore.getState().teams.map(t => t.id);
}

/**
 * Relay a buzzer command to the Pi's judge over HTTP. Awaits the response and retries
 * once on failure (network hiccup / Pi busy). No-op (resolves true) when not running
 * behind a JUDGE_URL relay (local dev/simulation — the judge runs in this same process).
 */
function piJudge(path: string, body: Record<string, unknown>, attempt = 1): Promise<boolean> {
  const judgeUrl = process.env['JUDGE_URL'];
  if (!judgeUrl) return Promise.resolve(true);

  const attemptOnce = (): Promise<boolean> => new Promise((resolve) => {
    try {
      const u = new URL(judgeUrl);
      const bodyStr = JSON.stringify(body);
      const req = httpRequest({
        hostname: u.hostname,
        port: Number(u.port) || 3001,
        path: `/api/buzzer/${path}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) },
        timeout: 2000,
      }, (res) => {
        res.resume();
        resolve((res.statusCode ?? 500) < 400);
      });
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', (err) => {
        console.warn(`[TToTO] piJudge ${path} (attempt ${attempt}) failed: ${err.message}`);
        resolve(false);
      });
      req.write(bodyStr);
      req.end();
    } catch (err) {
      console.warn(`[TToTO] piJudge ${path} (attempt ${attempt}) threw: ${(err as Error).message}`);
      resolve(false);
    }
  });

  return attemptOnce().then(async (ok) => {
    if (ok) return true;
    if (attempt < 2) return piJudge(path, body, attempt + 1);
    console.error(`[TToTO] piJudge ${path} FAILED after ${attempt} attempts — hardware buzzers may not be armed! body=${JSON.stringify(body)}`);
    return false;
  });
}

/**
 * Open+arm the shared ARMED_WINDOW_ID with the given eligibility and relay it to the Pi.
 * Callers pass the actual computed list of eligible controller IDs (e.g. from
 * eligibleControllersForTeams) — never an empty array to mean "everyone", since
 * judgeController treats [] as "no restriction" (see BuzzerWindow.eligibleControllers'
 * docs), which would be actively wrong here: an empty result from our per-player
 * exclusion logic means nobody legitimately remains, not "let anyone buzz". If that
 * happens (only possible with a badly misconfigured roster — e.g. a team with zero
 * players assigned), skip opening a window at all rather than silently opening it to
 * everyone.
 */
function openHardwareWindow(eligibleControllers: string[]): void {
  if (eligibleControllers.length === 0) {
    console.warn('[TToTO] openHardwareWindow: no eligible controllers (check team rosters) — not opening a window');
    return;
  }
  judgeController.openWindow({ windowId: ARMED_WINDOW_ID, eligibleControllers, earlyBuzzPenalty: false });
  judgeController.armWindow(ARMED_WINDOW_ID);
  void piJudge('open-window', { windowId: ARMED_WINDOW_ID, eligibleControllers, earlyBuzzPenalty: false });
  void piJudge('arm-window', { windowId: ARMED_WINDOW_ID });
}

// TIMED_WINDOW steal: the exclusive-stage countdown. A real timer (not lazily computed on
// read) because the judge window's eligibility has to flip at the actual moment the
// window expires, independent of how often any client happens to be polling. Cleared
// defensively by every route that could otherwise leave it dangling (a stray fire after
// the round has already moved on would incorrectly re-open a hardware window).
let stealTimer: ReturnType<typeof setTimeout> | null = null;
function clearStealTimer(): void {
  if (stealTimer) { clearTimeout(stealTimer); stealTimer = null; }
}

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

/** BUZZ_ACCEPTED on the live 'armed' window — auto-record the buzz and close the window
 * immediately so any further presses this cycle get DISABLED rather than LOCKED (no
 * confusing red flash on the Pico for teammates pressing again after the winner). Also
 * doubles as the TIMED_WINDOW steal buzz handler (same window ID, distinguished by the
 * current phase) — a steal buzz cancels the exclusive-stage countdown outright. */
function handleArmedBuzz(controllerId: string): void {
  const teamId = teamIdForController(controllerId);
  if (!teamId) {
    console.warn(`[TToTO] BUZZ_ACCEPTED on ${ARMED_WINDOW_ID}: no team for controller ${controllerId}`);
    return;
  }
  const isSteal = ttotoStore.getState().roundState.phase === 'steal_armed';
  console.log(`[TToTO] Auto-recording ${isSteal ? 'steal ' : ''}buzz: controller ${controllerId} -> team ${teamId}`);
  piLed({ effect: 'flash', color: teamColor(teamId), flashes: 3, on_ms: 120, off_ms: 80 });
  if (isSteal) {
    clearStealTimer();
    ttotoStore.recordStealBuzz(teamId, controllerId);
  } else {
    ttotoStore.recordBuzz(teamId, controllerId);
  }
  judgeController.closeWindow(ARMED_WINDOW_ID);
  void piJudge('close-window', { windowId: ARMED_WINDOW_ID });
}

/** BUZZ_ACCEPTED on the wand-test window — LED-only feedback, no game-state change. A
 * judge window can only have one winner (ARMED -> LOCKED), so to let a host test every
 * wand repeatedly (not just once total), immediately close and re-open+re-arm a fresh
 * window after each press. No per-player exclusion here — a wand test isn't a real
 * question, every assigned controller should always be testable. */
function handleWandTestBuzz(controllerId: string): void {
  const teamId = teamIdForController(controllerId);
  if (teamId) piLed({ effect: 'flash', color: teamColor(teamId), flashes: 2, on_ms: 150, off_ms: 80 });
  const allControllers = ttotoStore.getState().controllerAssignments.map(a => a.controllerId);
  judgeController.closeWindow(WAND_TEST_WINDOW_ID);
  if (allControllers.length === 0) return;
  judgeController.openWindow({ windowId: WAND_TEST_WINDOW_ID, eligibleControllers: allControllers, earlyBuzzPenalty: false });
  judgeController.armWindow(WAND_TEST_WINDOW_ID);
}

/**
 * Single entry point for a BUZZ_ACCEPTED event, regardless of source:
 *  - Local/simulated (no JUDGE_URL): the judgeController.onEvent() listener below calls
 *    this directly, since the judge runs in this same process.
 *  - Real deployed hardware (Pi + VPS split, JUDGE_URL set): the Pi only relays raw
 *    buzzes — it doesn't run game logic (see IS_PI below) — so the VPS's "PiSniffer"
 *    (server/src/index.ts) imports and calls this exported function directly with the
 *    event it received over the Pi's /ws/buzzer socket. Mirrors Survey Says's exported
 *    handlePiBuzzAccepted for the same reason.
 */
export function handlePiBuzzAccepted(windowId: string | null, controllerId: string): void {
  if (windowId === WAND_TEST_WINDOW_ID) handleWandTestBuzz(controllerId);
  else if (windowId === ARMED_WINDOW_ID) handleArmedBuzz(controllerId);
}

judgeController.onEvent((event) => {
  if (IS_PI) return; // Pi is a dumb relay — VPS sniffer handles game logic
  if (event.type !== 'BUZZ_ACCEPTED') return;
  const { windowId, controllerId } = event.payload as { windowId: string | null; controllerId: string };
  handlePiBuzzAccepted(windowId, controllerId);
});

// ─── State ───────────────────────────────────────────────────────────────────

router.get('/state', (_req, res) => {
  res.json(ttotoStore.getState());
});

router.post('/reset', (_req, res) => {
  clearStealTimer();
  res.json(ttotoStore.reset());
});

router.post('/undo', (_req, res) => {
  clearStealTimer();
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

// ─── Players (hardware-player mode rosters) ───────────────────────────────────

router.patch('/player-pool', (req, res) => {
  const { pool } = req.body as { pool?: unknown[] };
  if (!Array.isArray(pool)) { res.status(400).json({ error: 'pool array required' }); return; }
  res.json(ttotoStore.setPlayerPool(pool as string[]));
});

router.patch('/teams/rosters', (req, res) => {
  const { teams } = req.body as { teams?: unknown[] };
  if (!Array.isArray(teams)) { res.status(400).json({ error: 'teams array required' }); return; }
  res.json(ttotoStore.setTeams(teams as TToTOTeam[]));
});

router.post('/teams/random-assign', (_req, res) => {
  res.json(ttotoStore.randomAssignPlayers());
});

// Shared cross-mode name pool (same known-players.json file NTT/Survey Says already use)
// — a host who's already typed player names into another mode this session shouldn't
// have to retype them here.
router.get('/known-players', (_req, res) => {
  res.json(listKnownPlayers());
});

router.post('/known-players', (req, res) => {
  const { names } = req.body as { names?: string[] };
  if (!Array.isArray(names)) { res.status(400).json({ error: 'names array required' }); return; }
  res.json(addKnownPlayers(names));
});

router.delete('/known-players/:name', (req, res) => {
  res.json(deleteKnownPlayer(decodeURIComponent(req.params.name)));
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
  clearStealTimer();
  res.json(ttotoStore.beginRound());
});

router.post('/reveal-choices', (_req, res) => {
  const state = ttotoStore.revealChoices();
  // Buzzers go live the instant choices are revealed — there's no "waiting for the song
  // to resume" concept here the way NTT has, so open the window already armed.
  if (state.config.buzzerMode === 'hardware-player') {
    const eligible = eligibleControllersForTeams(allTeamIds());
    if (state.config.earlyBuzzPenalty === 'lockout') {
      if (eligible.length > 0) {
        judgeController.openWindow({ windowId: ARMED_WINDOW_ID, eligibleControllers: eligible, earlyBuzzPenalty: true });
        judgeController.armWindow(ARMED_WINDOW_ID);
        void piJudge('open-window', { windowId: ARMED_WINDOW_ID, eligibleControllers: eligible, earlyBuzzPenalty: true });
        void piJudge('arm-window', { windowId: ARMED_WINDOW_ID });
      }
    } else {
      openHardwareWindow(eligible);
    }
  }
  res.json(state);
});

router.post('/buzz/:teamId', (req, res) => {
  // Manual host override always works, hardware mode or not — including as a fallback if
  // hardware misbehaves mid steal-window (TIMED_WINDOW is hardware-only by design, but a
  // stuck window shouldn't be able to strand a live game with no way to resolve it).
  // Close any live hardware window first so a stray wand press right after doesn't also
  // fire recordBuzz, and cancel any pending steal-window timer so it can't fire later
  // against a stale round.
  clearStealTimer();
  judgeController.closeWindow(ARMED_WINDOW_ID);
  void piJudge('close-window', { windowId: ARMED_WINDOW_ID });
  const isSteal = ttotoStore.getState().roundState.phase === 'steal_armed';
  res.json(isSteal ? ttotoStore.recordStealBuzz(req.params.teamId) : ttotoStore.recordBuzz(req.params.teamId));
});

router.post('/judge', (req, res) => {
  const { choice } = req.body as { choice?: TToTOChoiceKey };
  if (!choice || !['this', 'that', 'the_other'].includes(choice)) {
    res.status(400).json({ error: 'choice must be this | that | the_other' });
    return;
  }
  clearStealTimer();
  const state = ttotoStore.judge(choice);

  // TIMED_WINDOW steal just started: open the exclusive-stage hardware window (every
  // controller on the other team, minus anyone already excluded) and schedule the
  // expansion-to-both once stealWindowSecs elapses.
  if (state.roundState.phase === 'steal_armed' && state.roundState.stealEligibleTeamId) {
    openHardwareWindow(eligibleControllersForTeams([state.roundState.stealEligibleTeamId]));
    const waitMs = Math.max(0, (state.roundState.stealWindowExpiresAt ?? Date.now()) - Date.now());
    stealTimer = setTimeout(() => {
      stealTimer = null;
      const expanded = ttotoStore.expandStealWindow();
      // Guard: only re-open if still waiting (a buzz could have landed between the
      // timer firing and this callback running, vanishingly unlikely but cheap to check).
      if (expanded.roundState.phase === 'steal_armed' && expanded.roundState.stealWindowOpen) {
        // Both teams' remaining (non-excluded) players — see eligibleControllersForTeams.
        openHardwareWindow(eligibleControllersForTeams(allTeamIds()));
      }
    }, waitMs);
  }

  res.json(state);
});

router.post('/next', (_req, res) => {
  clearStealTimer();
  res.json(ttotoStore.next());
});

router.post('/game/new', (_req, res) => {
  clearStealTimer();
  res.json(ttotoStore.newGame());
});

router.post('/game/end', (_req, res) => {
  clearStealTimer();
  res.json(ttotoStore.endGame());
});

// ─── Wand test (Phase 2 hardware) ─────────────────────────────────────────────

router.post('/wand-test/show', (_req, res) => {
  // Must be armed, not just opened — a WAITING window with earlyBuzzPenalty:false always
  // rejects NOT_ARMED and never fires BUZZ_ACCEPTED (see judgeController.receiveBuzz), so
  // an unarmed "wand test" window would never actually trigger the LED flash below.
  const allControllers = ttotoStore.getState().controllerAssignments.map(a => a.controllerId);
  if (allControllers.length > 0) {
    judgeController.openWindow({ windowId: WAND_TEST_WINDOW_ID, eligibleControllers: allControllers, earlyBuzzPenalty: false });
    judgeController.armWindow(WAND_TEST_WINDOW_ID);
    void piJudge('open-window', { windowId: WAND_TEST_WINDOW_ID, eligibleControllers: allControllers, earlyBuzzPenalty: false });
    void piJudge('arm-window', { windowId: WAND_TEST_WINDOW_ID });
  }
  res.json(ttotoStore.showWandTest());
});

router.post('/wand-test/hide', (_req, res) => {
  judgeController.closeWindow(WAND_TEST_WINDOW_ID);
  void piJudge('close-window', { windowId: WAND_TEST_WINDOW_ID });
  res.json(ttotoStore.hideWandTest());
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
