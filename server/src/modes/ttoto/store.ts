import { existsSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  TToTOState,
  TToTOConfig,
  TToTORound,
  TToTORoundState,
  TToTOTeam,
  TToTOChoiceKey,
  TToTOQuestion,
  LetterStyle,
  CrackVariant,
  ControllerAssignment,
} from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PERSIST_PATH = join(__dirname, '../../../../game-state-ttoto.json');

const loadPersistedState = (): TToTOState | null => {
  try {
    if (existsSync(PERSIST_PATH)) {
      const raw = readFileSync(PERSIST_PATH, 'utf-8');
      const s = JSON.parse(raw) as TToTOState;
      // Hydrate fields added after initial release, and migrate the retired
      // 'hardware-team' buzzer mode to 'hardware-player'.
      s.playerPool = s.playerPool ?? [];
      s.controllerAssignments = s.controllerAssignments ?? [];
      s.randomizerSeq = s.randomizerSeq ?? 0;
      s.teams = s.teams.map(t => ({ ...t, players: t.players ?? [] })) as [TToTOTeam, TToTOTeam];
      s.roundState.attemptedControllerIds = s.roundState.attemptedControllerIds ?? [];
      s.roundState.answeringControllerId = s.roundState.answeringControllerId ?? null;
      if ((s.config?.buzzerMode as string) === 'hardware-team') s.config.buzzerMode = 'hardware-player';
      return s;
    }
  } catch (e) {
    console.warn('TToTO: could not load persisted state, using defaults.', e);
  }
  return null;
};

const persistState = (state: TToTOState): void => {
  const tmp = PERSIST_PATH + '.tmp';
  try {
    writeFileSync(tmp, JSON.stringify(state, null, 2));
    renameSync(tmp, PERSIST_PATH);
  } catch (e) {
    console.warn('TToTO: could not persist state.', e);
  }
};

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: TToTOConfig = {
  buzzerMode: 'manual',
  stealMode: 'EXCLUSIVE',
  stealWindowSecs: 5,
  revealTiming: 'prompt_first',
  earlyBuzzPenalty: 'ignore',
  doubleMissRule: 'no_score',
  basePoints: 100,
  roundMultipliers: [1, 1, 2, 2, 3],
};

const DEFAULT_TEAMS: [TToTOTeam, TToTOTeam] = [
  { id: 'team-1', name: 'Team 1', score: 0, players: [] },
  { id: 'team-2', name: 'Team 2', score: 0, players: [] },
];

// No fixed roster cap — variable size, limited in practice only by how many physical
// wands the Pico firmware supports: GP0-GP19, i.e. controllers 1-20 (see
// pico/buzz_pico/main.py's BUTTON_MAP / "Watch 20 GPIO pins").
const MAX_POOL = 20;

const ALL_LETTER_STYLES: LetterStyle[] = ['split_flap', 'dot_matrix', 'segmented'];
const ALL_CRACK_VARIANTS: CrackVariant[] = ['A', 'B', 'C', 'D'];
const CHOICE_SLOTS: TToTOChoiceKey[] = ['this', 'that', 'the_other'];

/**
 * Assign wand controller IDs to players, positionally: team[0]'s players get
 * controllers '1'..'N', team[1]'s players get the next 'N+1'..'N+M'. Rebuilt wholesale
 * whenever a roster changes (see setTeams/randomAssignPlayers) rather than trying to
 * preserve prior numbering — simpler, and controller numbers aren't meaningful to
 * players anyway (they just pick up whichever wand a host physically hands them).
 */
const buildControllerAssignments = (teams: [TToTOTeam, TToTOTeam]): ControllerAssignment[] => {
  const assignments: ControllerAssignment[] = [];
  let n = 1;
  for (const team of teams) {
    for (const playerName of team.players) {
      assignments.push({ controllerId: String(n), teamId: team.id, playerName });
      n += 1;
    }
  }
  return assignments;
};

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

