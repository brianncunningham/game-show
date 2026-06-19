export type BuzzerMode = 'manual' | 'hardware';

// ─── Content ────────────────────────────────────────────────────────────────

export interface SurveyAnswer {
  rank: number;       // 1-based, order in CSV
  text: string;
  points: number;
}

export interface SurveyBoard {
  id: string;
  round: number;
  question: string;
  answers: SurveyAnswer[];  // 1–8, ordered by rank (highest first)
}

// ─── Config ─────────────────────────────────────────────────────────────────

export interface SurveySaysConfig {
  buzzerMode: BuzzerMode;
  multiplierSchedule: number[];  // index = round-1, e.g. [1, 1, 2, 3]
  winningThreshold: number;
  sweepBonus: number;
  answerTimerEnabled: boolean;
  answerTimerSecs: number;
  addStolenAnswerPoints: boolean; // default false
}

// ─── Round State ─────────────────────────────────────────────────────────────

export type GamePhase =
  | 'idle'
  | 'face_off'
  | 'play_or_pass'
  | 'main_play'
  | 'steal'
  | 'post_round'
  | 'game_over';

export type FaceOffState =
  | 'announcing'      // face-off announced, players shown, board not yet visible
  | 'showing_board'   // empty numbered slots animating in, no question yet
  | 'waiting_buzz'    // question visible + buzzers armed, waiting for buzz
  | 'answering'       // a team is answering (faceOffTurnTeamId); host judges answer/strike
  | 'resolved';       // winner determined, show Play/Pass

export interface RevealedAnswer {
  rank: number;
  revealedDuringPlay: boolean; // false = revealed post-round
}

export interface SurveySaysRoundState {
  phase: GamePhase;
  currentRound: number;               // 1-based
  currentBoardId: string | null;
  faceOffState: FaceOffState;
  faceOffWinnerTeamId: string | null; // team that won face-off
  faceOffStrikeTeamId: string | null; // team that just got a face-off strike (transient, for X overlay)
  faceOffTurnTeamId: string | null;   // team currently answering during face-off
  faceOffStandingTeamId: string | null; // team holding a standing (non-#1) answer
  faceOffStandingRank: number | null;   // rank of the standing answer
  faceOffPlayerIndex: number;         // shared player rotation index (per-team mod size)
  faceOffStrikesThisIndex: number;    // strikes recorded at the current player index (0–2)
  mainPlayPlayerIndex: number;        // controlling team's current guesser index
  controllingTeamId: string | null;   // team playing main game
  stealingTeamId: string | null;
  strikeCount: number;                // main play strikes (0–3)
  roundBank: number;                  // live sum of revealed answer points
  revealedAnswers: RevealedAnswer[];  // which answer ranks have been revealed
  buzzWinnerTeamId: string | null;    // face-off buzz winner
  swept: boolean;                     // board cleared without 3 strikes
}

// ─── Team ────────────────────────────────────────────────────────────────────

export interface SurveyTeam {
  id: string;
  name: string;
  score: number;
  players: string[];
}

// ─── Top-level State ─────────────────────────────────────────────────────────

export interface SurveySaysState {
  config: SurveySaysConfig;
  teams: [SurveyTeam, SurveyTeam];
  boards: SurveyBoard[];              // all boards for this game
  roundState: SurveySaysRoundState;
  showIntro: boolean;
  playerPool: string[];              // names available to assign to families (max 10)
  randomizerSeq: number;             // bumps to trigger the /show team randomizer
}
