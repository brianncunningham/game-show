import type { TToTOState, TToTOConfig, TToTORound, TToTOChoiceKey, TToTOTeam } from './types';

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

// ── Players (hardware-player mode rosters) ──────────────────────────────────
export const setPlayerPool = (pool: string[]) => patch('/player-pool', { pool });
export const setTeamRosters = (teams: Pick<TToTOTeam, 'id' | 'name' | 'players'>[]) => patch('/teams/rosters', { teams });
export const randomAssignPlayers = () => post('/teams/random-assign');

// Shared cross-mode name pool (same known-players.json NTT/Survey Says use).
export const listKnownPlayers = async (): Promise<string[]> => {
  const res = await fetch(`${API_BASE}/known-players`, { credentials: 'include' });
  if (!res.ok) throw new Error('TToTO: failed to list known players');
  return res.json();
};
export const addKnownPlayers = async (names: string[]): Promise<string[]> => {
  const res = await fetch(`${API_BASE}/known-players`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names }),
  });
  if (!res.ok) throw new Error('TToTO: failed to add known players');
  return res.json();
};
export const deleteKnownPlayer = async (name: string): Promise<string[]> => {
  const res = await fetch(`${API_BASE}/known-players/${encodeURIComponent(name)}`, {
    method: 'DELETE', credentials: 'include',
  });
  if (!res.ok) throw new Error('TToTO: failed to delete known player');
  return res.json();
};

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

// ── Wand test (Phase 2 hardware) ────────────────────────────────────────────
export const showWandTest = () => post('/wand-test/show');
export const hideWandTest = () => post('/wand-test/hide');

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
