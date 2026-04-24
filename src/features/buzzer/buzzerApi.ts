const BASE = (import.meta.env['VITE_JUDGE_URL'] as string | undefined)
  ? `${import.meta.env['VITE_JUDGE_URL'] as string}/api/buzzer`
  : '/api/buzzer';

// ---------------------------------------------------------------------------
// Protocol v2 — window-based commands
// ---------------------------------------------------------------------------

export interface OpenWindowParams {
  windowId: string;
  eligibleControllers: string[];
  earlyBuzzPenalty: boolean;
  isSteal?: boolean;
}

/** Open a new buzzing window in WAITING state. Any existing window is closed first. */
export const openWindow = async (params: OpenWindowParams): Promise<void> => {
  await fetch(`${BASE}/open-window`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
};

/** Arm the active window — WAITING → ARMED. Song has resumed; buzzes are now accepted. */
export const armWindow = async (windowId: string): Promise<void> => {
  await fetch(`${BASE}/arm-window`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ windowId }),
  });
};

/** Close the active window without a winner (before a steal window or round end). */
export const closeWindow = async (windowId: string): Promise<void> => {
  await fetch(`${BASE}/close-window`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ windowId }),
  });
};

/** Hard reset — close any active window and return to idle. */
export const resetJudge = async (): Promise<void> => {
  await fetch(`${BASE}/reset`, { method: 'POST' });
};

// ---------------------------------------------------------------------------
// Diagnostics / legacy
// ---------------------------------------------------------------------------

/** @deprecated Use openWindow + armWindow instead. */
export const armJudge = async (): Promise<void> => {
  await fetch(`${BASE}/arm`, { method: 'POST' });
};

export const simulateBuzz = async (controllerId: string): Promise<void> => {
  await fetch(`${BASE}/simulate/${encodeURIComponent(controllerId)}`, {
    method: 'POST',
  });
};
