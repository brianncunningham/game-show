import type { TToTOState, TToTOConfig, TToTORound, TToTOChoiceKey } from './types';

const API_BASE = '/api/ttoto';

const post = async (path: string, body?: unknown): Promise<TToTOState> => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`TToTO API error: ${path}`);
  return res.json();
};

const patch = async (path: string, body?: unknown): Promise<TToTOState> => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`TToTO API error: PATCH ${path}`);
  return res.json();
};

export const getState = async (): Promise<TToTOState> => {
  const res = await fetch(`${API_BASE}/state`, { credentials: 'include' });
  if (!res.ok) throw new Error('TToTO: failed to get state');
  return res.json();
};

// ── Config / teams ────────────────────────────────────────────────────────────
export const updateConfig = (config: Partial<TToTOConfig>) => patch('/config', config);
export const setTeamName = (teamId: string, name: string) => patch(`/teams/${teamId}/name`, { name });
export const adjustScore = (teamId: string, delta: number) => post(`/teams/${teamId}/score/adjust`, { delta });

// ── Content ────────────────────────────────────────────────────────────────────
export const setRounds = (rounds: TToTORound[]) => post('/rounds', { rounds });

// ── Intro ─────────────────────────────────────────────────────────────────────
export const showIntro = () => post('/intro/show');
export const hideIntro = () => post('/intro/hide');

// ── Round/question flow ───────────────────────────────────────────────────────
export const startGame = () => post('/game/start');
export const beginRound = () => post('/round/begin');
export const revealChoices = () => post('/reveal-choices');
export const recordBuzz = (teamId: string) => post(`/buzz/${teamId}`);
export const judge = (choice: TToTOChoiceKey) => post('/judge', { choice });
export const next = () => post('/next');
export const newGame = () => post('/game/new');
export const endGame = () => post('/game/end');
export const undo = () => post('/undo');

// ── Saves ─────────────────────────────────────────────────────────────────────
export interface TToTOSaveMeta {
  id: string;
  name: string;
  savedAt: string;
  modeId: 'ttoto';
}

export const listSaves = async (): Promise<TToTOSaveMeta[]> => {
  const res = await fetch(`${API_BASE}/saves`, { credentials: 'include' });
  if (!res.ok) throw new Error('TToTO: failed to list saves');
  return res.json();
};

export const createSave = async (name: string): Promise<TToTOSaveMeta> => {
  const res = await fetch(`${API_BASE}/saves`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('TToTO: failed to create save');
  return res.json();
};

export const loadSave = (id: string) => post(`/saves/${id}/load`);

export const updateSave = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/saves/${id}`, { method: 'PATCH', credentials: 'include' });
  if (!res.ok) throw new Error('TToTO: failed to update save');
};

export const deleteSave = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/saves/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error('TToTO: failed to delete save');
};
