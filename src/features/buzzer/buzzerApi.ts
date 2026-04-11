const BASE = '/api/buzzer';

export const armJudge = async (): Promise<void> => {
  await fetch(`${BASE}/arm`, { method: 'POST', credentials: 'include' });
};

export const resetJudge = async (): Promise<void> => {
  await fetch(`${BASE}/reset`, { method: 'POST', credentials: 'include' });
};

export const simulateBuzz = async (controllerId: string): Promise<void> => {
  await fetch(`${BASE}/simulate/${encodeURIComponent(controllerId)}`, {
    method: 'POST',
    credentials: 'include',
  });
};
