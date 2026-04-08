export interface GameShowTeam {
  id: string;
  name: string;
  players: string[];
  score: number;
}

export interface GameShowQuestion {
  id: string;
  category: string;
  songLabel: string;
  clipStart: number;
  clipDuration: number;
  basePoints: number;
}

export interface GameShowRules {
  allowSteal: boolean;
  wrongBuzzPenalty: boolean;
  roundMultipliers: number[];
}

export interface GameShowRoundState {
  selectedQuestionId: string | null;
  clipState: 'idle' | 'active' | 'resolved';
  buzzWinnerTeamId: string | null;
  answerState: 'pending' | 'correct' | 'wrong';
  stealState: 'idle' | 'available' | 'resolved';
  lastPointsAwarded: number | null;
}

export interface GameShowState {
  id: string;
  status: 'setup' | 'live' | 'paused' | 'complete';
  currentRound: number;
  chooserTeamId: string | null;
  multiplier: number;
  practiceMode: boolean;
  hostLocked: boolean;
  playerPool: string[];
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

export interface GameShowSnapshotMessage {
  type: 'snapshot';
  payload: GameShowState;
}

export interface GameShowEventMessage {
  type: 'event';
  payload: {
    action: string;
    state: GameShowState;
  };
}

export type GameShowSocketMessage = GameShowSnapshotMessage | GameShowEventMessage;
