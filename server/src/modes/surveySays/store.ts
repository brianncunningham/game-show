import { existsSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  SurveySaysState,
  SurveySaysConfig,
  SurveyBoard,
  SurveySaysRoundState,
  SurveyTeam,
  GamePhase,
  ControllerAssignment,
} from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PERSIST_PATH = join(__dirname, '../../../../game-state-survey-says.json');

const loadPersistedState = (): SurveySaysState | null => {
  try {
    if (existsSync(PERSIST_PATH)) {
      const raw = readFileSync(PERSIST_PATH, 'utf-8');
      const s = JSON.parse(raw) as SurveySaysState;
      // Hydrate fields added after initial release
      if (!s.controllerAssignments) s.controllerAssignments = [];
      if (s.wandTestSeq === undefined) s.wandTestSeq = 0;
      return s;
    }
  } catch (e) {
    console.warn('SS: could not load persisted state, using defaults.', e);
  }
  return null;
};

const persistState = (state: SurveySaysState): void => {
  const tmp = PERSIST_PATH + '.tmp';
  try {
    writeFileSync(tmp, JSON.stringify(state, null, 2));
    renameSync(tmp, PERSIST_PATH);
  } catch (e) {
    console.warn('SS: could not persist state.', e);
  }
};

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: SurveySaysConfig = {
  buzzerMode: 'hardware',
  multiplierSchedule: [1, 1, 2, 3],
  winningThreshold: 300,
  sweepBonus: 0,
  answerTimerEnabled: false,
  answerTimerSecs: 30,
  addStolenAnswerPoints: false,
};

const DEFAULT_TEAMS: [SurveyTeam, SurveyTeam] = [
  { id: 'team-1', name: 'Family 1', score: 0, players: [] },
  { id: 'team-2', name: 'Family 2', score: 0, players: [] },
];

const MAX_POOL = 10;        // 2 families × 5 players
const MAX_PER_TEAM = 5;

/**
 * Assign wand controller IDs to players.
 * Team 0 players → wands 1–5, team 1 players → wands 6–10 (positional).
 */
