import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { TToTORound, TToTOConfig } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAVES_DIR = join(__dirname, '../../../../../game-data/ttoto');

export interface TToTOSave {
  id: string;
  modeId: 'ttoto';
  name: string;
  savedAt: string;
  rounds: TToTORound[];
  config?: Partial<TToTOConfig>;
}

export type TToTOSaveMeta = Omit<TToTOSave, 'rounds'>;

const ensureDir = () => {
  if (!existsSync(SAVES_DIR)) mkdirSync(SAVES_DIR, { recursive: true });
};

const savePath = (id: string) => join(SAVES_DIR, `${id}.json`);

export const listTToTOSaves = (): TToTOSaveMeta[] => {
  ensureDir();
  return readdirSync(SAVES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const raw = readFileSync(join(SAVES_DIR, f), 'utf-8');
        const save = JSON.parse(raw) as TToTOSave;
        return { id: save.id, modeId: save.modeId, name: save.name, savedAt: save.savedAt, config: save.config };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as TToTOSaveMeta[];
};

export const createTToTOSave = (name: string, rounds: TToTORound[], config?: Partial<TToTOConfig>): TToTOSave => {
  ensureDir();
  const id = `save-${Date.now()}`;
  const save: TToTOSave = { id, modeId: 'ttoto', name, savedAt: new Date().toISOString(), rounds, ...(config ? { config } : {}) };
  writeFileSync(savePath(id), JSON.stringify(save, null, 2));
  return save;
};

export const loadTToTOSave = (id: string): TToTOSave | null => {
  const path = savePath(id);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as TToTOSave;
  } catch {
    return null;
  }
};

export const updateTToTOSave = (id: string, rounds: TToTORound[], config?: Partial<TToTOConfig>): TToTOSave | null => {
  const save = loadTToTOSave(id);
  if (!save) return null;
  const updated: TToTOSave = { ...save, rounds, savedAt: new Date().toISOString(), ...(config ? { config } : {}) };
  writeFileSync(savePath(id), JSON.stringify(updated, null, 2));
  return updated;
};

export const deleteTToTOSave = (id: string): boolean => {
  const path = savePath(id);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
};
