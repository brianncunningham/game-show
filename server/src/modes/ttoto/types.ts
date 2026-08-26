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

// ─── Content ────────────────────────────────────────────────────────────────

export interface TToTOQuestion {
  id: string;
  prompt: string;
  // Authoring format: index 0 is always the correct answer. The store randomly
  // assigns these three to This/That/TheOther display slots when the question
  // loads (see TToTORoundState.displayChoices/correctChoice) — this removes the
  // authoring error of mislabeling which slot is correct, and simplifies bulk/
  // AI-generated content to "correct answer + 2 wrong answers", no slot bookkeeping.
  choices: [string, string, string];
  mediaRef?: string;          // Spotify track ID or image URL (media_id flavor) — Phase 3
}

export interface TToTORound {
  id: string;
  roundNumber: number;        // 1-based
  flavor: TToTOFlavor;
  questions: TToTOQuestion[];
  // Assigned lazily the first time this round is entered (round_intro), so it stays
  // stable across undo/revisits. Rotates per round, never repeating the previous
  // round's style (Q7 decision) — not tied to flavor.
  letterStyle?: LetterStyle;
}

// ─── Config ─────────────────────────────────────────────────────────────────

export interface TToTOConfig {
  buzzerMode: BuzzerMode;                     // Phase 1 only supports 'manual'
  stealMode: 'EXCLUSIVE' | 'TIMED_WINDOW';    // Phase 1 only supports 'EXCLUSIVE'
  stealWindowSecs: number;                    // TIMED_WINDOW only — Phase 3
  revealTiming: 'together' | 'prompt_first';
  earlyBuzzPenalty: 'ignore' | 'lockout';      // lockout scoped to the current buzz window only
  doubleMissRule: 'no_score' | 'half_points';
  basePoints: number;                          // flat per-question value, NTT-style
  roundMultipliers: number[];                  // index = round-1, e.g. [1, 1, 2, 2, 3]
}

// ─── Round/runtime state ─────────────────────────────────────────────────────

export type TToTOPhase =
  | 'idle'            // nothing loaded
  | 'round_intro'     // round-type card on /show
  | 'reading'         // prompt visible, choices hidden (revealTiming: prompt_first)
  | 'armed'           // choices revealed, buzzers "armed" (manual buzz buttons live)
  | 'answering'       // a team is on the clock
  | 'steal'           // first team missed; opposing team is on the clock (EXCLUSIVE)
  | 'resolved'        // correct given or double miss; scores applied; reveal shown
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
  currentRoundIndex: number;      // 0-based index into rounds[]
  currentQuestionIndex: number;   // 0-based index into rounds[currentRoundIndex].questions
  answeringTeamId: string | null; // team currently on the clock
  eliminatedChoices: TToTOChoiceKey[];
  missedBy: MissRecord[];
  resolvedCorrectly: boolean | null;
  // Random variant + rotation (Q8) assigned per missed choice, so a panel's crack
  // stays stable once shown (e.g. through the steal handoff) rather than re-rolling.
  choiceCracks: Partial<Record<TToTOChoiceKey, CrackInfo>>;
  // The current question's 3 answers randomly assigned to This/That/TheOther slots,
  // and which slot holds the correct one — computed once when the question loads
  // (beginRound / next) and held stable through the steal handoff and undo.
  displayChoices: Record<TToTOChoiceKey, string> | null;
  correctChoice: TToTOChoiceKey | null;
}

// ─── Team ────────────────────────────────────────────────────────────────────

export interface TToTOTeam {
  id: string;
  name: string;
  score: number;
}

// ─── Top-level State ─────────────────────────────────────────────────────────

export interface TToTOState {
  config: TToTOConfig;
  teams: [TToTOTeam, TToTOTeam];
  rounds: TToTORound[];
  roundState: TToTORoundState;
  showIntro: boolean;
}