// Randomly assigns a question's 3 authored answers (index 0 = correct) to the
// This/That/TheOther display slots. Called once per question load; the result is
// held in roundState so it stays stable through the steal handoff and undo.
//
// `fixedSlots` is the category_sort exception: that flavor reuses the same round-wide
// 3 category names for every question, so the category->slot mapping is pinned once per
// round (see TToTORound.categoryOptions/categorySlots) instead of reshuffled per question
// — otherwise the same label would hop between panels every question, which is confusing
// rather than fair. If a question's choices don't actually match the round's declared
// categories (bad data), this falls back to the normal random shuffle rather than drop
// a choice silently.
const shuffleChoices = (
  question: TToTOQuestion,
  fixedSlots?: { categoryOptions: [string, string, string]; categorySlots: [TToTOChoiceKey, TToTOChoiceKey, TToTOChoiceKey] },
): { displayChoices: Record<TToTOChoiceKey, string>; correctChoice: TToTOChoiceKey } => {
  if (fixedSlots) {
    const categoryIndices = question.choices.map(c => fixedSlots.categoryOptions.indexOf(c));
    if (categoryIndices.every(i => i >= 0)) {
      const displayChoices = {} as Record<TToTOChoiceKey, string>;
      question.choices.forEach((choiceText, qi) => {
        displayChoices[fixedSlots.categorySlots[categoryIndices[qi]]] = choiceText;
      });
      return { displayChoices, correctChoice: fixedSlots.categorySlots[categoryIndices[0]] };
    }
  }
  const indices = [0, 1, 2];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const displayChoices = {} as Record<TToTOChoiceKey, string>;
  let correctChoice: TToTOChoiceKey = 'this';
  CHOICE_SLOTS.forEach((slot, i) => {
    displayChoices[slot] = question.choices[indices[i]];
    if (indices[i] === 0) correctChoice = slot;
  });
  return { displayChoices, correctChoice };
};

// Random, never repeating the immediately preceding round's style (Q7 decision).
const pickLetterStyle = (prev: LetterStyle | null): LetterStyle => {
  const options = prev ? ALL_LETTER_STYLES.filter(s => s !== prev) : ALL_LETTER_STYLES;
  return options[Math.floor(Math.random() * options.length)] ?? ALL_LETTER_STYLES[0];
};

// One-time-per-round random permutation of the 3 display slots, used to seed
// TToTORound.categorySlots the first time a category_sort round is entered.
const pickCategorySlots = (): [TToTOChoiceKey, TToTOChoiceKey, TToTOChoiceKey] => {
  const slots = [...CHOICE_SLOTS];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots as [TToTOChoiceKey, TToTOChoiceKey, TToTOChoiceKey];
};

// Pure random variant + random rotation angle per miss event (Q8 decision).
const pickCrack = (): { variant: CrackVariant; rotationDeg: number } => ({
  variant: ALL_CRACK_VARIANTS[Math.floor(Math.random() * ALL_CRACK_VARIANTS.length)],
  rotationDeg: Math.round(Math.random() * 360 - 180),
});

const initialRoundState = (): TToTORoundState => ({
  phase: 'idle',
  currentRoundIndex: 0,
  currentQuestionIndex: 0,
  answeringTeamId: null,
  answeringControllerId: null,
  attemptedControllerIds: [],
  eliminatedChoices: [],
  missedBy: [],
  resolvedCorrectly: null,
  choiceCracks: {},
  displayChoices: null,
  correctChoice: null,
});

const createInitialState = (): TToTOState => ({
  config: { ...DEFAULT_CONFIG },
  teams: [{ ...DEFAULT_TEAMS[0] }, { ...DEFAULT_TEAMS[1] }],
  rounds: [],
  roundState: initialRoundState(),
  showIntro: true,
  playerPool: [],
  controllerAssignments: [],
  randomizerSeq: 0,
});

// ─── Store ────────────────────────────────────────────────────────────────────

class TToTOStore {
  private state: TToTOState = (() => {
    const persisted = loadPersistedState();
    return persisted ?? createInitialState();
  })();
  private history: TToTOState[] = [];

