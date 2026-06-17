import type React from 'react';

/**
 * Client-side contract for a game mode.
 * Each mode registers itself; the page shells render based on the active mode.
 */
export interface GameModeClient {
  /** Stable identifier matching the server-side mode id, e.g. 'ntt' */
  id: string;
  /** Human-readable display name */
  displayName: string;
  /** Full-screen show display component */
  ShowComponent: React.ComponentType;
  /** Host controls component */
  HostComponent: React.ComponentType;
  /** Admin/content manager component */
  AdminComponent: React.ComponentType;
}

export interface ModeInfo {
  id: string;
  displayName: string;
}

export interface ModeState {
  activeModeId: string | null;
  modes: ModeInfo[];
}
