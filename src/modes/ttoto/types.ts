export type BuzzerMode = 'manual' | 'hardware-player' | 'hardware-team';

export type TToTOFlavor =
  | 'trivia'
  | 'odd_one_out'
  | 'real_or_fake'
  | 'closest_guess'
  | 'media_id'
  | 'attribution'
  | 'category_sort';

export type TToTOChoiceKey = 'this' | 'that' | 'the_other';

export type LetterStyle = 'split_flap' | 'dot_matrix' | 'segmented';

export type CrackVariant = 'A' | 'B' | 'C' | 'D';

export interface TToTOQuestion {
  id: string;
  prompt: string;
  // Authoring format: index 0 is always the correct answer. The store randomly
  // assigns these three to This/That/TheOther display slots when the question
  // loads (see TToTORoundState.displayChoices/correctChoice).
  choices: [string, string, string];
  mediaRef?: string;
  // Optional host-only context, e.g. "Tomato is technically a fruit; the other two are
  // vegetables" for an odd-one-out question. Only the /host UI renders this.
  hostNote?: string;
}

export interface TToTORound {
  id: string;
  roundNumber: number;
  flavor: TToTOFlavor;
  questions: TToTOQuestion[];
  letterStyle?: LetterStyle;
  // category_sort only: the 3 fixed category names for the round; each question's
  // `choices` must be a permutation of these (index 0 = correct, as usual).
  categoryOptions?: [string, string, string];
  // category_sort only: which display slot each categoryOptions entry is in (index-
  // aligned), assigned once per round and held fixed — see server types.ts for why.
  categorySlots?: [TToTOChoiceKey, TToTOChoiceKey, TToTOChoiceKey];
}

export interface TToTOConfig {
  buzzerMode: BuzzerMode;
  stealMode: 'EXCLUSIVE' | 'TIMED_WINDOW';
  stealWindowSecs: number;
  revealTiming: 'together' | 'prompt_first';
  earlyBuzzPenalty: 'ignore' | 'lockout';
  doubleMissRule: 'no_score' | 'half_points';
  basePoints: number;
  roundMultipliers: number[];
}

export type TToTOPhase =
  | 'idle'
  | 'round_intro'
  | 'reading'
  | 'armed'
  | 'answering'
  | 'steal'
  | 'resolved'
  | 'game_over';

export interface MissRecord {
  choice: TToTOChoiceKey;
  teamId: string;
}

export interface CrackInfo {
  variant: CrackVariant;
  rotationDeg: number;
}

export interface TToTORoundState {
  phase: TToTOPhase;
  currentRoundIndex: number;
  currentQuestionIndex: number;
  answeringTeamId: string | null;
  eliminatedChoices: TToTOChoiceKey[];
  missedBy: MissRecord[];
  resolvedCorrectly: boolean | null;
  choiceCracks: Partial<Record<TToTOChoiceKey, CrackInfo>>;
  displayChoices: Record<TToTOChoiceKey, string> | null;
  correctChoice: TToTOChoiceKey | null;
}

export interface TToTOTeam {
  id: string;
  name: string;
  score: number;
}

export interface TToTOState {
  config: TToTOConfig;
  teams: [TToTOTeam, TToTOTeam];
  rounds: TToTORound[];
  roundState: TToTORoundState;
  showIntro: boolean;
}

export const CHOICE_LABELS: Record<TToTOChoiceKey, string> = {
  this: 'THIS',
  that: 'THAT',
  the_other: 'THE OTHER',
};

export const FLAVOR_LABELS: Record<TToTOFlavor, string> = {
  trivia: 'Straight Trivia',
  odd_one_out: 'Odd One Out',
  real_or_fake: 'Real or Fake',
  closest_guess: 'Closest Guess',
  media_id: 'Media ID',
  attribution: 'Attribution',
  category_sort: 'Category Sort',
};