  getState(): TToTOState {
    return this.state;
  }

  private begin(): void {
    this.history.push(structuredClone(this.state));
    if (this.history.length > 50) this.history.shift();
  }

  private commit(next: TToTOState): TToTOState {
    this.state = next;
    persistState(this.state);
    return this.state;
  }

  undo(): TToTOState {
    const prev = this.history.pop();
    if (prev) this.state = prev;
    persistState(this.state);
    return this.state;
  }

  reset(): TToTOState {
    return this.commit(createInitialState());
  }

  // ── Config / teams / content ────────────────────────────────────────────────

  updateConfig(patch: Partial<TToTOConfig>): TToTOState {
    return this.commit({ ...this.state, config: { ...this.state.config, ...patch } });
  }

  setTeamName(teamId: string, name: string): TToTOState {
    return this.commit({
      ...this.state,
      teams: this.state.teams.map(t => (t.id === teamId ? { ...t, name } : t)) as [TToTOTeam, TToTOTeam],
    });
  }

  adjustScore(teamId: string, delta: number): TToTOState {
    return this.commit({
      ...this.state,
      teams: this.state.teams.map(t =>
        t.id === teamId ? { ...t, score: Math.max(0, t.score + delta) } : t
      ) as [TToTOTeam, TToTOTeam],
    });
  }

  // ── Players & teams (hardware-player mode) ──────────────────────────────────

  setPlayerPool(pool: string[]): TToTOState {
    const cleaned = [...new Set(pool.map(p => p.trim()).filter(Boolean))].slice(0, MAX_POOL);
    this.begin();
    // Drop any assigned players no longer in the pool, then rebuild controller numbering.
    const teams = this.state.teams.map(t => ({
      ...t,
      players: t.players.filter(p => cleaned.includes(p)),
    })) as [TToTOTeam, TToTOTeam];
    return this.commit({
      ...this.state, playerPool: cleaned, teams,
      controllerAssignments: buildControllerAssignments(teams),
    });
  }

  setTeams(teams: TToTOTeam[]): TToTOState {
    this.begin();
    const next = this.state.teams.map((t, i) => {
      const incoming = teams.find(x => x.id === t.id) ?? teams[i];
      if (!incoming) return t;
      return { ...t, name: incoming.name ?? t.name, players: incoming.players ?? t.players };
    }) as [TToTOTeam, TToTOTeam];
    return this.commit({
      ...this.state, teams: next,
      controllerAssignments: buildControllerAssignments(next),
    });
  }

  // Shuffle the pool into the two teams (alternating, so team sizes stay within one of
  // each other) and rebuild controller numbering. Mirrors Survey Says's family-sorting
  // mechanic exactly, including bumping randomizerSeq to trigger the show-screen's
  // team-sorting animation (see TToTOTeamRandomizer).
  randomAssignPlayers(): TToTOState {
    this.begin();
    const pool = shuffle(this.state.playerPool.filter(Boolean));
    const teams = [
      { ...this.state.teams[0], players: [] as string[] },
      { ...this.state.teams[1], players: [] as string[] },
    ] as [TToTOTeam, TToTOTeam];
    pool.forEach((player, i) => { teams[i % 2].players.push(player); });
    return this.commit({
      ...this.state, teams,
      controllerAssignments: buildControllerAssignments(teams),
      randomizerSeq: (this.state.randomizerSeq ?? 0) + 1,
    });
  }

  setRounds(rounds: TToTORound[]): TToTOState {
    this.begin();
    const numbered = rounds.map((r, i) => ({ ...r, roundNumber: i + 1 }));
    return this.commit({
      ...this.state,
      rounds: numbered,
      roundState: initialRoundState(),
    });
  }

  setShowIntro(show: boolean): TToTOState {
    return this.commit({ ...this.state, showIntro: show });
  }

  // ── Round/question flow ─────────────────────────────────────────────────────

  private patchRound(patch: Partial<TToTORoundState>): TToTOState {
    return this.commit({ ...this.state, roundState: { ...this.state.roundState, ...patch } });
  }

