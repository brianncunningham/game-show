import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { GameModeServer } from '../types/gameMode.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACTIVE_MODE_PATH = join(__dirname, '../../../../active-mode.json');

const modes = new Map<string, GameModeServer>();
let activeModeId: string | null = null;

const loadPersistedModeId = (): string | null => {
  try {
    if (existsSync(ACTIVE_MODE_PATH)) {
      const raw = readFileSync(ACTIVE_MODE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as { modeId: string };
      return parsed.modeId ?? null;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const persistModeId = (modeId: string): void => {
  try {
    writeFileSync(ACTIVE_MODE_PATH, JSON.stringify({ modeId }, null, 2));
  } catch {
    /* ignore */
  }
};

export const registerMode = (mode: GameModeServer): void => {
  modes.set(mode.id, mode);
};

export const getRegisteredModes = (): GameModeServer[] => {
  return Array.from(modes.values());
};

export const getActiveMode = (): GameModeServer | null => {
  if (!activeModeId) return null;
  return modes.get(activeModeId) ?? null;
};

export const getActiveModeId = (): string | null => activeModeId;

/**
 * Initialize the registry after all modes are registered.
 * Falls back to the first registered mode if no persisted preference.
 */
export const initModeRegistry = (): void => {
  const persisted = loadPersistedModeId();
  const fallback = Array.from(modes.keys())[0] ?? null;
  const targetId = (persisted && modes.has(persisted)) ? persisted : fallback;

  if (!targetId) {
    console.warn('[ModeRegistry] No modes registered.');
    return;
  }

  activeModeId = targetId;
  persistModeId(targetId);
  modes.get(targetId)?.onActivate();
  console.log(`[ModeRegistry] Active mode: ${targetId}`);
};

/**
 * Switch the active mode. Deactivates current, resets both, activates new.
 * Returns false if the target mode is not registered.
 */
export const switchMode = (targetModeId: string): boolean => {
  if (!modes.has(targetModeId)) return false;

  const current = activeModeId ? modes.get(activeModeId) : null;
  current?.onDeactivate();
  current?.reset();

  activeModeId = targetModeId;
  persistModeId(targetModeId);

  const next = modes.get(targetModeId)!;
  next.reset();
  next.onActivate();

  console.log(`[ModeRegistry] Switched to mode: ${targetModeId}`);
  return true;
};
