import { existsSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE_PATH = join(__dirname, '../../../known-players.json');

const load = (): string[] => {
  try {
    if (existsSync(FILE_PATH)) {
      return JSON.parse(readFileSync(FILE_PATH, 'utf-8')) as string[];
    }
  } catch {
    // ignore
  }
  return [];
};

const save = (names: string[]): void => {
  const tmp = FILE_PATH + '.tmp';
  writeFileSync(tmp, JSON.stringify(names, null, 2));
  renameSync(tmp, FILE_PATH);
};

export const listKnownPlayers = (): string[] => load();

export const addKnownPlayers = (names: string[]): string[] => {
  const existing = load();
  const merged = [...new Set([...existing, ...names.map(n => n.trim()).filter(Boolean)])];
  save(merged);
  return merged;
};

export const deleteKnownPlayer = (name: string): string[] => {
  const existing = load();
  const updated = existing.filter(n => n !== name);
  save(updated);
  return updated;
};
