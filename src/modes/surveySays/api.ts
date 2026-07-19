import type { SurveySaysState, SurveySaysConfig, SurveyBoard, SurveyTeam } from './types';

const API_BASE = '/api/survey-says';

const post = async (path: string, body?: unknown): Promise<SurveySaysState> => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`SS API error: ${path}`);
  return res.json();
};

const patch = async (path: string, body?: unknown): Promise<SurveySaysState> => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`SS API error: PATCH ${path}`);
  return res.json();
};

export const getState = async (): Promise<SurveySaysState> => {
  const res = await fetch(`${API_BASE}/state`, { credentials: 'include' });
  if (!res.ok) throw new Error('SS: failed to get state');
  return res.json();
};

// ── Config ────────────────────────────────────────────────────────────────────
export const updateConfig = (config: Partial<SurveySaysConfig>) => patch('/config', config);
export const setTeamName = (teamId: string, name: string) => patch(`/teams/${teamId}/name`, { name });
export const adjustScore = (teamId: string, delta: number) => post(`/teams/${teamId}/score/adjust`, { delta });

// ── Intro ─────────────────────────────────────────────────────────────────────
export const hideIntro = () => post('/intro/hide');
export const showIntro = () => post('/intro/show');

// ── Wand test ─────────────────────────────────────────────────────────────────
export const showWandTest = () => post('/wand-test/show');
export const hideWandTest = () => post('/wand-test/hide');

// ── Board ─────────────────────────────────────────────────────────────────────
export const loadBoard = (boardId: string) => post(`/board/load/${boardId}`);

// ── Face-off ──────────────────────────────────────────────────────────────────
export const showBoard = () => post('/faceoff/show-board');
export const revealQuestion = () => post('/faceoff/reveal-question'); // also arms buzzers
export const recordBuzz = (teamId: string) => post(`/faceoff/buzz/${teamId}`);
export const faceOffAnswer = (rank: number) => post(`/faceoff/answer/${rank}`);
export const faceOffStrike = () => post('/faceoff/strike');

// ── Play or Pass ──────────────────────────────────────────────────────────────
export const setPlayOrPass = (choice: 'play' | 'pass') => post(`/playorpass/${choice}`);

// ── Main Play ─────────────────────────────────────────────────────────────────
export const revealAnswer = (rank: number) => post(`/answer/reveal/${rank}`);
export const revealAnswerPostRound = (rank: number) => post(`/answer/reveal-post/${rank}`);
export const addStrike = () => post('/strike');

// ── Steal ─────────────────────────────────────────────────────────────────────
export const setStealingTeam = (teamId: string) => post(`/steal/team/${teamId}`);
export const stealSuccess = (rank: number) => post(`/steal/success/${rank}`);
export const stealFail = () => post('/steal/fail');

// ── Round transitions ─────────────────────────────────────────────────────────
export const nextRound = () => post('/round/next');
export const newGame = () => post('/game/new');
export const endGame = () => post('/game/over');
export const setPostGameReveal = (reveal: boolean) => post('/game-over/reveal-board', { reveal });
export const undo = () => post('/undo');

// ── Players & teams ─────────────────────────────────────────────────────────
export const setPlayerPool = (pool: string[]) => post('/players/pool', { pool });
export const assignPlayers = (teams: Pick<SurveyTeam, 'id' | 'name' | 'players'>[]) => post('/players/assign', { teams });
export const randomAssignPlayers = () => post('/players/random-assign');

export const listKnownPlayers = async (): Promise<string[]> => {
  const res = await fetch(`${API_BASE}/known-players`, { credentials: 'include' });
  if (!res.ok) throw new Error('SS: failed to list known players');
  return res.json();
};
export const addKnownPlayers = async (names: string[]): Promise<string[]> => {
  const res = await fetch(`${API_BASE}/known-players`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names }),
  });
  if (!res.ok) throw new Error('SS: failed to add known players');
  return res.json();
};
export const deleteKnownPlayer = async (name: string): Promise<string[]> => {
  const res = await fetch(`${API_BASE}/known-players/${encodeURIComponent(name)}`, {
    method: 'DELETE', credentials: 'include',
  });
  if (!res.ok) throw new Error('SS: failed to delete known player');
  return res.json();
};

// ── Saves ─────────────────────────────────────────────────────────────────────
export interface SSSaveMeta {
  id: string;
  name: string;
  savedAt: string;
  modeId: 'survey-says';
}

export const listSaves = async (): Promise<SSSaveMeta[]> => {
  const res = await fetch(`${API_BASE}/saves`, { credentials: 'include' });
  if (!res.ok) throw new Error('SS: failed to list saves');
  return res.json();
};

export const createSave = async (name: string): Promise<SSSaveMeta> => {
  const res = await fetch(`${API_BASE}/saves`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('SS: failed to create save');
  return res.json();
};

export const loadSave = (id: string) => post(`/saves/${id}/load`);

export const patchSaveConfig = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/saves/${id}/config`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('SS: failed to patch save config');
};

export const updateSaveBoards = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/saves/${id}/boards`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('SS: failed to update save boards');
};

export const deleteSave = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/saves/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('SS: failed to delete save');
};

export const setBoards = async (boards: SurveyBoard[]): Promise<SurveySaysState> => {
  const res = await fetch(`${API_BASE}/boards`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boards }),
  });
  if (!res.ok) throw new Error('SS: failed to set boards');
  return res.json();
};
