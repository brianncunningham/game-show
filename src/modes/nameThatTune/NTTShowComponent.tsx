import { Box, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { EliminationScreen } from './EliminationScreen';
import { FirstPickScreen } from './FirstPickScreen';
import { GameShowStandaloneShell } from './GameShowStandaloneShell';
import { IntroScreen } from './IntroScreen';
import { RevealScreen } from './RevealScreen';
import { RulesScreen } from './RulesScreen';
import { ShowBoard } from './ShowBoard';
import { TeamRandomizer } from './TeamRandomizer';
import { VictoryScreen } from './VictoryScreen';
import { WandTestScreen } from './WandTestScreen';
import type { GameShowTeam } from './types';
import { useGameShowState } from './useGameShowState';

export const NTTShowComponent = () => {
  const { state, isLoading, error } = useGameShowState();
  const [showRandomizer, setShowRandomizer] = useState(false);
  const [showFirstPick, setShowFirstPick] = useState(false);
  const [showWandTest, setShowWandTest] = useState(false);
  const prevWandTestSeqRef = useRef<number>(-1);
  const [eliminatedTeam, setEliminatedTeam] = useState<GameShowTeam | null>(null);
  const [revealMode, setRevealMode] = useState<'title' | 'artist' | 'both' | null>(null);
  const prevSeqRef = useRef<number>(-1);
  const prevFirstPickSeqRef = useRef<number>(-1);
  const prevEliminatedIdsRef = useRef<Set<string>>(new Set());
  const prevRevealStateRef = useRef<string>('none');

  useEffect(() => {
    if (!state) return;
    const seq = state.randomizerSeq ?? 0;
    if (seq > 0 && seq !== prevSeqRef.current) {
      prevSeqRef.current = seq;
      setShowRandomizer(true);
    }
  }, [state?.randomizerSeq]);

  useEffect(() => {
    if (state?.status === 'live' || state?.status === 'sudden_death') {
      setShowRandomizer(false);
      setShowFirstPick(false);
    }
  }, [state?.status]);

  useEffect(() => {
    if (!state) return;
    if (!state.showIntro && !state.showRules && (state.firstPickSeq ?? 0) === 0) {
      setShowRandomizer(false);
      setShowFirstPick(false);
    }
  }, [state?.showIntro, state?.showRules, state?.firstPickSeq]);

  useEffect(() => {
    if (!state) return;
    const seq = state.wandTestSeq ?? 0;
    if (seq > 0 && seq !== prevWandTestSeqRef.current) {
      prevWandTestSeqRef.current = seq;
      setShowWandTest(true);
    }
  }, [state?.wandTestSeq]);

  useEffect(() => {
    if (!state) return;
    if ((state.wandTestSeq ?? 0) === 0) setShowWandTest(false);
  }, [state?.wandTestSeq]);

  useEffect(() => {
    if (state?.showIntro || state?.showRules) setShowWandTest(false);
  }, [state?.showIntro, state?.showRules]);

  useEffect(() => {
    if ((state?.randomizerSeq ?? 0) > 0) setShowWandTest(false);
  }, [state?.randomizerSeq]);

  useEffect(() => {
    if ((state?.firstPickSeq ?? 0) > 0) setShowWandTest(false);
  }, [state?.firstPickSeq]);

  useEffect(() => {
    if ((state?.randomizerSeq ?? 0) > 0) setShowFirstPick(false);
  }, [state?.randomizerSeq]);

  useEffect(() => {
    if ((state?.firstPickSeq ?? 0) > 0) setShowRandomizer(false);
  }, [state?.firstPickSeq]);

  useEffect(() => {
    setRevealMode(null);
    prevRevealStateRef.current = 'none';
  }, [state?.roundState.selectedQuestionId, state?.roundState.activeSongIndex]);

  useEffect(() => {
    if (!state) return;
    const next = state.roundState.revealState;
    const prev = prevRevealStateRef.current;
    if (next !== 'none' && next !== prev) {
      setRevealMode(next);
    }
    prevRevealStateRef.current = next;
  }, [state?.roundState.revealState]);

  useEffect(() => {
    if (!state) return;
    const prev = prevEliminatedIdsRef.current;
    for (const team of state.teams) {
      if (team.eliminated && !prev.has(team.id)) {
        setEliminatedTeam(team);
      }
    }
    prevEliminatedIdsRef.current = new Set(state.teams.filter(t => t.eliminated).map(t => t.id));
  }, [state?.teams]);

  useEffect(() => {
    if (!state) return;
    const seq = state.firstPickSeq ?? 0;
    if (seq === 0) {
      setShowFirstPick(false);
    } else if (seq !== prevFirstPickSeqRef.current) {
      prevFirstPickSeqRef.current = seq;
      setShowFirstPick(true);
    }
  }, [state?.firstPickSeq]);

  if (isLoading) {
    return (
      <GameShowStandaloneShell>
        <Box sx={{ p: 6 }}>
          <Typography variant="h3">Loading show screen…</Typography>
        </Box>
      </GameShowStandaloneShell>
    );
  }

  if (error || !state) {
    return (
      <GameShowStandaloneShell>
        <Box sx={{ p: 6 }}>
          <Typography color="error" variant="h4">{error ?? 'Show state unavailable'}</Typography>
        </Box>
      </GameShowStandaloneShell>
    );
  }

  if (showWandTest && state) {
    return (
      <GameShowStandaloneShell hideCursor>
        <WandTestScreen state={state} />
      </GameShowStandaloneShell>
    );
  }

  if (state.showIntro) {
    return (
      <GameShowStandaloneShell hideCursor>
        <IntroScreen />
      </GameShowStandaloneShell>
    );
  }

  if (state.showRules) {
    return (
      <GameShowStandaloneShell hideCursor>
        <RulesScreen clockConfig={state.clockConfig} />
      </GameShowStandaloneShell>
    );
  }

  if (showFirstPick) {
    return (
      <GameShowStandaloneShell hideCursor>
        <FirstPickScreen state={state} />
      </GameShowStandaloneShell>
    );
  }

  if (showRandomizer) {
    return (
      <GameShowStandaloneShell hideCursor>
        <TeamRandomizer state={state} />
      </GameShowStandaloneShell>
    );
  }

  if (state.status === 'complete') {
    return (
      <GameShowStandaloneShell hideCursor>
        <VictoryScreen state={state} />
      </GameShowStandaloneShell>
    );
  }

  return (
    <GameShowStandaloneShell hideCursor>
      <Box sx={{ position: 'relative' }}>
        <ShowBoard state={state} />
        {eliminatedTeam && (
          <EliminationScreen
            team={eliminatedTeam}
            onDone={() => setEliminatedTeam(null)}
          />
        )}
        {revealMode && state.roundState.selectedQuestionId && (() => {
          const q = state.questions.find(q => q.id === state.roundState.selectedQuestionId);
          const idx = state.roundState.activeSongIndex ?? 0;
          return q ? (
            <RevealScreen
              mode={revealMode}
              question={q}
              songIndex={idx}
              onDone={() => setRevealMode(null)}
            />
          ) : null;
        })()}
      </Box>
    </GameShowStandaloneShell>
  );
};
