import type {
  SurveySaysState,
  SurveySaysConfig,
  SurveyBoard,
  SurveySaysRoundState,
  SurveyTeam,
  GamePhase,
} from './types.js';

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
  { id: 'team-1', name: 'Family 1', score: 0 },
  { id: 'team-2', name: 'Family 2', score: 0 },
];

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
});

// ─── Store ────────────────────────────────────────────────────────────────────

class SurveySaysStore {
  private state: SurveySaysState = createInitialState();

  getState(): SurveySaysState {
    return this.state;
  }

  reset(): SurveySaysState {
    this.state = createInitialState();
    return this.state;
  }

  // ── Config ──────────────────────────────────────────────────────────────────

  updateConfig(patch: Partial<Pick<SurveySaysState, 'config' | 'teams' | 'boards'>>): SurveySaysState {
    this.state = { ...this.state, ...patch };
    return this.state;
  }

  setBoards(boards: SurveyBoard[]): SurveySaysState {
    this.state = { ...this.state, boards };
    return this.state;
  }

  setTeamName(teamId: string, name: string): SurveySaysState {
    this.state = {
      ...this.state,
      teams: this.state.teams.map(t =>
        t.id === teamId ? { ...t, name } : t
      ) as [SurveyTeam, SurveyTeam],
    };
    return this.state;
  }

  // ── Show / Intro ────────────────────────────────────────────────────────────

  setShowIntro(show: boolean): SurveySaysState {
    this.state = { ...this.state, showIntro: show };
    return this.state;
  }

  // ── Round control ───────────────────────────────────────────────────────────

  private patchRound(patch: Partial<SurveySaysRoundState>): SurveySaysState {
    this.state = {
      ...this.state,
      roundState: { ...this.state.roundState, ...patch },
    };
    return this.state;
  }

  loadBoard(boardId: string): SurveySaysState {
    return this.patchRound({
      phase: 'face_off',
      currentBoardId: boardId,
      faceOffState: 'showing_board',
      faceOffWinnerTeamId: null,
      faceOffStrikeTeamId: null,
      faceOffTurnTeamId: null,
      faceOffStandingTeamId: null,
      faceOffStandingRank: null,
      controllingTeamId: null,
      stealingTeamId: null,
      strikeCount: 0,
      roundBank: 0,
      revealedAnswers: [],
      buzzWinnerTeamId: null,
      swept: false,
    });
  }

  // Reveal the question AND arm the buzzers in one step (no separate arm action).
  revealQuestion(): SurveySaysState {
    return this.patchRound({ faceOffState: 'waiting_buzz' });
  }

  // New game: keep boards/config/team names, reset scores + round to start.
  newGame(): SurveySaysState {
    this.state = {
      ...this.state,
      teams: this.state.teams.map(t => ({ ...t, score: 0 })) as [SurveyTeam, SurveyTeam],
      roundState: initialRoundState(),
      showIntro: true,
    };
    return this.state;
  }

  // ── Face-off ────────────────────────────────────────────────────────────────

  // First buzz decides who answers first. After this, turns alternate automatically.
  recordBuzz(teamId: string): SurveySaysState {
    if (this.state.roundState.faceOffState !== 'waiting_buzz') return this.state;
    return this.patchRound({
      buzzWinnerTeamId: teamId,
      faceOffTurnTeamId: teamId,
      faceOffStrikeTeamId: null,
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
    const team = rs.faceOffTurnTeamId;
    const { bank, revealed } = this.addRevealed(rank);

    // #1 answer always wins the face-off immediately.
    if (rank === 1) {
      this.patchRound({ roundBank: bank, revealedAnswers: revealed, faceOffStrikeTeamId: null });
      return this.resolveFaceOff(team);
    }

    // First valid (non-#1) answer: the other team gets one chance to beat it.
    if (!rs.faceOffStandingTeamId) {
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
    const team = rs.faceOffTurnTeamId;

    // If the other team already has a standing answer, this team failed to beat it → they win.
    if (rs.faceOffStandingTeamId) {
      this.patchRound({ faceOffStrikeTeamId: team });
      return this.resolveFaceOff(rs.faceOffStandingTeamId);
    }

    // No standing answer yet → pass the turn to the other team (alternate until someone answers).
    return this.patchRound({
      faceOffStrikeTeamId: team,
      faceOffTurnTeamId: this.otherTeamId(team),
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
    const { faceOffWinnerTeamId } = this.state.roundState;
    const otherTeam = this.state.teams.find(t => t.id !== faceOffWinnerTeamId);
    const controllingTeamId = choice === 'play'
      ? faceOffWinnerTeamId
      : (otherTeam?.id ?? faceOffWinnerTeamId);
    return this.patchRound({ phase: 'main_play', controllingTeamId });
  }

  // ── Main Play ────────────────────────────────────────────────────────────────

  revealAnswer(rank: number): SurveySaysState {
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

    return this.patchRound({ roundBank: newBank, revealedAnswers: newRevealed });
  }

  addStrike(): SurveySaysState {
    const newStrikes = this.state.roundState.strikeCount + 1;
    if (newStrikes >= 3) {
      // Auto-hand the steal to the other (non-controlling) team — no host prompt.
      const stealingTeamId = this.otherTeamId(this.state.roundState.controllingTeamId);
      return this.patchRound({ strikeCount: newStrikes, phase: 'steal', stealingTeamId });
    }
    return this.patchRound({ strikeCount: newStrikes });
  }

  // ── Steal ────────────────────────────────────────────────────────────────────

  setStealingTeam(teamId: string): SurveySaysState {
    return this.patchRound({ stealingTeamId: teamId });
  }

  resolveSteal(success: boolean, stealAnswerRank?: number): SurveySaysState {
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

    this.state = {
      ...this.state,
      teams: newTeams,
      roundState: {
        ...this.state.roundState,
        phase: gameOver ? 'game_over' : 'post_round',
        revealedAnswers,
        swept,
      },
    };
    return this.state;
  }

  advanceRound(): SurveySaysState {
    const nextRound = this.state.roundState.currentRound + 1;
    return this.patchRound({
      ...initialRoundState(),
      currentRound: nextRound,
    });
  }

  // ── Manual score adjustment ──────────────────────────────────────────────────

  adjustScore(teamId: string, delta: number): SurveySaysState {
    this.state = {
      ...this.state,
      teams: this.state.teams.map(t =>
        t.id === teamId ? { ...t, score: Math.max(0, t.score + delta) } : t
      ) as [SurveyTeam, SurveyTeam],
    };
    return this.state;
  }

  setPhase(phase: GamePhase): SurveySaysState {
    return this.patchRound({ phase });
  }
}

export const surveySaysStore = new SurveySaysStore();
