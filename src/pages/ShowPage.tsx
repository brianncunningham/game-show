import { Box, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { GameShowStandaloneShell } from '../features/gameShow/GameShowStandaloneShell';
import { EliminationScreen } from '../features/gameShow/EliminationScreen';
import { RevealScreen } from '../features/gameShow/RevealScreen';
import { FirstPickScreen } from '../features/gameShow/FirstPickScreen';
import { IntroScreen } from '../features/gameShow/IntroScreen';
import { RulesScreen } from '../features/gameShow/RulesScreen';
import { ShowBoard } from '../features/gameShow/ShowBoard';
import { TeamRandomizer } from '../features/gameShow/TeamRandomizer';
import { VictoryScreen } from '../features/gameShow/VictoryScreen';
import type { GameShowTeam } from '../features/gameShow/types';
import { useGameShowState } from '../features/gameShow/useGameShowState';

export const ShowPage = () => {
  const { state, isLoading, error } = useGameShowState();
  const [showRandomizer, setShowRandomizer] = useState(false);
  const [showFirstPick, setShowFirstPick] = useState(false);
  const [eliminatedTeam, setEliminatedTeam] = useState<GameShowTeam | null>(null);
  const [revealMode, setRevealMode] = useState<'title' | 'artist' | 'both' | null>(null);
  const prevSeqRef = useRef<number>(-1);
  const prevFirstPickSeqRef = useRef<number>(-1);
  const prevEliminatedIdsRef = useRef<Set<string>>(new Set());
  const prevRevealStateRef = useRef<string>('none');

  // Show randomizer on every randomize press; also clears intro
  useEffect(() => {
    if (!state) return;
    const seq = state.randomizerSeq ?? 0;
    if (seq > 0 && seq !== prevSeqRef.current) {
      prevSeqRef.current = seq;
      setShowRandomizer(true);
    }
  }, [state?.randomizerSeq]);

  // Dismiss overlays when game goes live
  useEffect(() => {
    if (state?.status === 'live' || state?.status === 'sudden_death') {
      setShowRandomizer(false);
      setShowFirstPick(false);
    }
  }, [state?.status]);

  // showBoard() clears all server flags — clear client-side ones too
  useEffect(() => {
    if (!state) return;
    if (!state.showIntro && !state.showRules && (state.firstPickSeq ?? 0) === 0) {
      setShowRandomizer(false);
      setShowFirstPick(false);
    }
  }, [state?.showIntro, state?.showRules, state?.firstPickSeq]);

  // Dismiss first pick when randomizer fires, dismiss randomizer when first pick fires
  useEffect(() => {
    if ((state?.randomizerSeq ?? 0) > 0) setShowFirstPick(false);
  }, [state?.randomizerSeq]);

  useEffect(() => {
    if ((state?.firstPickSeq ?? 0) > 0) setShowRandomizer(false);
  }, [state?.firstPickSeq]);

  // Clear reveal when song or question changes
  useEffect(() => {
    setRevealMode(null);
    prevRevealStateRef.current = 'none';
  }, [state?.roundState.selectedQuestionId, state?.roundState.activeSongIndex]);

  // Detect revealState transitions
  useEffect(() => {
    if (!state) return;
    const next = state.roundState.revealState;
    const prev = prevRevealStateRef.current;
    if (next !== 'none' && next !== prev) {
      setRevealMode(next);
    }
    prevRevealStateRef.current = next;
  }, [state?.roundState.revealState]);

  // Detect newly eliminated teams
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

  // Show/dismiss first pick screen based on seq
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
        <RulesScreen />
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

export default ShowPage;
