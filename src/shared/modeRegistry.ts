import type { GameModeClient } from './types/gameMode';

const modes = new Map<string, GameModeClient>();

export const registerClientMode = (mode: GameModeClient): void => {
  modes.set(mode.id, mode);
};

export const getClientMode = (id: string): GameModeClient | undefined => {
  return modes.get(id);
};

export const getAllClientModes = (): GameModeClient[] => {
  return Array.from(modes.values());
};
