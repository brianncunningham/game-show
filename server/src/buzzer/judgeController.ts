/**
 * Judge Controller — Phase 2
 *
 * Implements the buzzer state machine and accepts simulated buzz input.
 * Hardware-independent: future GPIO or network inputs call `receiveBuzz()`
 * through the same code path as simulation.
 *
 * State machine:
 *   IDLE   → ARMED   on arm()
 *   ARMED  → LOCKED  on first accepted receiveBuzz()
 *   LOCKED → IDLE    on reset()
 */

import type {
  JudgeState,
  JudgeToAppMessage,
  BuzzAcceptedPayload,
  BuzzRejectedPayload,
  BuzzReceivedPayload,
  StatePayload,
} from './types.js';
import { makeBuzzerMessage } from './types.js';

// ---------------------------------------------------------------------------
// Event listener type
// ---------------------------------------------------------------------------

/** Any consumer (app integration, diagnostics, tests) implements this. */
export type JudgeEventListener = (message: JudgeToAppMessage) => void;

// ---------------------------------------------------------------------------
// Judge Controller
// ---------------------------------------------------------------------------

export class JudgeController {
  private state: JudgeState = 'IDLE';
  private armedAt: number | null = null;
  private listeners: JudgeEventListener[] = [];

  // -------------------------------------------------------------------------
  // Public API — Commands (App → Judge)
  // -------------------------------------------------------------------------

  /** ARM: Transition from IDLE to ARMED. No-op if already ARMED. */
  arm(): void {
    if (this.state === 'ARMED') return;
    if (this.state === 'LOCKED') {
      console.warn('[Judge] ARM ignored — currently LOCKED, send RESET first');
      this.emitState();
      return;
    }
    this.state = 'ARMED';
    this.armedAt = Date.now();
    this.emit(makeBuzzerMessage('READY', undefined));
    this.emitState();
  }

  /** RESET: Return to IDLE from any state, clear lock. */
  reset(): void {
    this.state = 'IDLE';
    this.armedAt = null;
    this.emitState();
  }

  // -------------------------------------------------------------------------
  // Public API — Buzz Input (Simulation & future hardware)
  // -------------------------------------------------------------------------

  /**
   * receiveBuzz: Entry point for all buzz inputs regardless of source.
   * Simulation calls this directly. GPIO/network adapters will call this too.
   */
  receiveBuzz(controllerId: string): void {
    // Always emit BUZZ_RECEIVED so the event log captures every press.
    const received = makeBuzzerMessage<'BUZZ_RECEIVED', BuzzReceivedPayload>(
      'BUZZ_RECEIVED',
      { controllerId },
    );
    this.emit(received);

    if (this.state === 'ARMED') {
      const elapsedMs = this.armedAt !== null ? Date.now() - this.armedAt : 0;
      this.state = 'LOCKED';

      const accepted = makeBuzzerMessage<'BUZZ_ACCEPTED', BuzzAcceptedPayload>(
        'BUZZ_ACCEPTED',
        { controllerId, elapsedMs },
      );
      this.emit(accepted);
      this.emitState();
      return;
    }

    // Not ARMED — reject with reason.
    const reason: BuzzRejectedPayload['reason'] =
      this.state === 'LOCKED' ? 'ALREADY_LOCKED' : 'NOT_ARMED';

    const rejected = makeBuzzerMessage<'BUZZ_REJECTED', BuzzRejectedPayload>(
      'BUZZ_REJECTED',
      { controllerId, reason },
    );
    this.emit(rejected);
  }

  // -------------------------------------------------------------------------
  // Public API — Simulation convenience
  // -------------------------------------------------------------------------

  /** Simulate a buzz from a named controller. Identical to hardware input. */
  simulateBuzz(controllerId: string): void {
    console.log(`[Judge] Simulated buzz from: ${controllerId}`);
    this.receiveBuzz(controllerId);
  }

  // -------------------------------------------------------------------------
  // Public API — Introspection
  // -------------------------------------------------------------------------

  getState(): JudgeState {
    return this.state;
  }

  // -------------------------------------------------------------------------
  // Event listener management
  // -------------------------------------------------------------------------

  /** Subscribe to all judge events. Returns an unsubscribe function. */
  onEvent(listener: JudgeEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private emit(message: JudgeToAppMessage): void {
    console.log(`[Judge] → ${message.type}`, JSON.stringify(message.payload ?? {}));
    for (const listener of this.listeners) {
      listener(message);
    }
  }

  private emitState(): void {
    const stateMsg = makeBuzzerMessage<'STATE', StatePayload>(
      'STATE',
      { state: this.state },
    );
    this.emit(stateMsg);
  }
}

// ---------------------------------------------------------------------------
// Singleton export — one judge per server process
// ---------------------------------------------------------------------------

export const judgeController = new JudgeController();
