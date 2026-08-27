// 'hardware-team' (one wand per team) has been retired in favor of 'hardware-player' (one
// wand per person) — real hardware wands are inherently per-person, and the per-player
// steal-lockout rule (see TToTORoundState.attemptedControllerIds) needs that granularity
// to mean anything. Kept as a type member so old persisted state/saves still typecheck;
// the store migrates it to 'hardware-player' on load (see store.ts loadPersistedState).
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
  // Optional host-only context, e.g. "Tomato is technically a fruit; the other two are
  // vegetables" for an odd-one-out question. Same state payload as everything else in this
  // app (no per-client filtering), but only the /host UI renders it.
  hostNote?: string;
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
  // category_sort only: the 3 fixed category names for the round (e.g. "Animal",
  // "Mineral", "Vegetable"). Each question's `choices` must be a permutation of these
  // three strings (index 0 still = correct, same authoring convention as every other
  // flavor) — the category *names* stay constant across the round, only which one is
  // correct changes per item.
  categoryOptions?: [string, string, string];
  // category_sort only: which display slot each of categoryOptions ends up in (index-
  // aligned with categoryOptions), assigned once — lazily, like letterStyle — the first
  // time the round is entered, then held fixed for every question in the round. Without
  // this, the normal per-question shuffle would make a category hop between This/That/
  // TheOther every question even though it's the same label the whole round, which is
  // confusing rather than fair.
  categorySlots?: [TToTOChoiceKey, TToTOChoiceKey, TToTOChoiceKey];
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
  | 'steal'           // opposing team (or, once open, either team) is on the clock with a choice picked
  | 'steal_armed'      // TIMED_WINDOW only — buzzers live for the steal, nobody has buzzed in yet
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
  // The specific wand/controller currently on the clock — only set for hardware-player
  // buzzes (manual host-clicked "Team X Buzzed" has no per-player granularity, so this
  // stays null then, and the per-player lockout below simply has nothing to exclude).
  answeringControllerId: string | null;
  // Every controller that has already buzzed in and been judged wrong on the CURRENT
  // question — reset on next(). That specific person is excluded from every subsequent
  // buzz-in opportunity this question (initial answer, exclusive steal, open steal),
  // even though their teammates and the other team remain eligible. This is what makes
  // "open to both teams" in TIMED_WINDOW steal mean "both teams' *remaining* players",
  // not literally anyone including the player who just missed.
  attemptedControllerIds: string[];
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

  // ── TIMED_WINDOW steal only (phase 'steal_armed') ────────────────────────────
  // Which team has exclusive buzz-in rights during the first stealWindowSecs seconds.
  // Cleared once the window opens to both, or once someone buzzes in.
  stealEligibleTeamId?: string | null;
  // False = still in the exclusive-team stage; true = opened to both teams (no further
  // timeout — it's just a straight buzz race at that point).
  stealWindowOpen?: boolean;
  // Epoch ms when the exclusive stage ends — purely for the show screen's countdown
  // display; the actual hardware window transition is driven by a server-side timer
  // (routes.ts), not by clients polling this value.
  stealWindowExpiresAt?: number | null;
}

// ─── Team ────────────────────────────────────────────────────────────────────

export interface TToTOTeam {
  id: string;
  name: string;
  score: number;
  // Roster for hardware-player mode (see controllerAssignments) — empty/unused in manual
  // mode. Variable size, no fixed cap beyond the practical number of physical wands.
  players: string[];
}

// controllerId -> which team/player it's wired to. Rebuilt wholesale (buildControllerAssignments)
// whenever the roster changes, positionally: team[0]'s players get the first N controller
// IDs, team[1]'s players get the next M — see store.ts for the exact numbering.
export interface ControllerAssignment {
  controllerId: string;
  teamId: string;
  playerName: string;
}

// ─── Top-level State ─────────────────────────────────────────────────────────

export interface TToTOState {
  config: TToTOConfig;
  teams: [TToTOTeam, TToTOTeam];
  rounds: TToTORound[];
  roundState: TToTORoundState;
  showIntro: boolean;
  // Incremented each time the host starts a wand test (see routes.ts /wand-test/show) —
  // mirrors Survey Says's state.wandTestSeq, used client-side purely to know whether a
  // wand test is currently active (0/undefined = not running).
  wandTestSeq?: number;
  // Pool of player names available to sort into teams (see store.ts randomAssignPlayers) —
  // mirrors Survey Says's playerPool/team-sorting model.
  playerPool: string[];
  controllerAssignments: ControllerAssignment[];
  // Incremented each time randomAssignPlayers() runs — the show screen watches this to
  // know when to play the team-sorting animation (see TToTOTeamRandomizer / Survey Says's
  // randomizerSeq, ported straight across).
  randomizerSeq?: number;
}