  private multiplierForRound(roundIndex: number): number {
    const schedule = this.state.config.roundMultipliers;
    return schedule[roundIndex] ?? schedule[schedule.length - 1] ?? 1;
  }

  // Assigns a letter style to a round the first time it's entered (lazy, stable
  // across undo/revisits), then returns the (possibly newly-mutated) rounds array.
  private ensureLetterStyle(roundIndex: number): TToTORound[] {
    const round = this.state.rounds[roundIndex];
    if (!round || round.letterStyle) return this.state.rounds;
    const prevStyle = this.state.rounds[roundIndex - 1]?.letterStyle ?? null;
    const letterStyle = pickLetterStyle(prevStyle);
    return this.state.rounds.map((r, i) => (i === roundIndex ? { ...r, letterStyle } : r));
  }

  // category_sort only: assigns the category->slot mapping the first time the round is
  // entered (lazy, stable across undo/revisits/every question in the round) — mirrors
  // ensureLetterStyle above.
  private ensureCategorySlots(rounds: TToTORound[], roundIndex: number): TToTORound[] {
    const round = rounds[roundIndex];
    if (!round || round.flavor !== 'category_sort' || !round.categoryOptions || round.categorySlots) return rounds;
    const categorySlots = pickCategorySlots();
    return rounds.map((r, i) => (i === roundIndex ? { ...r, categorySlots } : r));
  }

  // Builds the shuffleChoices() fixedSlots arg for a category_sort round, or undefined
  // for every other flavor (in which case shuffleChoices falls back to its normal
  // per-question random shuffle).
  private fixedSlotsFor(round: TToTORound | undefined) {
    if (!round || round.flavor !== 'category_sort' || !round.categoryOptions || !round.categorySlots) return undefined;
    return { categoryOptions: round.categoryOptions, categorySlots: round.categorySlots };
  }

  // idle -> round_intro (round 0), or resolved/round_intro -> round_intro (next round).
  // Also dismisses the game-intro screen: showIntro is checked before phase on /show, so
  // it has to clear here (not in beginRound()) or the round-type card is masked by the
  // intro right up until the same click that also advances past it to the question.
  private enterRoundIntro(roundIndex: number): TToTOState {
    const rounds = this.ensureCategorySlots(this.ensureLetterStyle(roundIndex), roundIndex);
    return this.commit({
      ...this.state,
      rounds,
      showIntro: false,
      roundState: {
        ...initialRoundState(),
        phase: 'round_intro',
        currentRoundIndex: roundIndex,
        currentQuestionIndex: 0,
      },
    });
  }

  startGame(): TToTOState {
    this.begin();
    if (this.state.rounds.length === 0) return this.state;
    return this.enterRoundIntro(0);
  }

  // round_intro -> reading (load current question)
  beginRound(): TToTOState {
    this.begin();
    const question = this.currentQuestion();
    const shuffled = question ? shuffleChoices(question, this.fixedSlotsFor(this.currentRound())) : { displayChoices: null, correctChoice: null };
    return this.patchRound({
      phase: 'reading',
      answeringTeamId: null,
      eliminatedChoices: [],
      missedBy: [],
      resolvedCorrectly: null,
      choiceCracks: {},
      ...shuffled,
    });
  }

  // reading -> armed (choices reveal / cascade in; buzzers "armed")
  revealChoices(): TToTOState {
    this.begin();
    return this.patchRound({ phase: 'armed' });
  }

  // Buzz-in: host taps "Team X Buzzed" (manual, no controllerId — no per-player
  // granularity to track) or routes.ts's hardware handler (controllerId set, from a real
  // wand press) records it. Only valid while armed.
  recordBuzz(teamId: string, controllerId: string | null = null): TToTOState {
    if (this.state.roundState.phase !== 'armed') return this.state;
    this.begin();
    return this.patchRound({ phase: 'answering', answeringTeamId: teamId, answeringControllerId: controllerId });
  }

