import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { SurveyBoard, SurveySaysConfig } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAVES_DIR = join(__dirname, '../../../../../game-data/survey-says');

export interface SSSave {
  id: string;
  modeId: 'survey-says';
  name: string;
  savedAt: string;
  boards: SurveyBoard[];
  config?: Partial<SurveySaysConfig>;
}

export type SSSaveMeta = Omit<SSSave, 'boards'>;

const ensureDir = () => {
  if (!existsSync(SAVES_DIR)) mkdirSync(SAVES_DIR, { recursive: true });
};

const savePath = (id: string) => join(SAVES_DIR, `${id}.json`);

export const listSSSaves = (): SSSaveMeta[] => {
  ensureDir();
  return readdirSync(SAVES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const raw = readFileSync(join(SAVES_DIR, f), 'utf-8');
        const save = JSON.parse(raw) as SSSave;
        return { id: save.id, modeId: save.modeId, name: save.name, savedAt: save.savedAt, config: save.config };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as SSSaveMeta[];
};

export const createSSSave = (name: string, boards: SurveyBoard[], config?: Partial<SurveySaysConfig>): SSSave => {
  ensureDir();
  const id = `save-${Date.now()}`;
  const save: SSSave = { id, modeId: 'survey-says', name, savedAt: new Date().toISOString(), boards, ...(config ? { config } : {}) };
  writeFileSync(savePath(id), JSON.stringify(save, null, 2));
  return save;
};

export const loadSSSave = (id: string): SSSave | null => {
  const path = savePath(id);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as SSSave;
  } catch {
    return null;
  }
};

export const patchSSSaveConfig = (id: string, config: Partial<SurveySaysConfig>): SSSave | null => {
  const save = loadSSSave(id);
  if (!save) return null;
  const patched: SSSave = { ...save, config };
  writeFileSync(savePath(id), JSON.stringify(patched, null, 2));
  return patched;
};

export const deleteSSSave = (id: string): boolean => {
  const path = savePath(id);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
};
