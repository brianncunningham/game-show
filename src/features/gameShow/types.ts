export interface GameShowTeam {
  id: string;
  name: string;
  players: string[];
  score: number;
  eliminated?: boolean;
}

export interface GameShowSong {
  title: string;
  artist: string;
  spotifyTrackId?: string;
  clipStartMs?: number;
}

export interface GameShowQuestion {
  id: string;
  round: number;
  category: string;
  songLabel: string;
  songs: GameShowSong[];
  clipStart: number;
  clipDuration: number;
  basePoints: number;
}

export type BuzzerMode = 'manual' | 'phone' | 'hardware';

export interface ControllerAssignment {
  controllerId: string;
  teamId: string;
  playerName: string;
  claimedAt?: string;
}

export interface GameShowRules {
  allowSteal: boolean;
  wrongBuzzPenalty: boolean;
  roundMultipliers: number[];
}

export interface GameShowRoundState {
  selectedQuestionId: string | null;
  activeSongIndex: number | null;
  usedQuestionIds: string[];
  clipState: 'idle' | 'active' | 'resolved';
  buzzWinnerTeamId: string | null;
  buzzWinnerControllerId: string | null;
  penalizedControllerIds: string[];
  attemptedTeamIds: string[];
  stealingTeamId: string | null;
  answerState: 'pending' | 'correct' | 'wrong';
  stealState: 'idle' | 'available' | 'resolved';
  lastPointsAwarded: number | null;
  artistBonusUsed: boolean;
  revealState: 'none' | 'title' | 'artist' | 'both';
}

export interface GameShowState {
  id: string;
  status: 'setup' | 'live' | 'paused' | 'complete' | 'sudden_death';
  currentRound: number;
  chooserTeamId: string | null;
  multiplier: number;
  practiceMode: boolean;
  hostLocked: boolean;
  showIntro: boolean;
  showRules: boolean;
  randomizerSeq: number;
  firstPickSeq: number;
  firstPickTeamId: string | null;
  playerPool: string[];
  teamCount: 2 | 3 | 4;
  eliminationEnabled: boolean;
  buzzerMode: BuzzerMode;
  controllerAssignments: ControllerAssignment[];
  teams: GameShowTeam[];
  rules: GameShowRules;
  questions: GameShowQuestion[];
  roundState: GameShowRoundState;
  eventLog: Array<{
    action: string;
    at: string;
  }>;
  updatedAt: string;
}

export type GameShowSocketMessage =
  | { type: 'snapshot'; payload: GameShowState }
  | { type: 'event'; payload: { action: string; state: GameShowState } };
