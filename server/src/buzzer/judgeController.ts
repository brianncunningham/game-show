/**
 * Judge Controller — Protocol v2 (window-based)
 *
 * Implements the window-based buzzer state machine.
 * Hardware-independent: all input sources call receiveBuzz() identically.
 *
 * Window state machine:
 *   WAITING → ARMED   on armWindow()
 *   ARMED   → LOCKED  on first accepted receiveBuzz()
 *   any     → closed  on closeWindow() or reset()
 *
 * The judge holds at most one active window at a time.
 * The judge does NOT know game rules — the app decides which controllers are
 * eligible for each window and whether early buzzes should be penalised.
 *
 * To add a new input source:
 *   1. Create a file in server/src/buzzer/inputs/
 *   2. Import judgeController
 *   3. Call judgeController.receiveBuzz(controllerId) on input event
 */

import type {
  BuzzerWindow,
  WindowState,
  JudgeToAppMessage,
  BuzzAcceptedPayload,
  BuzzRejectedPayload,
  BuzzReceivedPayload,
  BuzzEarlyPayload,
  WindowStatePayload,
  WindowClosedPayload,
  BuzzRejectionReason,
} from './types.js';
import { makeBuzzerMessage } from './types.js';

// ---------------------------------------------------------------------------
// Event listener type
// ---------------------------------------------------------------------------

export type JudgeEventListener = (message: JudgeToAppMessage) => void;

// ---------------------------------------------------------------------------
// Internal window tracking
// ---------------------------------------------------------------------------

interface ActiveWindow extends BuzzerWindow {
  state: WindowState;
  armedAt: number | null;
}

// ---------------------------------------------------------------------------
// Judge Controller
// ---------------------------------------------------------------------------

export class JudgeController {
  private window: ActiveWindow | null = null;
  private listeners: JudgeEventListener[] = [];

  // -------------------------------------------------------------------------
  // Public API — App → Judge commands
  // -------------------------------------------------------------------------

  /**
   * OPEN_WINDOW — create a new buzzing opportunity.
   * Closes any existing window first.
   * The window starts in WAITING state (not yet armed).
   */
  openWindow(def: BuzzerWindow): void {
    if (this.window) {
      console.warn(`[Judge] openWindow — closing existing window '${this.window.windowId}' first`);
      this.emitWindowClosed(this.window.windowId);
    }
    this.window = { ...def, state: 'WAITING', armedAt: null };
    console.log(`[Judge] Window opened: '${def.windowId}' eligibleControllers=[${def.eligibleControllers.join(',')}] earlyBuzzPenalty=${def.earlyBuzzPenalty}`);
    this.emitWindowState();
  }

  /**
   * ARM_WINDOW — transition the active window WAITING → ARMED.
   * The song has resumed; valid buzzes from eligible controllers are now accepted.
   */
  armWindow(windowId: string): void {
    if (!this.window) {
      console.warn(`[Judge] armWindow '${windowId}' — no active window`);
      return;
    }
    if (this.window.windowId !== windowId) {
      console.warn(`[Judge] armWindow '${windowId}' — mismatch with active window '${this.window.windowId}'`);
      return;
    }
    if (this.window.state === 'ARMED') return;
    if (this.window.state === 'LOCKED') {
      console.warn(`[Judge] armWindow '${windowId}' — window is LOCKED, send CLOSE_WINDOW first`);
      return;
    }
    this.window.state = 'ARMED';
    this.window.armedAt = Date.now();
    this.emit(makeBuzzerMessage('READY', undefined));
    this.emitWindowState();
  }

  /**
   * CLOSE_WINDOW — close the active window without a winner.
   * Use when a round ends with no valid buzz, or to prepare for a steal window.
   */
  closeWindow(windowId: string): void {
    if (!this.window || this.window.windowId !== windowId) {
      console.warn(`[Judge] closeWindow '${windowId}' — no matching active window`);
      return;
    }
    this.emitWindowClosed(windowId);
    this.window = null;
    this.emitWindowState();
  }

  /**
   * RESET — hard reset. Closes any active window and returns to clean idle.
   * Use between songs or on host abort.
   */
  reset(): void {
    if (this.window) {
      this.emitWindowClosed(this.window.windowId);
      this.window = null;
    }
    this.emit(makeBuzzerMessage('RESET', undefined));
    this.emitWindowState();
  }

  // -------------------------------------------------------------------------
  // Public API — Buzz Input (Simulation & future hardware)
  // -------------------------------------------------------------------------

