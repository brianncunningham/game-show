/**
 * Buzzer Protocol Types
 *
 * Shared between the judge-controller and the app.
 * Transport-agnostic — valid over WebSocket, HTTP, or local IPC.
 *
 * Design rules:
 *   - Every message has a `type`, `timestamp`, and optional `payload`.
 *   - The judge emits `controllerId` only — no player or team data.
 *   - The app owns controller → player → team mapping.
 *   - The judge owns state, timing, and lockout.
 */

// ---------------------------------------------------------------------------
// Judge State Machine
// ---------------------------------------------------------------------------

/** The three states the judge-controller can be in. */
export type JudgeState = 'IDLE' | 'ARMED' | 'LOCKED';

/**
 * State transitions:
 *   IDLE   → ARMED   on ARM command from app
 *   ARMED  → LOCKED  on first accepted buzz
 *   LOCKED → IDLE    on RESET command from app
 */

// ---------------------------------------------------------------------------
// Message Envelope
// ---------------------------------------------------------------------------

/** Base shape every message must conform to. */
export interface BuzzerMessage<T extends string, P = undefined> {
  /** Discriminant used for routing and logging. */
  type: T;
  /** ISO-8601 UTC timestamp of when the message was created. */
  timestamp: string;
  /** Optional structured payload. Omitted when there is nothing to convey. */
  payload: P;
}

// ---------------------------------------------------------------------------
// App → Judge Commands
// ---------------------------------------------------------------------------

/** ARM: Tell the judge to start accepting buzz inputs. */
export type ArmMessage = BuzzerMessage<'ARM', undefined>;

/** RESET: Tell the judge to return to IDLE and clear any locked state. */
export type ResetMessage = BuzzerMessage<'RESET', undefined>;

/** Union of all messages the app sends to the judge. */
export type AppToJudgeMessage = ArmMessage | ResetMessage;

// ---------------------------------------------------------------------------
// Judge → App Events
// ---------------------------------------------------------------------------

/** READY: Judge has transitioned to ARMED and is accepting buzz inputs. */
export type ReadyMessage = BuzzerMessage<'READY', undefined>;

/** STATE: Judge broadcasts its current state (useful on connect / re-sync). */
export interface StatePayload {
  /** Current judge state. */
  state: JudgeState;
}
export type StateMessage = BuzzerMessage<'STATE', StatePayload>;

/** BUZZ_RECEIVED: A controller sent a buzz input. Judge is evaluating it. */
export interface BuzzReceivedPayload {
  /** Opaque identifier for the buzzer unit (e.g. device MAC, button index). */
  controllerId: string;
}
export type BuzzReceivedMessage = BuzzerMessage<'BUZZ_RECEIVED', BuzzReceivedPayload>;

/** BUZZ_ACCEPTED: The buzz was the first valid input. Judge is now LOCKED. */
export interface BuzzAcceptedPayload {
  /** The controller whose buzz was accepted as the winner. */
  controllerId: string;
  /** Elapsed ms from ARM to accepted buzz — useful for logging / display. */
  elapsedMs: number;
}
export type BuzzAcceptedMessage = BuzzerMessage<'BUZZ_ACCEPTED', BuzzAcceptedPayload>;

/** BUZZ_REJECTED: A buzz arrived but was not accepted (already locked, or judge not armed). */
export interface BuzzRejectedPayload {
  /** The controller that sent the rejected buzz. */
  controllerId: string;
  /** Why the buzz was rejected. */
  reason: 'NOT_ARMED' | 'ALREADY_LOCKED';
}
export type BuzzRejectedMessage = BuzzerMessage<'BUZZ_REJECTED', BuzzRejectedPayload>;

/** Union of all messages the judge sends to the app. */
export type JudgeToAppMessage =
  | ReadyMessage
  | StateMessage
  | BuzzReceivedMessage
  | BuzzAcceptedMessage
  | BuzzRejectedMessage;

// ---------------------------------------------------------------------------
// Any direction
// ---------------------------------------------------------------------------

/** Union of all buzzer protocol messages. */
export type AnyBuzzerMessage = AppToJudgeMessage | JudgeToAppMessage;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Construct a well-formed buzzer message with a current timestamp. */
export function makeBuzzerMessage<T extends string, P>(
  type: T,
  payload: P,
): BuzzerMessage<T, P> {
  return { type, timestamp: new Date().toISOString(), payload };
}
