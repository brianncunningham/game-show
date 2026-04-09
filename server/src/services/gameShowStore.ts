import { EventEmitter } from 'events';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  GameShowQuestion,
  GameShowRoundState,
  GameShowSocketMessage,
  GameShowState,
  GameShowTeam,
} from '../types/gameShow.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PERSIST_PATH = join(__dirname, '../../../game-state.json');

const loadPersistedState = (): GameShowState | null => {
  try {
    if (existsSync(PERSIST_PATH)) {
      const raw = readFileSync(PERSIST_PATH, 'utf-8');
      return JSON.parse(raw) as GameShowState;
    }
  } catch {
    console.warn('Could not load persisted state, using defaults.');
  }
  return null;
};

const persistState = (state: GameShowState): void => {
  try {
    writeFileSync(PERSIST_PATH, JSON.stringify(state, null, 2));
  } catch {
    console.warn('Could not persist state to disk.');
  }
};

const DEFAULT_TEAMS: GameShowTeam[] = [
  { id: 'team-a', name: 'Team A', players: [], score: 0, eliminated: false },
  { id: 'team-b', name: 'Team B', players: [], score: 0, eliminated: false },
];

const EMPTY_ROUND_STATE = (): GameShowRoundState => ({
  selectedQuestionId: null,
  activeSongIndex: null,
  usedQuestionIds: [],
  clipState: 'idle',
  buzzWinnerTeamId: null,
  attemptedTeamIds: [],
  stealingTeamId: null,
  answerState: 'pending',
  stealState: 'idle',
  lastPointsAwarded: null,
  artistBonusUsed: false,
  revealState: 'none',
});

const EMPTY_SONGS = [
  { title: '', artist: '' },
  { title: '', artist: '' },
  { title: '', artist: '' },
];

const DEFAULT_QUESTIONS: GameShowQuestion[] = [
  { id: 'r1q1', round: 1, category: 'Theme 1', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r1q2', round: 1, category: 'Theme 2', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r1q3', round: 1, category: 'Theme 3', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r1q4', round: 1, category: 'Theme 4', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r1q5', round: 1, category: 'Theme 5', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r2q1', round: 2, category: 'Theme 1', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r2q2', round: 2, category: 'Theme 2', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r2q3', round: 2, category: 'Theme 3', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r2q4', round: 2, category: 'Theme 4', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r2q5', round: 2, category: 'Theme 5', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r3q1', round: 3, category: 'Theme 1', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r3q2', round: 3, category: 'Theme 2', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r3q3', round: 3, category: 'Theme 3', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r3q4', round: 3, category: 'Theme 4', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r3q5', round: 3, category: 'Theme 5', songLabel: '', songs: [...EMPTY_SONGS], clipStart: 0, clipDuration: 0, basePoints: 100 },
];

