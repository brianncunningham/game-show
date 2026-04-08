import { EventEmitter } from 'events';
import type {
  GameShowQuestion,
  GameShowSocketMessage,
  GameShowState,
  GameShowTeam,
} from '../types/gameShow';

const DEFAULT_TEAMS: GameShowTeam[] = [
  { id: 'team-a', name: 'Team A', players: [], score: 0 },
  { id: 'team-b', name: 'Team B', players: [], score: 0 },
];

const DEFAULT_QUESTIONS: GameShowQuestion[] = [
  {
    id: 'q1',
    category: 'Warmup',
    songLabel: 'Sample Song 1',
    clipStart: 0,
    clipDuration: 15,
    basePoints: 100,
  },
  {
    id: 'q2',
    category: 'Warmup',
    songLabel: 'Sample Song 2',
    clipStart: 15,
    clipDuration: 15,
    basePoints: 100,
  },
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
    clipState: 'idle',
    buzzWinnerTeamId: null,
    answerState: 'pending',
    stealState: 'idle',
    lastPointsAwarded: null,
  },
  eventLog: [],
  updatedAt: new Date().toISOString(),
});

class GameShowStore extends EventEmitter {
  private state: GameShowState = createInitialState();
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
        clipState: 'idle',
        buzzWinnerTeamId: null,
        answerState: 'pending',
        stealState: 'idle',
        lastPointsAwarded: null,
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
      teams: nextTeams,
    });
  }

  startGame(): GameShowState {
    return this.commit('start_game', {
      ...this.state,
      status: 'live',
    });
  }

  selectQuestion(questionId: string): GameShowState {
    if (!this.canMutate() || this.state.status !== 'live') {
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
        clipState: 'active',
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
        clipState: 'idle',
        buzzWinnerTeamId: null,
        answerState: 'pending',
        stealState: 'idle',
        lastPointsAwarded: null,
      },
    });
  }

  resetRound(): GameShowState {
    if (!this.canMutate()) {
      return this.state;
    }

    return this.commit('reset_round', {
      ...this.state,
      roundState: {
        selectedQuestionId: null,
        clipState: 'idle',
        buzzWinnerTeamId: null,
        answerState: 'pending',
        stealState: 'idle',
        lastPointsAwarded: null,
      },
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