  private otherTeamId(teamId: string | null): string {
    const other = this.state.teams.find(t => t.id !== teamId);
    return other?.id ?? this.state.teams[0].id;
  }

  private currentRound(): TToTORound | undefined {
    return this.state.rounds[this.state.roundState.currentRoundIndex];
  }

  private currentQuestion(): TToTOQuestion | null {
    return this.currentRound()?.questions[this.state.roundState.currentQuestionIndex] ?? null;
  }

  private awardPoints(teamId: string): TToTOState {
    const { config, roundState } = this.state;
    const points = config.basePoints * this.multiplierForRound(roundState.currentRoundIndex);
    const teams = this.state.teams.map(t =>
      t.id === teamId ? { ...t, score: t.score + points } : t
    ) as [TToTOTeam, TToTOTeam];
    return this.commit({
      ...this.state,
      teams,
      roundState: { ...roundState, phase: 'resolved', resolvedCorrectly: true },
    });
  }

  // Host taps a choice (correct one always visible to the host). Handles both the
  // initial answer (phase 'answering') and the steal handoff (phase 'steal', after
  // either EXCLUSIVE's direct handoff or TIMED_WINDOW's recordStealBuzz) identically —
  // the same 3-choice UI, just with the answering team flipped.
  judge(choice: TToTOChoiceKey): TToTOState {
    const rs = this.state.roundState;
    if (rs.phase !== 'answering' && rs.phase !== 'steal') return this.state;
    if (!rs.answeringTeamId || !rs.correctChoice) return this.state;
    this.begin();

    if (choice === rs.correctChoice) {
      return this.awardPoints(rs.answeringTeamId);
    }

    // Miss: eliminate the choice, record who missed it, assign a stable crack. If this
    // was a hardware-player buzz, that specific wand is now locked out for the rest of
    // this question — their team isn't out (a teammate can still try), but they are.
    const eliminatedChoices = [...rs.eliminatedChoices, choice];
    const missedBy = [...rs.missedBy, { choice, teamId: rs.answeringTeamId }];
    const choiceCracks = { ...rs.choiceCracks, [choice]: pickCrack() };
    const attemptedControllerIds = rs.answeringControllerId
      ? [...rs.attemptedControllerIds, rs.answeringControllerId]
      : rs.attemptedControllerIds;

    if (eliminatedChoices.length >= 2) {
      // Double miss: the one remaining choice is known-correct by elimination but
      // unclaimed. Q1b decision: no score, reveal, move on.
      return this.patchRound({
        eliminatedChoices,
        missedBy,
        choiceCracks,
        attemptedControllerIds,
        phase: 'resolved',
        resolvedCorrectly: false,
        answeringControllerId: null,
        stealEligibleTeamId: null,
        stealWindowOpen: false,
        stealWindowExpiresAt: null,
      });
    }

    const otherTeamId = this.otherTeamId(rs.answeringTeamId);

    if (this.state.config.stealMode === 'TIMED_WINDOW' && this.state.config.buzzerMode === 'hardware-player') {
      // Buzzers go live for the steal: otherTeamId gets exclusive rights for
      // stealWindowSecs, then (routes.ts's timer) it opens to both teams (minus whoever's
      // in attemptedControllerIds, i.e. this teamId's missed wand can't re-buzz even once
      // it's "open"). Nobody is "answering" yet — that only happens once recordStealBuzz() fires.
      return this.patchRound({
        eliminatedChoices,
        missedBy,
        choiceCracks,
        attemptedControllerIds,
        phase: 'steal_armed',
        answeringTeamId: null,
        answeringControllerId: null,
        stealEligibleTeamId: otherTeamId,
        stealWindowOpen: false,
        stealWindowExpiresAt: Date.now() + this.state.config.stealWindowSecs * 1000,
      });
    }

    // EXCLUSIVE (default), or TIMED_WINDOW configured without hardware to actually run
    // an open buzz race — fall back to the simple direct handoff rather than getting
    // stuck in steal_armed with no way to ever record a buzz.
    return this.patchRound({
      eliminatedChoices,
      missedBy,
      choiceCracks,
      attemptedControllerIds,
      phase: 'steal',
      answeringTeamId: otherTeamId,
      answeringControllerId: null,
      stealEligibleTeamId: null,
      stealWindowOpen: false,
      stealWindowExpiresAt: null,
    });
  }