  /**
   * receiveBuzz — single entry point for ALL buzz inputs, regardless of source.
   *
   * Decision logic:
   *   1. Always emit BUZZ_RECEIVED (raw event log).
   *   2. No active window → reject DISABLED.
   *   3. Eligibility check (if eligibleControllers is non-empty) → reject INELIGIBLE.
   *   4. Window WAITING + earlyBuzzPenalty → emit BUZZ_EARLY (app handles penalty).
   *   5. Window WAITING, no penalty → reject NOT_ARMED.
   *   6. Window LOCKED → reject LOCKED.
   *   7. Window ARMED → accept, lock window, emit BUZZ_ACCEPTED.
   */
  receiveBuzz(controllerId: string): void {
    const win = this.window;

    // Always emit raw received event.
    this.emit(makeBuzzerMessage<'BUZZ_RECEIVED', BuzzReceivedPayload>(
      'BUZZ_RECEIVED',
      { windowId: win?.windowId ?? null, controllerId },
    ));

    // No window open.
    if (!win) {
      this.reject(controllerId, null, 'DISABLED');
      return;
    }

    // Eligibility check.
    if (win.eligibleControllers.length > 0 && !win.eligibleControllers.includes(controllerId)) {
      this.reject(controllerId, win.windowId, 'INELIGIBLE');
      return;
    }

    // Window not yet armed.
    if (win.state === 'WAITING') {
      if (win.earlyBuzzPenalty) {
        this.emit(makeBuzzerMessage<'BUZZ_EARLY', BuzzEarlyPayload>(
          'BUZZ_EARLY',
          { windowId: win.windowId, controllerId },
        ));
      } else {
        this.reject(controllerId, win.windowId, 'NOT_ARMED');
      }
      return;
    }

    // Already locked.
    if (win.state === 'LOCKED') {
      this.reject(controllerId, win.windowId, 'LOCKED');
      return;
    }

    // ARMED — accept.
    const elapsedMs = win.armedAt !== null ? Date.now() - win.armedAt : 0;
    win.state = 'LOCKED';

    this.emit(makeBuzzerMessage<'BUZZ_ACCEPTED', BuzzAcceptedPayload>(
      'BUZZ_ACCEPTED',
      { windowId: win.windowId, controllerId, elapsedMs },
    ));
    this.emitWindowState();
  }

  // -------------------------------------------------------------------------
  // Public API — Simulation convenience
  // -------------------------------------------------------------------------

  simulateBuzz(controllerId: string): void {
    console.log(`[Judge] Simulated buzz from: ${controllerId}`);
    this.receiveBuzz(controllerId);
  }

  /**
   * TEAM_FAILED — notify the LED pico that a team answered wrong.
   * Pass the controller IDs belonging to the failed team.
   */
  notifyTeamFailed(controllerIds: string[]): void {
    if (controllerIds.length === 0) return;
    this.emit(makeBuzzerMessage<'TEAM_FAILED', { controllerIds: string[] }>(
      'TEAM_FAILED',
      { controllerIds },
    ));
  }

  // -------------------------------------------------------------------------
  // Public API — Introspection
  // -------------------------------------------------------------------------

  getWindowState(): { windowId: string | null; windowState: WindowState | 'IDLE' } {
    if (!this.window) return { windowId: null, windowState: 'IDLE' };
    return { windowId: this.window.windowId, windowState: this.window.state };
  }

  /** @deprecated use getWindowState() */
  getState(): 'IDLE' | 'ARMED' | 'LOCKED' {
    if (!this.window) return 'IDLE';
    if (this.window.state === 'WAITING') return 'IDLE';
    return this.window.state;
  }

  // -------------------------------------------------------------------------
  // Event listener management
  // -------------------------------------------------------------------------

  onEvent(listener: JudgeEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private reject(controllerId: string, windowId: string | null, reason: BuzzRejectionReason): void {
    this.emit(makeBuzzerMessage<'BUZZ_REJECTED', BuzzRejectedPayload>(
      'BUZZ_REJECTED',
      { windowId, controllerId, reason },
    ));
  }

  private emitWindowClosed(windowId: string): void {
    this.emit(makeBuzzerMessage<'WINDOW_CLOSED', WindowClosedPayload>(
      'WINDOW_CLOSED',
      { windowId },
    ));
  }

  private emitWindowState(): void {
    const { windowId, windowState } = this.getWindowState();
    const eligibleControllers = this.window?.eligibleControllers;
    const isSteal = (eligibleControllers?.length ?? 0) > 0;
    this.emit(makeBuzzerMessage<'WINDOW_STATE', WindowStatePayload>(
      'WINDOW_STATE',
      { windowId, windowState, ...(eligibleControllers?.length ? { eligibleControllers } : {}), isSteal },
    ));
  }

  private emit(message: JudgeToAppMessage): void {
    console.log(`[Judge] → ${message.type}`, JSON.stringify(message.payload ?? {}));
    for (const listener of this.listeners) {
      listener(message);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export — one judge per server process
// ---------------------------------------------------------------------------

export const judgeController = new JudgeController();
