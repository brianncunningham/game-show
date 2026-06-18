export type BuzzerMode = 'manual' | 'hardware';

export interface SurveyAnswer {
  rank: number;
  text: string;
  points: number;
}

export interface SurveyBoard {
  id: string;
  round: number;
  question: string;
  answers: SurveyAnswer[];
}

export interface SurveySaysConfig {
  buzzerMode: BuzzerMode;
  multiplierSchedule: number[];
  winningThreshold: number;
  sweepBonus: number;
  answerTimerEnabled: boolean;
  answerTimerSecs: number;
  addStolenAnswerPoints: boolean;
}

export type GamePhase =
  | 'idle'
  | 'face_off'
  | 'play_or_pass'
  | 'main_play'
  | 'steal'
  | 'post_round'
  | 'game_over';

export type FaceOffState =
  | 'waiting_buzz'
  | 'player_a_answered'
  | 'player_b_answering'
  | 'resolved';

export interface RevealedAnswer {
  rank: number;
  revealedDuringPlay: boolean;
}

export interface SurveySaysRoundState {
  phase: GamePhase;
  currentRound: number;
  currentBoardId: string | null;
  faceOffState: FaceOffState;
  faceOffWinnerTeamId: string | null;
  faceOffStrikeTeamId: string | null;
  controllingTeamId: string | null;
  stealingTeamId: string | null;
  strikeCount: number;
  roundBank: number;
  revealedAnswers: RevealedAnswer[];
  buzzWinnerTeamId: string | null;
  swept: boolean;
}

export interface SurveyTeam {
  id: string;
  name: string;
  score: number;
}

export interface SurveySaysState {
  config: SurveySaysConfig;
  teams: [SurveyTeam, SurveyTeam];
  boards: SurveyBoard[];
  roundState: SurveySaysRoundState;
  showIntro: boolean;
}
