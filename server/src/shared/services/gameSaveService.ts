import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { BuzzerMode, GameShowClockConfig, GameShowQuestion, GameShowRules } from '../../modes/nameThatTune/types.js';

export interface GameSaveConfig {
  rules: GameShowRules;
  clockConfig: GameShowClockConfig;
  teamCount: 2 | 3 | 4;
  buzzerMode: BuzzerMode;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = join(__dirname, '../../../../game-data');

const MODE_DIR_MAP: Record<string, string> = {
  'name-that-tune': 'name-that-tune',  // existing saves preserved
};

const savesDir = (modeId: string): string =>
  join(DATA_ROOT, MODE_DIR_MAP[modeId] ?? modeId);

export interface GameSave {
  id: string;
  name: string;
  savedAt: string;
  modeId: string;
  questions: GameShowQuestion[];
  config?: GameSaveConfig;
}

const ensureDir = (modeId: string) => {
  const dir = savesDir(modeId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const savePath = (modeId: string, id: string) => join(savesDir(modeId), `${id}.json`);

export const listSaves = (modeId: string): Omit<GameSave, 'questions'>[] => {
  ensureDir(modeId);
  return readdirSync(savesDir(modeId))
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const raw = readFileSync(join(savesDir(modeId), f), 'utf-8');
        const save = JSON.parse(raw) as GameSave;
        return { id: save.id, name: save.name, savedAt: save.savedAt, modeId: save.modeId ?? modeId };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Omit<GameSave, 'questions'>[];
};

export const createSave = (modeId: string, name: string, questions: GameShowQuestion[], config?: GameSaveConfig): GameSave => {
  ensureDir(modeId);
  const id = `save-${Date.now()}`;
  const save: GameSave = { id, modeId, name, savedAt: new Date().toISOString(), questions, ...(config ? { config } : {}) };
  writeFileSync(savePath(modeId, id), JSON.stringify(save, null, 2));
  return save;
};

export const loadSave = (modeId: string, id: string): GameSave | null => {
  const path = savePath(modeId, id);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as GameSave;
  } catch {
    return null;
  }
};

export const patchSaveConfig = (modeId: string, id: string, config: GameSaveConfig): GameSave | null => {
  const save = loadSave(modeId, id);
  if (!save) return null;
  const patched: GameSave = { ...save, config };
  writeFileSync(savePath(modeId, id), JSON.stringify(patched, null, 2));
  return patched;
};

export const deleteSave = (modeId: string, id: string): boolean => {
  const path = savePath(modeId, id);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
};
