import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { GameShowQuestion } from '../types/gameShow.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAVES_DIR = join(__dirname, '../../../game-saves');

export interface GameSave {
  id: string;
  name: string;
  savedAt: string;
  questions: GameShowQuestion[];
}

const ensureDir = () => {
  if (!existsSync(SAVES_DIR)) {
    mkdirSync(SAVES_DIR, { recursive: true });
  }
};

const savePath = (id: string) => join(SAVES_DIR, `${id}.json`);

export const listSaves = (): Omit<GameSave, 'questions'>[] => {
  ensureDir();
  return readdirSync(SAVES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const raw = readFileSync(join(SAVES_DIR, f), 'utf-8');
        const save = JSON.parse(raw) as GameSave;
        return { id: save.id, name: save.name, savedAt: save.savedAt };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Omit<GameSave, 'questions'>[];
};

export const createSave = (name: string, questions: GameShowQuestion[]): GameSave => {
  ensureDir();
  const id = `save-${Date.now()}`;
  const save: GameSave = { id, name, savedAt: new Date().toISOString(), questions };
  writeFileSync(savePath(id), JSON.stringify(save, null, 2));
  return save;
};

export const loadSave = (id: string): GameSave | null => {
  const path = savePath(id);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as GameSave;
  } catch {
    return null;
  }
};

export const deleteSave = (id: string): boolean => {
  const path = savePath(id);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
};