const buildControllerAssignments = (teams: [SurveyTeam, SurveyTeam]): ControllerAssignment[] => {
  const assignments: ControllerAssignment[] = [];
  teams[0].players.forEach((playerName, i) => {
    assignments.push({ controllerId: String(i + 1), teamId: teams[0].id, playerName });
  });
  teams[1].players.forEach((playerName, i) => {
    assignments.push({ controllerId: String(5 + i + 1), teamId: teams[1].id, playerName });
  });
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

const initialRoundState = (): SurveySaysRoundState => ({
  phase: 'idle',
  currentRound: 1,
  currentBoardId: null,
  faceOffState: 'showing_board',
  faceOffWinnerTeamId: null,
  faceOffStrikeTeamId: null,
  faceOffTurnTeamId: null,
  faceOffStandingTeamId: null,
  faceOffStandingRank: null,
  faceOffPlayerIndex: 0,
  faceOffStrikesThisIndex: 0,
  mainPlayPlayerIndex: 0,
  controllingTeamId: null,
  stealingTeamId: null,
  strikeCount: 0,
  roundBank: 0,
  revealedAnswers: [],
  buzzWinnerTeamId: null,
  swept: false,
});

const createInitialState = (): SurveySaysState => ({
  config: { ...DEFAULT_CONFIG },
  teams: [{ ...DEFAULT_TEAMS[0] }, { ...DEFAULT_TEAMS[1] }],
  boards: [],
  roundState: initialRoundState(),
  showIntro: true,
  playerPool: [],
  randomizerSeq: 0,
  wandTestSeq: 0,
  controllerAssignments: [],
});

// ─── Store ────────────────────────────────────────────────────────────────────

class SurveySaysStore {
  private state: SurveySaysState = (() => {
    const persisted = loadPersistedState();
    return persisted ?? createInitialState();
  })();
  private history: SurveySaysState[] = [];

  getState(): SurveySaysState {
    return this.state;
  }

  // Snapshot current state so the host can Undo the next action. Call at the
  // start of every user-facing mutation.
  private begin(): void {
    this.history.push(structuredClone(this.state));
    if (this.history.length > 50) this.history.shift();
  }

  private commit(next: SurveySaysState): SurveySaysState {
    this.state = next;
    persistState(this.state);
    return this.state;
  }

  undo(): SurveySaysState {
    const prev = this.history.pop();
    if (prev) this.state = prev;
    persistState(this.state);
    return this.state;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  reset(): SurveySaysState {
    return this.commit(createInitialState());
  }

  // ── Config ──────────────────────────────────────────────────────────────────

  updateConfig(patch: Partial<Pick<SurveySaysState, 'config' | 'teams' | 'boards' | 'playerPool'>>): SurveySaysState {
    return this.commit({ ...this.state, ...patch });
  }

  // ── Players & teams ───────────────────────────────────────────────────────

  setPlayerPool(pool: string[]): SurveySaysState {
    const cleaned = [...new Set(pool.map(p => p.trim()).filter(Boolean))].slice(0, MAX_POOL);
    this.begin();
    // Drop any assigned players no longer in the pool.
    const teams = this.state.teams.map(t => ({
      ...t,
      players: t.players.filter(p => cleaned.includes(p)),
    })) as [SurveyTeam, SurveyTeam];
    return this.commit({ ...this.state, playerPool: cleaned, teams });
  }

  setTeams(teams: SurveyTeam[]): SurveySaysState {
    this.begin();
    const next = this.state.teams.map((t, i) => {
      const incoming = teams.find(x => x.id === t.id) ?? teams[i];
      if (!incoming) return t;
      return {
        ...t,
        name: incoming.name ?? t.name,
        players: (incoming.players ?? t.players).slice(0, MAX_PER_TEAM),
      };
    }) as [SurveyTeam, SurveyTeam];
    return this.commit({ ...this.state, teams: next });
  }

  // Shuffle the pool (max 10) into the two families (max 5 each) and trigger
  // the /show randomizer animation.
  randomAssignPlayers(): SurveySaysState {
    this.begin();
    const pool = shuffle(this.state.playerPool.filter(Boolean)).slice(0, MAX_POOL);
    const teams = [
      { ...this.state.teams[0], players: [] as string[] },
      { ...this.state.teams[1], players: [] as string[] },
    ] as [SurveyTeam, SurveyTeam];
    pool.forEach((player, i) => {
      const target = i % 2;
      if (teams[target].players.length >= MAX_PER_TEAM) {
        teams[(target + 1) % 2].players.push(player);
      } else {
        teams[target].players.push(player);
      }
    });
    const controllerAssignments = buildControllerAssignments(teams);
    return this.commit({
      ...this.state,
      teams,
      controllerAssignments,
      randomizerSeq: this.state.randomizerSeq + 1,
    });
  }

  setBoards(boards: SurveyBoard[]): SurveySaysState {
    return this.commit({ ...this.state, boards });
  }

  setTeamName(teamId: string, name: string): SurveySaysState {
    return this.commit({
      ...this.state,
      teams: this.state.teams.map(t =>
        t.id === teamId ? { ...t, name } : t
      ) as [SurveyTeam, SurveyTeam],
    });
  }

  // ── Show / Intro ────────────────────────────────────────────────────────────

  setShowIntro(show: boolean): SurveySaysState {
    return this.commit({ ...this.state, showIntro: show });
  }

  showWandTest(): SurveySaysState {
    return this.commit({ ...this.state, wandTestSeq: (this.state.wandTestSeq ?? 0) + 1 });
  }

  hideWandTest(): SurveySaysState {
    return this.commit({ ...this.state, wandTestSeq: 0 });
  }

  // ── Round control ───────────────────────────────────────────────────────────

  private patchRound(patch: Partial<SurveySaysRoundState>): SurveySaysState {
    return this.commit({
      ...this.state,
      roundState: { ...this.state.roundState, ...patch },
    });
  }

  loadBoard(boardId: string): SurveySaysState {
    this.begin();
    return this.patchRound({
      phase: 'face_off',
      currentBoardId: boardId,
      faceOffState: 'announcing',
      faceOffWinnerTeamId: null,
      faceOffStrikeTeamId: null,
      faceOffTurnTeamId: null,
      faceOffStandingTeamId: null,
      faceOffStandingRank: null,
      // Round N starts the rotation at player index N-1 (each team mods by its own size).
      faceOffPlayerIndex: this.state.roundState.currentRound - 1,
      faceOffStrikesThisIndex: 0,
      mainPlayPlayerIndex: 0,
      controllingTeamId: null,
      stealingTeamId: null,
      strikeCount: 0,
      roundBank: 0,
      revealedAnswers: [],
      buzzWinnerTeamId: null,
      swept: false,
    });
  }

  showBoard(): SurveySaysState {
    this.begin();
    return this.patchRound({ faceOffState: 'showing_board' });
  }

  // Reveal the question AND arm the buzzers in one step (no separate arm action).
  revealQuestion(): SurveySaysState {
    this.begin();
    return this.patchRound({ faceOffState: 'waiting_buzz' });
  }

  // New game: keep boards/config/team names, reset scores + round to start.
  newGame(): SurveySaysState {
    this.begin();
    return this.commit({
      ...this.state,
      teams: this.state.teams.map(t => ({ ...t, score: 0 })) as [SurveyTeam, SurveyTeam],
      roundState: initialRoundState(),
      showIntro: true,
    });
  }

  // ── Face-off ────────────────────────────────────────────────────────────────

  // First buzz decides who answers first. After this, turns alternate automatically.
  recordBuzz(teamId: string): SurveySaysState {
    if (this.state.roundState.faceOffState !== 'waiting_buzz') return this.state;
    this.begin();
    return this.patchRound({
      buzzWinnerTeamId: teamId,
      faceOffTurnTeamId: teamId,
      faceOffStrikeTeamId: null,
      faceOffStrikesThisIndex: 0,
      faceOffState: 'answering',
    });
  }

  private otherTeamId(teamId: string | null): string {
    const other = this.state.teams.find(t => t.id !== teamId);
    return other?.id ?? this.state.teams[0].id;
  }

  // Reveal an answer onto the board + add its points to the bank (no sweep/award).
  private addRevealed(rank: number): { bank: number; revealed: SurveySaysRoundState['revealedAnswers'] } {
    const board = this.state.boards.find(b => b.id === this.state.roundState.currentBoardId);
    const answer = board?.answers.find(a => a.rank === rank);
    const bank = this.state.roundState.roundBank + (answer?.points ?? 0);
    const revealed = [
      ...this.state.roundState.revealedAnswers,
      { rank, revealedDuringPlay: true },
    ];
    return { bank, revealed };
  }

  // Host taps the answer the currently-answering team gave during face-off.
  // Resolution is fully gameplay-driven (never a host "who wins" choice).
  faceOffAnswer(rank: number): SurveySaysState {
    const rs = this.state.roundState;
    if (rs.faceOffState !== 'answering' || !rs.faceOffTurnTeamId) return this.state;
    this.begin();
    const team = rs.faceOffTurnTeamId;
    const { bank, revealed } = this.addRevealed(rank);

    // #1 answer always wins the face-off immediately.
    if (rank === 1) {
      this.patchRound({ roundBank: bank, revealedAnswers: revealed, faceOffStrikeTeamId: null });
      return this.resolveFaceOff(team);
    }

    // First valid (non-#1) answer wins if opponent already struck (faceOffStrikesThisIndex > 0).
    // Otherwise, opponent gets one chance to beat it.
    if (!rs.faceOffStandingTeamId) {
      // If opponent already struck, this team wins immediately
      if (rs.faceOffStrikesThisIndex > 0) {
        this.patchRound({ roundBank: bank, revealedAnswers: revealed, faceOffStrikeTeamId: null });
        return this.resolveFaceOff(team);
      }
      // Otherwise, set standing answer and give opponent a chance
      return this.patchRound({
        roundBank: bank,
        revealedAnswers: revealed,
        faceOffStandingTeamId: team,
        faceOffStandingRank: rank,
        faceOffTurnTeamId: this.otherTeamId(team),
        faceOffStrikeTeamId: null,
      });
    }

    // Challenger answered: lower rank number = better. Best answer wins control.
    this.patchRound({ roundBank: bank, revealedAnswers: revealed, faceOffStrikeTeamId: null });
    const standingRank = rs.faceOffStandingRank ?? Number.MAX_SAFE_INTEGER;
    const winner = rank < standingRank ? team : rs.faceOffStandingTeamId;
    return this.resolveFaceOff(winner);
  }

  // Host marks the currently-answering team wrong.
  faceOffStrike(): SurveySaysState {
    const rs = this.state.roundState;
    if (rs.faceOffState !== 'answering' || !rs.faceOffTurnTeamId) return this.state;
    this.begin();
    const team = rs.faceOffTurnTeamId;

    // If the other team already has a standing answer, this team failed to beat it → they win.
    if (rs.faceOffStandingTeamId) {
      this.patchRound({ faceOffStrikeTeamId: team });
      return this.resolveFaceOff(rs.faceOffStandingTeamId);
    }

    // No standing answer yet → keep alternating. Once BOTH families have struck at
    // the current player index, advance the rotation to the next player on each side
    // and hand the turn back to the family that buzzed in first.
    const struck = rs.faceOffStrikesThisIndex + 1;
    if (struck >= 2) {
      return this.patchRound({
        faceOffStrikeTeamId: team,
        faceOffTurnTeamId: rs.buzzWinnerTeamId ?? this.otherTeamId(team),
        faceOffPlayerIndex: rs.faceOffPlayerIndex + 1,
        faceOffStrikesThisIndex: 0,
      });
    }
    return this.patchRound({
      faceOffStrikeTeamId: team,
      faceOffTurnTeamId: this.otherTeamId(team),
      faceOffStrikesThisIndex: struck,
    });
  }

  private resolveFaceOff(winnerTeamId: string): SurveySaysState {
    return this.patchRound({
      faceOffWinnerTeamId: winnerTeamId,
      faceOffState: 'resolved',
      phase: 'play_or_pass',
    });
  }

  // ── Play or Pass ─────────────────────────────────────────────────────────────

  setPlayOrPass(choice: 'play' | 'pass'): SurveySaysState {
    this.begin();
    const { faceOffWinnerTeamId, faceOffPlayerIndex } = this.state.roundState;
    const otherTeam = this.state.teams.find(t => t.id !== faceOffWinnerTeamId);
    const controllingTeamId = choice === 'play'
      ? faceOffWinnerTeamId
      : (otherTeam?.id ?? faceOffWinnerTeamId);
    // Main play continues the rotation: the next guesser is the player AFTER the
    // last face-off guesser on the controlling team.
    return this.patchRound({
      phase: 'main_play',
      controllingTeamId,
      mainPlayPlayerIndex: faceOffPlayerIndex + 1,
    });
  }

  // ── Main Play ────────────────────────────────────────────────────────────────

  revealAnswer(rank: number): SurveySaysState {
    this.begin();
    const board = this.state.boards.find(b => b.id === this.state.roundState.currentBoardId);
    const answer = board?.answers.find(a => a.rank === rank);
    const newBank = this.state.roundState.roundBank + (answer?.points ?? 0);
    const newRevealed = [
      ...this.state.roundState.revealedAnswers,
      { rank, revealedDuringPlay: true },
    ];
    const allRevealed = board
      ? board.answers.every(a => newRevealed.some(r => r.rank === a.rank))
      : false;

    if (allRevealed) {
      // Swept — award immediately
      return this.awardBank(
        this.state.roundState.controllingTeamId!,
        newBank,
        newRevealed,
        true,
      );
    }

    // Each guess advances to the next player on the controlling team.
    return this.patchRound({
      roundBank: newBank,
      revealedAnswers: newRevealed,
      mainPlayPlayerIndex: this.state.roundState.mainPlayPlayerIndex + 1,
    });
  }

  addStrike(): SurveySaysState {
    this.begin();
    const newStrikes = this.state.roundState.strikeCount + 1;
    const nextGuesser = this.state.roundState.mainPlayPlayerIndex + 1;
    if (newStrikes >= 3) {
      // Auto-hand the steal to the other (non-controlling) team — no host prompt.
      const stealingTeamId = this.otherTeamId(this.state.roundState.controllingTeamId);
      return this.patchRound({ strikeCount: newStrikes, phase: 'steal', stealingTeamId });
    }
    return this.patchRound({ strikeCount: newStrikes, mainPlayPlayerIndex: nextGuesser });
  }

  // ── Steal ────────────────────────────────────────────────────────────────────

  setStealingTeam(teamId: string): SurveySaysState {
    return this.patchRound({ stealingTeamId: teamId });
  }

  resolveSteal(success: boolean, stealAnswerRank?: number): SurveySaysState {
    this.begin();
    const { controllingTeamId, stealingTeamId, roundBank } = this.state.roundState;
    const winnerTeamId = success ? stealingTeamId! : controllingTeamId!;

    const finalBank = roundBank;
    let newRevealed = [...this.state.roundState.revealedAnswers];

    // On a successful steal we reveal the stolen answer for show, but its points are
    // NOT added to the bank — the stealing team wins the points accumulated up to the
    // 3rd strike only.
    if (success && stealAnswerRank !== undefined) {
      newRevealed = [...newRevealed, { rank: stealAnswerRank, revealedDuringPlay: true }];
    }

    return this.awardBank(winnerTeamId, finalBank, newRevealed, false);
  }

  // ── Post-round reveal ────────────────────────────────────────────────────────

  revealAnswerPostRound(rank: number): SurveySaysState {
    this.begin();
    const newRevealed = [
      ...this.state.roundState.revealedAnswers,
      { rank, revealedDuringPlay: false },
    ];
    return this.patchRound({ revealedAnswers: newRevealed });
  }

  // ── Scoring & round transitions ──────────────────────────────────────────────

  private multiplierForRound(round: number): number {
    const schedule = this.state.config.multiplierSchedule;
    return schedule[round - 1] ?? schedule[schedule.length - 1] ?? 1;
  }

  private awardBank(
    winnerTeamId: string,
    bank: number,
    revealedAnswers: SurveySaysRoundState['revealedAnswers'],
    swept: boolean,
  ): SurveySaysState {
    const { currentRound } = this.state.roundState;
    const multiplier = this.multiplierForRound(currentRound);
    const bonus = swept ? this.state.config.sweepBonus : 0;
    const points = bank * multiplier + bonus;

    const newTeams = this.state.teams.map(t =>
      t.id === winnerTeamId ? { ...t, score: t.score + points } : t
    ) as [SurveyTeam, SurveyTeam];

    const winnerScore = newTeams.find(t => t.id === winnerTeamId)!.score;
    const gameOver = winnerScore >= this.state.config.winningThreshold;

    return this.commit({
      ...this.state,
      teams: newTeams,
      roundState: {
        ...this.state.roundState,
        phase: gameOver ? 'game_over' : 'post_round',
        revealedAnswers,
        swept,
      },
    });
  }

  advanceRound(): SurveySaysState {
    this.begin();
    const nextRound = this.state.roundState.currentRound + 1;
    return this.patchRound({
      ...initialRoundState(),
      currentRound: nextRound,
    });
  }

  // ── Manual score adjustment ──────────────────────────────────────────────────

  adjustScore(teamId: string, delta: number): SurveySaysState {
    return this.commit({
      ...this.state,
      teams: this.state.teams.map(t =>
        t.id === teamId ? { ...t, score: Math.max(0, t.score + delta) } : t
      ) as [SurveyTeam, SurveyTeam],
    });
  }

  setPhase(phase: GamePhase): SurveySaysState {
    return this.patchRound({ phase });
  }
}

export const surveySaysStore = new SurveySaysStore();
