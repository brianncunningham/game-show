import type { Router } from 'express';
import type { JudgeController } from '../buzzer/judgeController.js';

/**
 * Contract that every game mode must implement.
 * The server registers modes at startup; all routing and socket
 * handling is delegated to the active mode's implementation.
 */
export interface GameModeServer {
  /** Stable identifier, e.g. 'ntt', 'feud' */
  id: string;
  /** Human-readable name shown in admin UI */
  displayName: string;
  /**
   * Mount all HTTP routes for this mode.
   * Called once at startup for every registered mode.
   * Routes should be mounted relative to /api/game-show — the server
   * passes a pre-prefixed router.
   */
  mountRoutes(router: Router, judge: JudgeController): void;
  /**
   * Called when this mode becomes active (on server start if persisted,
   * or when the admin switches to this mode).
   * Use to re-attach socket listeners, re-broadcast initial state, etc.
   */
  onActivate(): void;
  /**
   * Called when this mode is deactivated (admin switches away).
   * Use to clean up timers, subscriptions, etc.
   */
  onDeactivate(): void;
  /**
   * Full reset of this mode's game state back to defaults.
   * Called when admin confirms a mode switch or explicit reset.
   */
  reset(): void;
}
