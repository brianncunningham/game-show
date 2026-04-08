import type { GameShowQuestion, GameShowRules, GameShowState, GameShowTeam } from './types';

const API_BASE = '/api/game-show';

export const getGameShowState = async (): Promise<GameShowState> => {
  const response = await fetch(`${API_BASE}/state`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to load game show state');
  }

  return response.json();
};

export const startGame = async (): Promise<GameShowState> => {
  const response = await fetch(`${API_BASE}/start`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to start game');
  }

  return response.json();
};

export const selectSong = async (songIndex: number): Promise<GameShowState> => {
  const response = await fetch(`${API_BASE}/song/${songIndex}/select`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to select song');
  }

  return response.json();
};

export const selectQuestion = async (questionId: string): Promise<GameShowState> => {
  const response = await fetch(`${API_BASE}/question/${questionId}/select`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to select question');
  }

  return response.json();
};

export const setBuzzWinner = async (teamId: string): Promise<GameShowState> => {
  const response = await fetch(`${API_BASE}/buzz/${teamId}`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to set buzz winner');
  }

  return response.json();
};

const postAction = async (path: string, errorMessage: string): Promise<GameShowState> => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return response.json();
};

export const markCorrect = () => postAction('/answer/correct', 'Failed to mark answer correct');
export const awardArtistBonus = () => postAction('/answer/artist-bonus', 'Failed to award artist bonus');
export const triggerSuddenDeath = () => postAction('/sudden-death', 'Failed to trigger sudden death');
export const markWrong = () => postAction('/answer/wrong', 'Failed to mark answer wrong');
export const markStealSuccess = () => postAction('/steal/success', 'Failed to award steal');
export const markStealFail = () => postAction('/steal/fail', 'Failed to resolve failed steal');
export const nextRound = () => postAction('/round/next', 'Failed to advance round');
export const resetRound = () => postAction('/round/reset', 'Failed to reset round');
export const resetScores = () => postAction('/scores/reset', 'Failed to reset scores');
export const restartGame = () => postAction('/reset', 'Failed to restart game');
export const undoLastAction = () => postAction('/undo', 'Failed to undo last action');
export const toggleHostLock = () => postAction('/host-lock/toggle', 'Failed to toggle host lock');

export const showIntroOn = () => postAction('/show-intro/on', 'Failed to show intro');
export const showIntroOff = () => postAction('/show-intro/off', 'Failed to hide intro');
export const showRulesOn = () => postAction('/show-rules/on', 'Failed to show rules');
export const showRulesOff = () => postAction('/show-rules/off', 'Failed to hide rules');
export const randomFirstPick = () => postAction('/first-pick/random', 'Failed to randomize first pick');
export const dismissFirstPick = () => postAction('/first-pick/dismiss', 'Failed to dismiss first pick');
export const showBoard = () => postAction('/show-board', 'Failed to show board');

export const endGame = async (winnerTeamId: string): Promise<GameShowState> => {
  const response = await fetch(`${API_BASE}/game/end`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ winnerTeamId }),
  });
  if (!response.ok) throw new Error('Failed to end game');
  return response.json();
};

export const randomAssignPlayers = () => postAction('/players/random-assign', 'Failed to randomize players');

export interface GameSaveMeta {
  id: string;
  name: string;
  savedAt: string;
}

export const listSaves = async (): Promise<GameSaveMeta[]> => {
  const response = await fetch(`${API_BASE}/saves`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to list saves');
  return response.json();
};

export const createSave = async (name: string): Promise<GameSaveMeta> => {
  const response = await fetch(`${API_BASE}/saves`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error('Failed to create save');
  return response.json();
};

export const loadSave = async (id: string): Promise<GameShowState> => {
  const response = await fetch(`${API_BASE}/saves/${id}/load`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to load save');
  return response.json();
};

export const deleteSave = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/saves/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete save');
};

export const updateGameConfig = async (payload: {
  practiceMode?: boolean;
  hostLocked?: boolean;
  playerPool?: string[];
  teams?: GameShowTeam[];
  questions?: GameShowQuestion[];
  rules?: GameShowRules;
}): Promise<GameShowState> => {
  const response = await fetch(`${API_BASE}/config`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to update game config');
  }

  return response.json();
};
