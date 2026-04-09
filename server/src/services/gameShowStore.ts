import { EventEmitter } from 'events';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  GameShowQuestion,
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
  { id: 'team-a', name: 'Team A', players: [], score: 0 },
  { id: 'team-b', name: 'Team B', players: [], score: 0 },
];

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
  teams: DEFAULT_TEAMS,
  rules: {
    allowSteal: true,
    wrongBuzzPenalty: false,
    roundMultipliers: [1, 1, 2, 2, 3],
  },
  questions: DEFAULT_QUESTIONS,
  roundState: {
    selectedQuestionId: null,
    activeSongIndex: null,
    usedQuestionIds: [],
    clipState: 'idle',
    buzzWinnerTeamId: null,
    answerState: 'pending',
    stealState: 'idle',
    lastPointsAwarded: null,
    artistBonusUsed: false,
  },
  eventLog: [],
  updatedAt: new Date().toISOString(),
});

const migrateState = (state: GameShowState): GameShowState => ({
  ...state,
  questions: state.questions.map((q) => ({
    ...q,
    round: q.round ?? 1,
    songs: q.songs?.length ? q.songs : [{ title: '', artist: '' }, { title: '', artist: '' }, { title: '', artist: '' }],
  })),
  roundState: {
    ...state.roundState,
    activeSongIndex: state.roundState.activeSongIndex ?? null,
    usedQuestionIds: state.roundState.usedQuestionIds ?? [],
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
    return this.commit('reset_scores', {
      ...this.state,
      status: 'setup',
      currentRound: 1,
      chooserTeamId: this.state.teams[0]?.id ?? null,
      multiplier: this.state.rules.roundMultipliers[0] ?? 1,
      teams: this.state.teams.map((team) => ({ ...team, score: 0 })),
      roundState: {
        selectedQuestionId: null,
        activeSongIndex: null,
        usedQuestionIds: [],
        clipState: 'idle',
        buzzWinnerTeamId: null,
        answerState: 'pending',
        stealState: 'idle',
        lastPointsAwarded: null,
        artistBonusUsed: false,
      },
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
    const teamCount = Math.max(this.state.teams.length, 1);
    const nextTeams = this.state.teams.map((team) => ({ ...team, players: [] as string[] }));

    randomized.forEach((player, index) => {
      nextTeams[index % teamCount].players.push(player);
    });

    return this.commit('random_assign_players', {
      ...this.state,
      status: 'setup',
      currentRound: 1,
      multiplier: this.state.rules.roundMultipliers[0] ?? 1,
      chooserTeamId: nextTeams[0]?.id ?? null,
      teams: nextTeams.map(t => ({ ...t, score: 0 })),
      randomizerSeq: (this.state.randomizerSeq ?? 0) + 1,
      roundState: {
        selectedQuestionId: null,
        activeSongIndex: null,
        usedQuestionIds: [],
        clipState: 'idle',
        buzzWinnerTeamId: null,
        answerState: 'pending',
        stealState: 'idle',
        lastPointsAwarded: null,
        artistBonusUsed: false,
      },
    });
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
        ...this.state.roundState,
        selectedQuestionId: questionId,
        activeSongIndex: null,
        clipState: 'idle',
        buzzWinnerTeamId: null,
        answerState: 'pending',
        stealState: 'idle',
        lastPointsAwarded: null,
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
        ...this.state.roundState,
        activeSongIndex: songIndex,
        clipState: 'active',
        buzzWinnerTeamId: null,
        answerState: 'pending',
        stealState: 'idle',
        lastPointsAwarded: null,
        artistBonusUsed: false,
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
        ...this.state.roundState,
        selectedQuestionId: null,
        activeSongIndex: null,
        clipState: 'idle',
        buzzWinnerTeamId: null,
        answerState: 'pending',
        stealState: 'idle',
        lastPointsAwarded: null,
      },
    });
  }

  setBuzzWinner(teamId: string): GameShowState {
    if (!this.canMutate() || this.state.roundState.clipState !== 'active') {
      return this.state;
    }

    const teamExists = this.state.teams.some((team) => team.id === teamId);
    if (!teamExists || this.state.roundState.buzzWinnerTeamId) {
      return this.state;
    }

    return this.commit('set_buzz_winner', {
      ...this.state,
      roundState: {
        ...this.state.roundState,
        buzzWinnerTeamId: teamId,
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
        stealState: shouldAllowSteal ? 'available' : 'resolved',
        lastPointsAwarded: penalty ? -penalty : null,
      },
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
    const buzzWinnerTeamId = this.state.roundState.buzzWinnerTeamId;
    const stealingTeam = this.state.teams.find((team) => team.id !== buzzWinnerTeamId) ?? null;
    const awardedPoints = success && selectedQuestion ? selectedQuestion.basePoints * this.state.multiplier : 0;

    const usedIds = this.state.roundState.selectedQuestionId
      ? [...new Set([...this.state.roundState.usedQuestionIds, this.state.roundState.selectedQuestionId])]
      : this.state.roundState.usedQuestionIds;

    return this.commit(success ? 'steal_success' : 'steal_fail', {
      ...this.state,
      teams: this.state.teams.map((team) =>
        success && stealingTeam && team.id === stealingTeam.id && !this.state.practiceMode
          ? { ...team, score: team.score + awardedPoints }
          : team,
      ),
      roundState: {
        ...this.state.roundState,
        stealState: 'resolved',
        clipState: 'resolved',
        lastPointsAwarded: awardedPoints,
        usedQuestionIds: usedIds,
      },
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
    const currentChooserIndex = this.state.teams.findIndex((team) => team.id === this.state.chooserTeamId);
    const nextChooser = this.state.teams[(currentChooserIndex + 1) % this.state.teams.length] ?? this.state.teams[0];

    return this.commit('next_round', {
      ...this.state,
      currentRound: nextRound,
      multiplier: nextMultiplier,
      chooserTeamId: nextChooser?.id ?? null,
      roundState: {
        selectedQuestionId: null,
        activeSongIndex: null,
        usedQuestionIds: [],
        clipState: 'idle',
        buzzWinnerTeamId: null,
        answerState: 'pending',
        stealState: 'idle',
        lastPointsAwarded: null,
        artistBonusUsed: false,
      },
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

    // Alternate chooser only when a theme was completed (not on a plain back-to-themes bail)
    const answerResolved = this.state.roundState.answerState === 'correct' || this.state.roundState.stealState === 'resolved';
    let nextChooserId = this.state.chooserTeamId;
    if (completedTheme && answerResolved) {
      const idx = this.state.teams.findIndex(t => t.id === this.state.chooserTeamId);
      nextChooserId = this.state.teams[(idx + 1) % this.state.teams.length]?.id ?? this.state.chooserTeamId;
    }

    return this.commit('reset_round', {
      ...this.state,
      chooserTeamId: nextChooserId,
      roundState: {
        selectedQuestionId: null,
        activeSongIndex: null,
        usedQuestionIds: usedIds,
        clipState: 'idle',
        buzzWinnerTeamId: null,
        answerState: 'pending',
        stealState: 'idle',
        lastPointsAwarded: null,
        artistBonusUsed: false,
      },
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
    const teams = this.state.teams.filter(t => t.players.length > 0);
    const pool = teams.length > 0 ? teams : this.state.teams;
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
