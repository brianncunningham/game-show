/**
 * Buzzer protocol types — server copy.
 *
 * Canonical source: shared/buzzer/types.ts
 * Duplicated here because server tsconfig rootDir is `src/` only, which
 * prevents direct imports from outside that tree. Keep in sync with the
 * shared version manually until path-alias or monorepo tooling is added.
 */

export type JudgeState = 'IDLE' | 'ARMED' | 'LOCKED';

export interface BuzzerMessage<T extends string, P = undefined> {
  type: T;
  timestamp: string;
  payload: P;
}

export type ArmMessage = BuzzerMessage<'ARM', undefined>;
export type ResetMessage = BuzzerMessage<'RESET', undefined>;
export type AppToJudgeMessage = ArmMessage | ResetMessage;

export type ReadyMessage = BuzzerMessage<'READY', undefined>;

export interface StatePayload { state: JudgeState; }
export type StateMessage = BuzzerMessage<'STATE', StatePayload>;

export interface BuzzReceivedPayload { controllerId: string; }
export type BuzzReceivedMessage = BuzzerMessage<'BUZZ_RECEIVED', BuzzReceivedPayload>;

export interface BuzzAcceptedPayload { controllerId: string; elapsedMs: number; }
export type BuzzAcceptedMessage = BuzzerMessage<'BUZZ_ACCEPTED', BuzzAcceptedPayload>;

export interface BuzzRejectedPayload {
  controllerId: string;
  reason: 'NOT_ARMED' | 'ALREADY_LOCKED';
}
export type BuzzRejectedMessage = BuzzerMessage<'BUZZ_REJECTED', BuzzRejectedPayload>;

export type JudgeToAppMessage =
  | ReadyMessage
  | StateMessage
  | BuzzReceivedMessage
  | BuzzAcceptedMessage
  | BuzzRejectedMessage;

export type AnyBuzzerMessage = AppToJudgeMessage | JudgeToAppMessage;

export function makeBuzzerMessage<T extends string, P>(
  type: T,
  payload: P,
): BuzzerMessage<T, P> {
  return { type, timestamp: new Date().toISOString(), payload };
}