const shuffle = <T,>(items: T[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const createInitialState = (): GameShowState => ({
  id: 'default-game',
  status: 'setup',
  currentRound: 1,
  chooserTeamId: DEFAULT_TEAMS[0].id,
  multiplier: 1,
  practiceMode: false,
  hostLocked: false,
  showIntro: false,
  showRules: false,
  randomizerSeq: 0,
  firstPickSeq: 0,
  firstPickTeamId: null,
  playerPool: [],
  teamCount: 2,
  eliminationEnabled: false,
  teams: DEFAULT_TEAMS,
  rules: {
    allowSteal: true,
    wrongBuzzPenalty: false,
    roundMultipliers: [1, 1, 2, 2, 3],
  },
  questions: DEFAULT_QUESTIONS,
  roundState: EMPTY_ROUND_STATE(),
  eventLog: [],
  updatedAt: new Date().toISOString(),
});

const migrateState = (state: GameShowState): GameShowState => ({
  ...state,
  teamCount: state.teamCount ?? (state.teams?.length as 2 | 3 | 4) ?? 2,
  eliminationEnabled: state.eliminationEnabled ?? false,
  teams: (state.teams ?? DEFAULT_TEAMS).map(t => ({ ...t, eliminated: t.eliminated ?? false })),
  questions: state.questions.map((q) => ({
    ...q,
    round: q.round ?? 1,
    songs: q.songs?.length ? q.songs : [{ title: '', artist: '' }, { title: '', artist: '' }, { title: '', artist: '' }],
  })),
  roundState: {
    ...EMPTY_ROUND_STATE(),
    ...state.roundState,
    attemptedTeamIds: state.roundState.attemptedTeamIds ?? [],
    stealingTeamId: state.roundState.stealingTeamId ?? null,
  },
});

class GameShowStore extends EventEmitter {
  private state: GameShowState = (() => {
    const persisted = loadPersistedState();
    return persisted ? migrateState(persisted) : createInitialState();
  })();
  private history: GameShowState[] = [];

  getState(): GameShowState {
    return this.state;
  }

  private canMutate(): boolean {
    return !this.state.hostLocked;
  }

  private commit(action: string, nextState: GameShowState): GameShowState {
    this.history.push(structuredClone(this.state));
    this.state = {
      ...nextState,
      eventLog: [
        ...nextState.eventLog,
        {
          action,
          at: new Date().toISOString(),
        },
      ].slice(-100),
      updatedAt: new Date().toISOString(),
    };

    const message: GameShowSocketMessage = {
      type: 'event',
      payload: {
        action,
        state: this.state,
      },
    };

    persistState(this.state);
    this.emit('change', message);
    return this.state;
  }

  subscribe(listener: (message: GameShowSocketMessage) => void): () => void {
    this.on('change', listener);
    return () => this.off('change', listener);
  }

  reset(): GameShowState {
    return this.commit('reset_game', createInitialState());
  }

  resetScores(): GameShowState {
    const activeTeams = this.state.teams.filter(t => !t.eliminated);
    return this.commit('reset_scores', {
      ...this.state,
      status: 'setup',
      currentRound: 1,
      chooserTeamId: activeTeams[0]?.id ?? this.state.teams[0]?.id ?? null,
      multiplier: this.state.rules.roundMultipliers[0] ?? 1,
      teams: this.state.teams.map((team) => ({ ...team, score: 0, eliminated: false })),
      roundState: EMPTY_ROUND_STATE(),
    });
  }

  patch(partial: Partial<GameShowState>): GameShowState {
    return this.commit('patch_state', {
      ...this.state,
      ...partial,
    });
  }

  updateConfig(config: Partial<Pick<GameShowState, 'practiceMode' | 'hostLocked' | 'playerPool' | 'teams' | 'questions' | 'rules'>>): GameShowState {
    return this.commit('update_config', {
      ...this.state,
      ...config,
    });
  }

  randomAssignPlayers(): GameShowState {
    const randomized = shuffle(this.state.playerPool.filter(Boolean));
    const teamCount = Math.max(this.state.teamCount ?? this.state.teams.length, 1);
    const nextTeams = this.buildTeamsForCount(teamCount).map((team) => ({ ...team, players: [] as string[], score: 0, eliminated: false }));

    randomized.forEach((player, index) => {
      nextTeams[index % teamCount].players.push(player);
    });

    return this.commit('random_assign_players', {
      ...this.state,
      status: 'setup',
      currentRound: 1,
      multiplier: this.state.rules.roundMultipliers[0] ?? 1,
      chooserTeamId: nextTeams[0]?.id ?? null,
      teams: nextTeams,
      randomizerSeq: (this.state.randomizerSeq ?? 0) + 1,
      roundState: EMPTY_ROUND_STATE(),
    });
  }

  private buildTeamsForCount(count: number): GameShowTeam[] {
    const ids = ['team-a', 'team-b', 'team-c', 'team-d'];
    const names = ['Team A', 'Team B', 'Team C', 'Team D'];
    return Array.from({ length: count }, (_, i) => (
      this.state.teams[i] ?? { id: ids[i], name: names[i], players: [], score: 0, eliminated: false }
    ));
  }

  startGame(): GameShowState {
    return this.commit('start_game', {
      ...this.state,
      status: 'live',
    });
  }

  selectQuestion(questionId: string): GameShowState {
    if (!this.canMutate() || (this.state.status !== 'live' && this.state.status !== 'sudden_death')) {
      return this.state;
    }

    const question = this.state.questions.find((item) => item.id === questionId);
    if (!question || this.state.roundState.selectedQuestionId) {
      return this.state;
    }

    return this.commit('select_question', {
      ...this.state,
      roundState: {
        ...EMPTY_ROUND_STATE(),
        selectedQuestionId: questionId,
        usedQuestionIds: this.state.roundState.usedQuestionIds,
      },
    });
  }

  selectSong(songIndex: number): GameShowState {
    if (!this.canMutate()) {
      return this.state;
    }

    if (!this.state.roundState.selectedQuestionId) {
      return this.state;
    }

    return this.commit('select_song', {
      ...this.state,
      roundState: {
        ...EMPTY_ROUND_STATE(),
        selectedQuestionId: this.state.roundState.selectedQuestionId,
        usedQuestionIds: this.state.roundState.usedQuestionIds,
        activeSongIndex: songIndex,
        clipState: 'active',
      },
    });
  }

  awardArtistBonus(): GameShowState {
    if (!this.canMutate()) {
      return this.state;
    }

    const buzzWinnerTeamId = this.state.roundState.buzzWinnerTeamId;
    if (!buzzWinnerTeamId || this.state.roundState.answerState !== 'correct' || this.state.roundState.artistBonusUsed) {
      return this.state;
    }

    const bonus = 50 * this.state.multiplier;

    return this.commit('award_artist_bonus', {
      ...this.state,
      teams: this.state.teams.map((team) =>
        team.id === buzzWinnerTeamId && !this.state.practiceMode
          ? { ...team, score: team.score + bonus }
          : team,
      ),
      roundState: {
        ...this.state.roundState,
        lastPointsAwarded: bonus,
        artistBonusUsed: true,
        revealState: 'artist',
      },
    });
  }

  setRevealState(mode: 'none' | 'title' | 'artist' | 'both'): GameShowState {
    if (!this.canMutate()) return this.state;
    return this.commit('set_reveal_state', {
      ...this.state,
      roundState: {
        ...this.state.roundState,
        revealState: mode,
      },
    });
  }

  triggerSuddenDeath(): GameShowState {
    if (!this.canMutate()) {
      return this.state;
    }

    return this.commit('sudden_death', {
      ...this.state,
      status: 'sudden_death',
      roundState: {
        ...EMPTY_ROUND_STATE(),
        usedQuestionIds: this.state.roundState.usedQuestionIds,
      },
    });
  }

  setBuzzWinner(teamId: string): GameShowState {
    if (!this.canMutate() || this.state.roundState.clipState !== 'active') {
      return this.state;
    }

    const team = this.state.teams.find((t) => t.id === teamId);
    if (!team || team.eliminated || this.state.roundState.buzzWinnerTeamId) {
      return this.state;
    }

    return this.commit('set_buzz_winner', {
      ...this.state,
      roundState: {
        ...this.state.roundState,
        buzzWinnerTeamId: teamId,
        attemptedTeamIds: [teamId],
      },
    });
  }

  markCorrect(): GameShowState {
    if (!this.canMutate()) {
      return this.state;
    }

    if (!this.state.roundState.selectedQuestionId || !this.state.roundState.buzzWinnerTeamId) {
      return this.state;
    }

    const question = this.state.questions.find((item) => item.id === this.state.roundState.selectedQuestionId);
    const awardedPoints = question ? question.basePoints * this.state.multiplier : 0;
    const buzzWinnerTeamId = this.state.roundState.buzzWinnerTeamId;

    const usedIds = this.state.roundState.selectedQuestionId
      ? [...new Set([...this.state.roundState.usedQuestionIds, this.state.roundState.selectedQuestionId])]
      : this.state.roundState.usedQuestionIds;

    return this.commit('mark_correct', {
      ...this.state,
      teams: this.state.teams.map((team) =>
        team.id === buzzWinnerTeamId && !this.state.practiceMode
          ? { ...team, score: team.score + awardedPoints }
          : team,
      ),
      roundState: {
        ...this.state.roundState,
        answerState: 'correct',
        stealState: 'resolved',
        clipState: 'resolved',
        lastPointsAwarded: awardedPoints,
        usedQuestionIds: usedIds,
        revealState: 'title',
      },
    });
  }

  markWrong(): GameShowState {
    if (!this.canMutate()) {
      return this.state;
    }

    if (!this.state.roundState.selectedQuestionId || !this.state.roundState.buzzWinnerTeamId || this.state.roundState.answerState === 'wrong') {
      return this.state;
    }

    const shouldAllowSteal = this.state.rules.allowSteal;
    const selectedQuestion = this.state.questions.find((item) => item.id === this.state.roundState.selectedQuestionId);
    const penalty = this.state.rules.wrongBuzzPenalty && selectedQuestion ? selectedQuestion.basePoints * this.state.multiplier : 0;
    const buzzWinnerTeamId = this.state.roundState.buzzWinnerTeamId;
    const attemptedTeamIds = [...new Set([...this.state.roundState.attemptedTeamIds, buzzWinnerTeamId])];

    // Check if any active, non-attempted teams remain for stealing
    const eligibleStealers = this.state.teams.filter(
      t => !t.eliminated && !attemptedTeamIds.includes(t.id)
    );
    const stealAvailable = shouldAllowSteal && eligibleStealers.length > 0;

    return this.commit('mark_wrong', {
      ...this.state,
      teams: this.state.teams.map((team) =>
        this.state.rules.wrongBuzzPenalty && team.id === buzzWinnerTeamId && !this.state.practiceMode
          ? { ...team, score: team.score - penalty }
          : team,
      ),
      roundState: {
        ...this.state.roundState,
        answerState: 'wrong',
        attemptedTeamIds,
        stealState: stealAvailable ? 'available' : 'resolved',
        stealingTeamId: null,
        lastPointsAwarded: penalty ? -penalty : null,
      },
    });
  }

  setStealingTeam(teamId: string): GameShowState {
    if (!this.canMutate() || this.state.roundState.stealState !== 'available') {
      return this.state;
    }
    const team = this.state.teams.find(t => t.id === teamId);
    if (!team || team.eliminated || this.state.roundState.attemptedTeamIds.includes(teamId)) {
      return this.state;
    }
    return this.commit('set_stealing_team', {
      ...this.state,
      roundState: { ...this.state.roundState, stealingTeamId: teamId },
    });
  }

  resolveSteal(success: boolean): GameShowState {
    if (!this.canMutate()) {
      return this.state;
    }

    if (this.state.roundState.stealState !== 'available') {
      return this.state;
    }

    const selectedQuestion = this.state.questions.find((item) => item.id === this.state.roundState.selectedQuestionId);
    const stealingTeamId = this.state.roundState.stealingTeamId;
    const stealingTeam = stealingTeamId ? this.state.teams.find(t => t.id === stealingTeamId) ?? null : null;
    const awardedPoints = success && selectedQuestion ? selectedQuestion.basePoints * this.state.multiplier : 0;

    const usedIds = this.state.roundState.selectedQuestionId
      ? [...new Set([...this.state.roundState.usedQuestionIds, this.state.roundState.selectedQuestionId])]
      : this.state.roundState.usedQuestionIds;

    if (success) {
      return this.commit('steal_success', {
        ...this.state,
        teams: this.state.teams.map((team) =>
          stealingTeam && team.id === stealingTeam.id && !this.state.practiceMode
            ? { ...team, score: team.score + awardedPoints }
            : team,
        ),
        roundState: {
          ...this.state.roundState,
          stealState: 'resolved',
          clipState: 'resolved',
          stealingTeamId: null,
          lastPointsAwarded: awardedPoints,
          usedQuestionIds: usedIds,
          revealState: 'both',
        },
      });
    }

    // Steal failed — add stealer to attempted, check if more teams can steal
    const attemptedTeamIds = stealingTeamId
      ? [...new Set([...this.state.roundState.attemptedTeamIds, stealingTeamId])]
      : this.state.roundState.attemptedTeamIds;

    const eligibleStealers = this.state.teams.filter(
      t => !t.eliminated && !attemptedTeamIds.includes(t.id)
    );

    return this.commit('steal_fail', {
      ...this.state,
      roundState: {
        ...this.state.roundState,
        stealState: eligibleStealers.length > 0 ? 'available' : 'resolved',
        clipState: eligibleStealers.length > 0 ? this.state.roundState.clipState : 'resolved',
        attemptedTeamIds,
        stealingTeamId: null,
        lastPointsAwarded: null,
        usedQuestionIds: eligibleStealers.length > 0 ? this.state.roundState.usedQuestionIds : usedIds,
      },
    });
  }

  eliminateTeam(teamId: string): GameShowState {
    if (!this.canMutate()) return this.state;
    const team = this.state.teams.find(t => t.id === teamId);
    if (!team || team.eliminated) return this.state;

    // If eliminated mid-round, add to attemptedTeamIds so they can't steal
    const attemptedTeamIds = [...new Set([...this.state.roundState.attemptedTeamIds, teamId])];
    const eligibleStealers = this.state.teams.filter(
      t => t.id !== teamId && !t.eliminated && !attemptedTeamIds.includes(t.id)
    );
    const stealState = this.state.roundState.stealState === 'available' && eligibleStealers.length === 0
      ? 'resolved' as const
      : this.state.roundState.stealState;

    // Advance chooser if eliminated team is current chooser
    const activeTeams = this.state.teams.map(t => t.id === teamId ? { ...t, eliminated: true } : t).filter(t => !t.eliminated);
    let chooserTeamId = this.state.chooserTeamId;
    if (chooserTeamId === teamId) {
      const idx = this.state.teams.findIndex(t => t.id === teamId);
      chooserTeamId = activeTeams[idx % activeTeams.length]?.id ?? activeTeams[0]?.id ?? null;
    }

    return this.commit('eliminate_team', {
      ...this.state,
      chooserTeamId,
      teams: this.state.teams.map(t => t.id === teamId ? { ...t, eliminated: true } : t),
      roundState: {
        ...this.state.roundState,
        attemptedTeamIds,
        stealState,
        stealingTeamId: this.state.roundState.stealingTeamId === teamId ? null : this.state.roundState.stealingTeamId,
      },
    });
  }

  reinstateTeam(teamId: string): GameShowState {
    if (!this.canMutate()) return this.state;
    return this.commit('reinstate_team', {
      ...this.state,
      teams: this.state.teams.map(t => t.id === teamId ? { ...t, eliminated: false } : t),
    });
  }

  nextRound(): GameShowState {
    if (!this.canMutate()) {
      return this.state;
    }

    const roundFinished = this.state.roundState.answerState === 'correct' || this.state.roundState.stealState === 'resolved';
    if (!roundFinished && this.state.roundState.selectedQuestionId) {
      return this.state;
    }

    const nextRound = this.state.currentRound + 1;
    const nextMultiplier = this.state.rules.roundMultipliers[nextRound - 1] ?? this.state.multiplier;
    const activeTeams = this.state.teams.filter(t => !t.eliminated);
    const currentChooserIndex = activeTeams.findIndex((team) => team.id === this.state.chooserTeamId);
    const nextChooser = activeTeams[(currentChooserIndex + 1) % activeTeams.length] ?? activeTeams[0];

    return this.commit('next_round', {
      ...this.state,
      currentRound: nextRound,
      multiplier: nextMultiplier,
      chooserTeamId: nextChooser?.id ?? null,
      roundState: EMPTY_ROUND_STATE(),
    });
  }

  resetRound(): GameShowState {
    if (!this.canMutate()) {
      return this.state;
    }

    const completedTheme = Boolean(this.state.roundState.selectedQuestionId);
    const usedIds = completedTheme
      ? [...new Set([...this.state.roundState.usedQuestionIds, this.state.roundState.selectedQuestionId!])]
      : this.state.roundState.usedQuestionIds;

    // Alternate chooser when a theme was completed: either answer resolved, or all songs were played through
    const answerResolved = this.state.roundState.answerState === 'correct' || this.state.roundState.stealState === 'resolved';
    const allSongsPlayed = this.state.roundState.activeSongIndex !== null && this.state.roundState.activeSongIndex >= 2;
    let nextChooserId = this.state.chooserTeamId;
    if (completedTheme && (answerResolved || allSongsPlayed)) {
      const activeTeams = this.state.teams.filter(t => !t.eliminated);
      const idx = activeTeams.findIndex(t => t.id === this.state.chooserTeamId);
      nextChooserId = activeTeams[(idx + 1) % activeTeams.length]?.id ?? this.state.chooserTeamId;
    }

    return this.commit('reset_round', {
      ...this.state,
      chooserTeamId: nextChooserId,
      roundState: { ...EMPTY_ROUND_STATE(), usedQuestionIds: usedIds },
    });
  }

  dismissFirstPick(): GameShowState {
    return this.commit('dismiss_first_pick', {
      ...this.state,
      firstPickSeq: 0,
    });
  }

  showBoard(): GameShowState {
    return this.commit('show_board', {
      ...this.state,
      showIntro: false,
      showRules: false,
      firstPickSeq: 0,
    });
  }

  randomFirstPick(): GameShowState {
    const activeTeams = this.state.teams.filter(t => !t.eliminated);
    const teamsWithPlayers = activeTeams.filter(t => t.players.length > 0);
    const pool = teamsWithPlayers.length > 0 ? teamsWithPlayers : activeTeams;
    const winner = pool[Math.floor(Math.random() * pool.length)];
    return this.commit('random_first_pick', {
      ...this.state,
      firstPickSeq: (this.state.firstPickSeq ?? 0) + 1,
      firstPickTeamId: winner?.id ?? null,
      chooserTeamId: winner?.id ?? this.state.chooserTeamId,
    });
  }

  toggleShowRules(show: boolean): GameShowState {
    return this.commit('toggle_show_rules', {
      ...this.state,
      showRules: show,
    });
  }

  toggleShowIntro(show: boolean): GameShowState {
    return this.commit('toggle_show_intro', {
      ...this.state,
      showIntro: show,
    });
  }

  endGame(winnerTeamId: string): GameShowState {
    if (!this.canMutate()) {
      return this.state;
    }
    return this.commit('end_game', {
      ...this.state,
      status: 'complete',
      chooserTeamId: winnerTeamId,
    });
  }

  toggleHostLock(): GameShowState {
    return this.commit('toggle_host_lock', {
      ...this.state,
      hostLocked: !this.state.hostLocked,
    });
  }

  undo(): GameShowState {
    const previous = this.history.pop();
    if (!previous) {
      return this.state;
    }

    this.state = previous;
    const message: GameShowSocketMessage = {
      type: 'event',
      payload: {
        action: 'undo',
        state: this.state,
      },
    };
    this.emit('change', message);
    return this.state;
  }
}

export const gameShowStore = new GameShowStore();