  // TIMED_WINDOW only — a team successfully buzzed in during the steal window (either
  // stage: exclusive-only or opened-to-both). Hands off to the same judge UI as any
  // other answer attempt.
  recordStealBuzz(teamId: string, controllerId: string | null = null): TToTOState {
    if (this.state.roundState.phase !== 'steal_armed') return this.state;
    this.begin();
    return this.patchRound({
      phase: 'steal',
      answeringTeamId: teamId,
      answeringControllerId: controllerId,
      stealEligibleTeamId: null,
      stealWindowOpen: false,
      stealWindowExpiresAt: null,
    });
  }

  // TIMED_WINDOW only — the exclusive window expired with no buzz; open it to both teams.
  // No further timeout after this — it's just a straight buzz race until someone presses.
  expandStealWindow(): TToTOState {
    const rs = this.state.roundState;
    if (rs.phase !== 'steal_armed' || rs.stealWindowOpen) return this.state;
    this.begin();
    return this.patchRound({ stealEligibleTeamId: null, stealWindowOpen: true, stealWindowExpiresAt: null });
  }

  // Advance to the next question, or the next round, or game_over.
  next(): TToTOState {
    const rs = this.state.roundState;
    if (rs.phase !== 'resolved') return this.state;
    this.begin();
    const round = this.state.rounds[rs.currentRoundIndex];
    const nextQuestionIndex = rs.currentQuestionIndex + 1;

    if (round && nextQuestionIndex < round.questions.length) {
      const shuffled = shuffleChoices(round.questions[nextQuestionIndex], this.fixedSlotsFor(round));
      return this.patchRound({
        phase: 'reading',
        currentQuestionIndex: nextQuestionIndex,
        answeringTeamId: null,
        answeringControllerId: null,
        attemptedControllerIds: [],
        eliminatedChoices: [],
        missedBy: [],
        resolvedCorrectly: null,
        choiceCracks: {},
        ...shuffled,
      });
    }

    const nextRoundIndex = rs.currentRoundIndex + 1;
    if (nextRoundIndex < this.state.rounds.length) {
      return this.enterRoundIntro(nextRoundIndex);
    }

    return this.patchRound({ phase: 'game_over' });
  }

  // Manually jump straight to the victory screen regardless of how far through the
  // rounds/questions play currently is — a host control, not an automatic transition
  // (mirrors Survey Says's/Name That Tune's manual "End Game" host button). Also clears
  // showIntro: /show checks that before phase, so leaving it set (e.g. right after
  // newGame()) would mask the victory screen with the game-intro animation instead.
  endGame(): TToTOState {
    this.begin();
    return this.commit({ ...this.state, showIntro: false, roundState: { ...this.state.roundState, phase: 'game_over' } });
  }

  // ── Wand test (Phase 2 hardware) ─────────────────────────────────────────────
  // Doesn't touch roundState/history — this is a diagnostic tool, not gameplay. The
  // actual judge window open/close + LED wiring lives in routes.ts (mirrors Survey Says).
  showWandTest(): TToTOState {
    return this.commit({ ...this.state, wandTestSeq: (this.state.wandTestSeq ?? 0) + 1 });
  }

  hideWandTest(): TToTOState {
    return this.commit({ ...this.state, wandTestSeq: 0 });
  }

  newGame(): TToTOState {
    this.begin();
    return this.commit({
      ...this.state,
      teams: this.state.teams.map(t => ({ ...t, score: 0 })) as [TToTOTeam, TToTOTeam],
      rounds: this.state.rounds.map(r => ({ ...r, letterStyle: undefined })),
      roundState: initialRoundState(),
      showIntro: true,
    });
  }
}

export const ttotoStore = new TToTOStore();
