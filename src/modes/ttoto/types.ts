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
  // media_id ("ID Please") only — see server types.ts for the full rationale. 'song':
  // mediaRef is a Spotify track ID; 'image'/'sound': mediaRef is a filename under
  // public/ttoto/media/ (sound plays on the show screen itself, no external device).
  // Per-question, not per-round, so a round can mix media types.
  mediaType?: 'song' | 'image' | 'sound';
  mediaRef?: string;
  // song only — playback start position in ms (a single value, unlike NTT's separate
  // clipStartMs/chorusStartMs — a host picks one meaningful spot per question, not both).
  // Defaults to 0 (track start) when omitted. See server types.ts for the full rationale.
  mediaStartMs?: number;
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
  | 'media_shown'      // media_id ("ID Please") only — see server types.ts's comment
  | 'categories_shown' // category_sort only — see server types.ts's comment
  | 'armed'
  | 'answering'
  | 'steal'
  | 'steal_armed'      // TIMED_WINDOW only — buzzers live for the steal, nobody has buzzed in yet
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
  // The specific wand/controller on the clock — null for manual buzzes (no per-player
  // granularity). See attemptedControllerIds for the per-player steal lockout this feeds.
  answeringControllerId: string | null;
  // Every controller that already buzzed in and was judged wrong THIS question — that
  // specific person can't buzz in again (initial answer, exclusive steal, or open steal)
  // until next(). Teammates and the other team are unaffected.
  attemptedControllerIds: string[];
  eliminatedChoices: TToTOChoiceKey[];
  missedBy: MissRecord[];
  resolvedCorrectly: boolean | null;
  choiceCracks: Partial<Record<TToTOChoiceKey, CrackInfo>>;
  displayChoices: Record<TToTOChoiceKey, string> | null;
  correctChoice: TToTOChoiceKey | null;
  // media_id ("ID Please") only — bumped by the host's Replay control so the show screen
  // can re-fire its reveal cue (image pulse) even when nothing else changes. See server
  // types.ts for the full rationale.
  mediaReplaySeq?: number;
  // ── TIMED_WINDOW steal only (phase 'steal_armed') ────────────────────────────
  stealEligibleTeamId?: string | null;
  stealWindowOpen?: boolean;
  stealWindowExpiresAt?: number | null;
}

export interface TToTOTeam {
  id: string;
  name: string;
  score: number;
  // Roster for hardware-player mode — empty/unused in manual mode.
  players: string[];
}

// controllerId -> team/player it's wired to. Rebuilt positionally whenever a roster
// changes (see server store.ts's buildControllerAssignments).
export interface ControllerAssignment {
  controllerId: string;
  teamId: string;
  playerName: string;
}

export interface TToTOState {
  config: TToTOConfig;
  teams: [TToTOTeam, TToTOTeam];
  rounds: TToTORound[];
  roundState: TToTORoundState;
  showIntro: boolean;
  // Incremented each time the host starts a wand test (see api.ts showWandTest) — 0/
  // undefined means no wand test is currently running.
  wandTestSeq?: number;
  playerPool: string[];
  controllerAssignments: ControllerAssignment[];
  // Incremented each time randomAssignPlayers() runs — the show screen watches this to
  // play the team-sorting animation (see TToTOTeamRandomizer).
  randomizerSeq?: number;
  // The randomizer shows whenever randomizerSeq > randomizerDismissSeq — see the server
  // type's comment for why this replaced an earlier fragile snapshot-comparison approach.
  randomizerDismissSeq?: number;
}

export const CHOICE_LABELS: Record<TToTOChoiceKey, string> = {
  this: 'THIS',
  that: 'THAT',
  the_other: 'THE OTHER',
};

// Player-facing round names, not the internal TToTOFlavor identifiers — chosen to read as
// punchy idioms/exclamations rather than dev-facing descriptions of the mechanic.
export const FLAVOR_LABELS: Record<TToTOFlavor, string> = {
  trivia: 'Just the Facts',
  odd_one_out: 'Odd One Out',
  real_or_fake: 'Real or Fake',
  closest_guess: 'On The Nose',
  media_id: 'ID Please',
  attribution: 'Whodunit?',
  category_sort: 'Triage',
};
