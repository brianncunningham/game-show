import type { SurveySaysState, SurveySaysConfig, SurveyBoard } from './types';

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

// ── Board ─────────────────────────────────────────────────────────────────────
export const loadBoard = (boardId: string) => post(`/board/load/${boardId}`);

// ── Face-off ──────────────────────────────────────────────────────────────────
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
