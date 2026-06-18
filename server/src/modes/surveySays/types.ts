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
  | 'showing_board'      // empty numbered slots animating in, no question yet
  | 'question_revealed'  // question visible, buzzers not yet armed
  | 'waiting_buzz'       // buzzers armed, waiting
  | 'player_a_answered'  // A buzzed, awaiting host judgment
  | 'player_b_answering' // B gets their attempt
  | 'resolved';          // winner determined, show Play/Pass

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
  faceOffStrikeTeamId: string | null; // team that got a face-off strike
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
}

// ─── Top-level State ─────────────────────────────────────────────────────────

export interface SurveySaysState {
  config: SurveySaysConfig;
  teams: [SurveyTeam, SurveyTeam];
  boards: SurveyBoard[];              // all boards for this game
  roundState: SurveySaysRoundState;
  showIntro: boolean;
}
