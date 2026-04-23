/**
 * Buzzer protocol types — server copy.
 *
 * Canonical source: shared/buzzer/types.ts
 * Duplicated here because server tsconfig rootDir is `src/` only, which
 * prevents direct imports from outside that tree. Keep in sync with the
 * shared version manually until path-alias or monorepo tooling is added.
 *
 * Protocol version: 2 (window-based)
 *
 * Key concepts:
 *
 * BuzzerWindow — a single buzzing opportunity scoped to one song/steal round.
 *   - windowId:           stable string id assigned by the app, included in all events
 *   - eligibleControllers: the controllers allowed to buzz in this window;
 *                          empty array = all controllers eligible
 *   - earlyBuzzPenalty:   if true, buzzes arriving before the window is armed
 *                         are emitted as BUZZ_EARLY so the app can penalise
 *   - armed:              false when opened (pre-song / pre-steal);
 *                         becomes true when the app sends ARM_WINDOW
 *
 * State machine per window:
 *   WAITING → ARMED  (on ARM_WINDOW)
 *   ARMED   → LOCKED (on first accepted buzz)
 *   any     → closed (on CLOSE_WINDOW or RESET)
 *
 * The judge holds at most one active window at a time.
 * RESET closes any active window and returns to a clean idle state.
 */

// ---------------------------------------------------------------------------
// Shared envelope
// ---------------------------------------------------------------------------

export interface BuzzerMessage<T extends string, P = undefined> {
  type: T;
  timestamp: string;
  payload: P;
}

export function makeBuzzerMessage<T extends string, P>(
  type: T,
  payload: P,
): BuzzerMessage<T, P> {
  return { type, timestamp: new Date().toISOString(), payload };
}

// ---------------------------------------------------------------------------
// Window definition (sent by app inside OPEN_WINDOW)
// ---------------------------------------------------------------------------

export interface BuzzerWindow {
  windowId: string;
  /** Controllers allowed to buzz. Empty array = all controllers eligible. */
  eligibleControllers: string[];
  /**
   * If true, buzzes arriving before the window is armed emit BUZZ_EARLY
   * (instead of BUZZ_REJECTED with NOT_ARMED) so the app can penalise early
   * presses during steal countdown.
   */
  earlyBuzzPenalty: boolean;
}

// ---------------------------------------------------------------------------
// Window state
// ---------------------------------------------------------------------------

export type WindowState = 'WAITING' | 'ARMED' | 'LOCKED';

// ---------------------------------------------------------------------------
// App → Judge messages
// ---------------------------------------------------------------------------

/** Open a new buzzer window (pre-armed; not yet accepting valid buzzes). */
export interface OpenWindowPayload extends BuzzerWindow {}
export type OpenWindowMessage = BuzzerMessage<'OPEN_WINDOW', OpenWindowPayload>;

/**
 * Arm the active window — transition WAITING → ARMED.
 * The song has resumed; valid buzzes are now accepted.
 */
export interface ArmWindowPayload { windowId: string; }
export type ArmWindowMessage = BuzzerMessage<'ARM_WINDOW', ArmWindowPayload>;

/** Close the active window without a winner (round over, no valid buzz). */
export interface CloseWindowPayload { windowId: string; }
export type CloseWindowMessage = BuzzerMessage<'CLOSE_WINDOW', CloseWindowPayload>;

/** Hard reset — close any active window and return to clean idle. */
export type ResetMessage = BuzzerMessage<'RESET', undefined>;

export type AppToJudgeMessage =
  | OpenWindowMessage
  | ArmWindowMessage
  | CloseWindowMessage
  | ResetMessage;

// ---------------------------------------------------------------------------
// Judge → App messages
// ---------------------------------------------------------------------------

/** Judge is ready / connected. */
export type ReadyMessage = BuzzerMessage<'READY', undefined>;

/** Current window state snapshot (emitted after any state change). */
export interface WindowStatePayload {
  windowId: string | null;
  windowState: WindowState | 'IDLE';
  eligibleControllers?: string[];
  isSteal?: boolean;
}
export type WindowStateMessage = BuzzerMessage<'WINDOW_STATE', WindowStatePayload>;

/** Every buzz input is emitted, regardless of acceptance. */
export interface BuzzReceivedPayload {
  windowId: string | null;
  controllerId: string;
}
export type BuzzReceivedMessage = BuzzerMessage<'BUZZ_RECEIVED', BuzzReceivedPayload>;

/** Buzz arrived before the window was armed and earlyBuzzPenalty is true. */
export interface BuzzEarlyPayload {
  windowId: string;
  controllerId: string;
}
export type BuzzEarlyMessage = BuzzerMessage<'BUZZ_EARLY', BuzzEarlyPayload>;

/** First valid buzz in an ARMED window. */
export interface BuzzAcceptedPayload {
  windowId: string;
  controllerId: string;
  elapsedMs: number;
}
export type BuzzAcceptedMessage = BuzzerMessage<'BUZZ_ACCEPTED', BuzzAcceptedPayload>;

/**
 * Buzz rejected.
 *
 * Reasons:
 *   NOT_ARMED          — window exists but is in WAITING state (no earlyBuzzPenalty)
 *   LOCKED             — window already has a winner
 *   INELIGIBLE         — controllerId not in eligibleControllers for this window
 *   DISABLED           — no active window (judge is idle)
 *   UNKNOWN_CONTROLLER — controllerId not recognised at all (optional, app-side)
 */
export type BuzzRejectionReason =
  | 'NOT_ARMED'
  | 'LOCKED'
  | 'INELIGIBLE'
  | 'DISABLED'
  | 'UNKNOWN_CONTROLLER';

export interface BuzzRejectedPayload {
  windowId: string | null;
  controllerId: string;
  reason: BuzzRejectionReason;
}
export type BuzzRejectedMessage = BuzzerMessage<'BUZZ_REJECTED', BuzzRejectedPayload>;

/** Active window was closed without a winner. */
export interface WindowClosedPayload { windowId: string; }
export type WindowClosedMessage = BuzzerMessage<'WINDOW_CLOSED', WindowClosedPayload>;

/** A team answered wrong — their controllers should show failure color. */
export interface TeamFailedPayload {
  controllerIds: string[];
}
export type TeamFailedMessage = BuzzerMessage<'TEAM_FAILED', TeamFailedPayload>;

export type JudgeToAppMessage =
  | ReadyMessage
  | WindowStateMessage
  | BuzzReceivedMessage
  | BuzzEarlyMessage
  | BuzzAcceptedMessage
  | BuzzRejectedMessage
  | WindowClosedMessage
  | TeamFailedMessage
  | ResetMessage;

export type AnyBuzzerMessage = AppToJudgeMessage | JudgeToAppMessage;

// ---------------------------------------------------------------------------
// Legacy aliases — keep diagnostics page compiling during migration
// ---------------------------------------------------------------------------

/** @deprecated Use WindowState instead */
export type JudgeState = 'IDLE' | 'ARMED' | 'LOCKED';

/** @deprecated Use WindowStatePayload instead */
export interface StatePayload { state: JudgeState; }
/** @deprecated */
export type StateMessage = BuzzerMessage<'STATE', StatePayload>;
