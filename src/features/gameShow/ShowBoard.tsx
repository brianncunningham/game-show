import { useEffect, useMemo, useRef, useState } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import MicIcon from '@mui/icons-material/Mic';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import RadioIcon from '@mui/icons-material/Radio';
import AlbumIcon from '@mui/icons-material/Album';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { Box, Grid, Stack, Typography } from '@mui/material';
import type { GameShowState } from './types';

const themeStyles = [
  { color: '#ff4fd8', glow: 'rgba(255,79,216,0.55)', icon: <MicIcon sx={{ fontSize: 44 }} /> },
  { color: '#40d8ff', glow: 'rgba(64,216,255,0.55)', icon: <AlbumIcon sx={{ fontSize: 44 }} /> },
  { color: '#ff6548', glow: 'rgba(255,101,72,0.55)', icon: <MusicNoteIcon sx={{ fontSize: 44 }} /> },
  { color: '#5ab7ff', glow: 'rgba(90,183,255,0.55)', icon: <TheaterComedyIcon sx={{ fontSize: 44 }} /> },
  { color: '#ffd54a', glow: 'rgba(255,213,74,0.55)', icon: <OndemandVideoIcon sx={{ fontSize: 44 }} /> },
];


const SONG_COUNT = 3;

export const ShowBoard = ({ state }: { state: GameShowState }) => {
  const selectedQuestion = state.questions.find((question) => question.id === state.roundState.selectedQuestionId) ?? null;
  const chooserTeam = state.teams.find((team) => team.id === state.chooserTeamId) ?? null;
  const buzzWinnerTeamId = state.roundState.buzzWinnerTeamId;
  const winningTeamId = state.roundState.answerState === 'correct' ? state.roundState.buzzWinnerTeamId : null;
  const artistBonusTeamId = state.roundState.artistBonusUsed ? state.roundState.buzzWinnerTeamId : null;
  const isCorrectPhase = state.roundState.answerState === 'correct';
  // isWrongPhase: true for plain wrong answers; also re-enabled during the stealWrongFlash window (see below)
  const isRawWrongPhase = state.roundState.answerState === 'wrong';
  const isStealAvailable = state.roundState.stealState === 'available';
  // stealingTeamId comes directly from roundState (set by setStealingTeam action)
  const stealingTeamId = isStealAvailable ? (state.roundState.stealingTeamId ?? null) : null;
  const isSuddenDeath = state.status === 'sudden_death';
  const hasActiveTheme = Boolean(state.roundState.selectedQuestionId);
  const activeSongIndex = state.roundState.activeSongIndex;
  const usedQuestionIds = state.roundState.usedQuestionIds ?? [];
  const currentRoundQuestions = state.questions.filter(q => q.round === state.currentRound);

  const previousScoresRef = useRef<Record<string, number>>({});
  const [displayScores, setDisplayScores] = useState<Record<string, number>>({});
  const [scoreAnimatingTeamId, setScoreAnimatingTeamId] = useState<string | null>(null);
  const [floatingPoints, setFloatingPoints] = useState<{ teamId: string; value: number } | null>(null);
  const [correctSubPhase, setCorrectSubPhase] = useState<'celebrate' | 'score'>('celebrate');
  const [artistBonusFlash, setArtistBonusFlash] = useState(false);
  const [stealSuccessFlash, setStealSuccessFlash] = useState(false);
  const [stealSuccessTeamId, setStealSuccessTeamId] = useState<string | null>(null);
  const [stealWrongFlash, setStealWrongFlash] = useState(false);
  const [stealFailFlash, setStealFailFlash] = useState(false);
  const [stealOriginalBuzzerId, setStealOriginalBuzzerId] = useState<string | null>(null);
  const prevStealStateRef = useRef<string>('idle');

  // Derived: show the wrong-answer ✕ either for a plain wrong, or during the 2s steal-wrong window
  const isWrongPhase = (isRawWrongPhase && state.roundState.stealState === 'idle') || stealWrongFlash;
  const wrongTeamId = isWrongPhase ? (stealWrongFlash ? stealOriginalBuzzerId : buzzWinnerTeamId) : null;

  useEffect(() => {
    if (isCorrectPhase) {
      setCorrectSubPhase('celebrate');
      const t = window.setTimeout(() => setCorrectSubPhase('score'), 2200);
      return () => window.clearTimeout(t);
    }
  }, [isCorrectPhase]);

  // Dedicated effect for stealWrongFlash — isolated so its 2s timer is never cancelled by other dep changes
  const prevStealForWrongRef = useRef<string>('idle');
  useEffect(() => {
    const curr = state.roundState.stealState;
    if (curr === 'idle') {
      prevStealForWrongRef.current = curr;
      setStealWrongFlash(false);
      return;
    }
    if (prevStealForWrongRef.current === 'idle' && curr === 'available') {
      setStealOriginalBuzzerId(buzzWinnerTeamId);
      setStealWrongFlash(true);
      const t = window.setTimeout(() => setStealWrongFlash(false), 2000);
      prevStealForWrongRef.current = curr;
      return () => window.clearTimeout(t);
    }
    prevStealForWrongRef.current = curr;
  }, [state.roundState.stealState]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const prev = prevStealStateRef.current;
    const curr = state.roundState.stealState;

    // Any reset back to idle: clear remaining steal flash states
    if (curr === 'idle') {
      prevStealStateRef.current = curr;
      setStealSuccessFlash(false);
      setStealFailFlash(false);
      setStealSuccessTeamId(null);
      setStealOriginalBuzzerId(null);
      return;
    }

    // available -> resolved: use lastPointsAwarded to distinguish success vs fail
    if (prev === 'available' && curr === 'resolved') {
      const pts = state.roundState.lastPointsAwarded;
      if (pts && pts > 0) {
        const stolenById = state.roundState.stealingTeamId ?? (state.teams.find(t => t.id !== buzzWinnerTeamId)?.id ?? null);
        setStealSuccessTeamId(stolenById);
        setStealSuccessFlash(true);
        const t = window.setTimeout(() => setStealSuccessFlash(false), 3500);
        prevStealStateRef.current = curr;
        return () => window.clearTimeout(t);
      } else {
        setStealFailFlash(true);
        const t = window.setTimeout(() => setStealFailFlash(false), 3000);
        prevStealStateRef.current = curr;
        return () => window.clearTimeout(t);
      }
    }

    prevStealStateRef.current = curr;
  }, [state.roundState.stealState, state.roundState.lastPointsAwarded, buzzWinnerTeamId, state.teams]);

  useEffect(() => {
    if (state.roundState.artistBonusUsed) {
      setArtistBonusFlash(true);
      const t = window.setTimeout(() => setArtistBonusFlash(false), 3000);
      return () => window.clearTimeout(t);
    } else {
      setArtistBonusFlash(false);
    }
  }, [state.roundState.artistBonusUsed]);

  useEffect(() => {
    if (!state.teams.length) return;

    const nextScoreMap = Object.fromEntries(state.teams.map((team) => [team.id, team.score]));
    const prevScoreMap = previousScoresRef.current;

    const changedTeam = state.teams.find((team) => (prevScoreMap[team.id] ?? team.score) !== team.score);

    if (changedTeam && changedTeam.score > (prevScoreMap[changedTeam.id] ?? 0)) {
      const start = prevScoreMap[changedTeam.id] ?? 0;
      const end = changedTeam.score;
      const delta = end - start;
      const duration = 900;

      const runAnimation = () => {
        const startedAt = performance.now();
        setScoreAnimatingTeamId(changedTeam.id);
        setFloatingPoints({ teamId: changedTeam.id, value: delta });

        const animate = (now: number) => {
          const progress = Math.min((now - startedAt) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(start + (end - start) * eased);

          setDisplayScores((currentScores) => ({
            ...currentScores,
            [changedTeam.id]: current,
          }));

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setScoreAnimatingTeamId(null);
            window.setTimeout(() => setFloatingPoints(null), 250);
          }
        };

        requestAnimationFrame(animate);
      };

      const delay = state.roundState.artistBonusUsed ? 0 : isCorrectPhase ? 2200 : 0;
      const t = window.setTimeout(runAnimation, delay);
      previousScoresRef.current = nextScoreMap;
      return () => window.clearTimeout(t);
    }

    setDisplayScores((currentScores) => {
      const merged = { ...currentScores };
      for (const team of state.teams) {
        const prev = prevScoreMap[team.id] ?? team.score;
        if (team.score <= prev || !(team.id in currentScores)) {
          merged[team.id] = team.score;
        }
      }
      return merged;
    });

    previousScoresRef.current = nextScoreMap;
  }, [state.teams]);

  const scoreMap = useMemo(() => {
    return state.teams.reduce<Record<string, number>>((acc, team) => {
      acc[team.id] = displayScores[team.id] ?? team.score;
      return acc;
    }, {});
  }, [displayScores, state.teams]);

  return (
    <Box
      sx={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        px: { xs: 1, md: 2 },
        py: { xs: 1, md: 2 },
        width: '100%',
        background: isWrongPhase
          ? 'radial-gradient(circle at top, rgba(160,10,10,0.45), transparent 55%), linear-gradient(180deg, #1a0303 0%, #200505 45%, #140202 100%)'
          : stealSuccessFlash
            ? 'radial-gradient(circle at top, rgba(255,140,0,0.42), transparent 50%), radial-gradient(circle at bottom, rgba(255,200,0,0.22), transparent 45%), linear-gradient(180deg, #110800 0%, #1a0e00 45%, #0d0600 100%)'
            : isStealAvailable
              ? 'radial-gradient(circle at top, rgba(255,120,0,0.38), transparent 50%), linear-gradient(180deg, #110800 0%, #180b00 45%, #0d0600 100%)'
              : artistBonusFlash
                ? 'radial-gradient(circle at top, rgba(255,200,40,0.38), transparent 50%), radial-gradient(circle at bottom, rgba(40,200,255,0.28), transparent 45%), linear-gradient(180deg, #0d0e03 0%, #141206 45%, #080b05 100%)'
                : 'radial-gradient(circle at top, rgba(40,80,180,0.28), transparent 35%), linear-gradient(180deg, #070d1f 0%, #0b1228 45%, #070b18 100%)',
        transition: 'background 320ms ease',
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 4,
          p: { xs: 1, md: 2 },
          border: isWrongPhase
            ? '3px solid rgba(220, 30, 30, 0.95)'
            : stealSuccessFlash
              ? '3px solid rgba(255,160,0,0.98)'
              : isStealAvailable
                ? '3px solid rgba(255,130,0,0.9)'
                : artistBonusFlash
                  ? '3px solid rgba(255,215,50,0.98)'
                  : '3px solid rgba(83, 201, 255, 0.95)',
          boxShadow: isWrongPhase
            ? '0 0 40px rgba(200,20,20,0.7), inset 0 0 40px rgba(180,10,10,0.25)'
            : stealSuccessFlash
              ? '0 0 50px rgba(255,160,0,0.9), 0 0 100px rgba(255,200,0,0.55), inset 0 0 40px rgba(255,150,0,0.18)'
              : isStealAvailable
                ? '0 0 40px rgba(255,120,0,0.75), 0 0 80px rgba(255,80,0,0.4), inset 0 0 30px rgba(255,120,0,0.12)'
                : artistBonusFlash
                  ? '0 0 50px rgba(255,210,40,0.85), 0 0 100px rgba(255,180,30,0.5), inset 0 0 40px rgba(255,200,40,0.15)'
                  : '0 0 30px rgba(70, 190, 255, 0.45), inset 0 0 30px rgba(50, 100, 255, 0.18)',
          background: isWrongPhase
            ? 'radial-gradient(circle at 50% 0%, rgba(120,10,10,0.6), rgba(22,5,5,0.97) 36%), rgba(18,4,4,0.97)'
            : stealSuccessFlash
              ? 'radial-gradient(circle at 50% 0%, rgba(180,100,0,0.6), rgba(16,10,2,0.97) 36%), rgba(14,9,1,0.97)'
              : isStealAvailable
                ? 'radial-gradient(circle at 50% 0%, rgba(160,80,0,0.5), rgba(14,8,1,0.97) 36%), rgba(12,7,1,0.97)'
                : artistBonusFlash
                  ? 'radial-gradient(circle at 50% 0%, rgba(180,140,10,0.55), rgba(14,13,4,0.97) 36%), rgba(12,11,3,0.97)'
                  : 'radial-gradient(circle at 50% 0%, rgba(66, 24, 135, 0.5), rgba(11, 17, 40, 0.95) 36%), rgba(9,14,28,0.96)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 240ms ease',
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.85) 0 1px, transparent 1px), radial-gradient(circle, rgba(255,200,120,0.65) 0 1px, transparent 1px)',
            backgroundSize: '120px 120px, 180px 180px',
            backgroundPosition: '20px 20px, 70px 50px',
            opacity: buzzWinnerTeamId && !isCorrectPhase ? 0.08 : 0.2,
            filter: buzzWinnerTeamId && !isCorrectPhase ? 'grayscale(0.9)' : 'none',
            pointerEvents: 'none',
            transition: 'all 220ms ease',
          }}
        />

        {isCorrectPhase && (
          <>
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at center, rgba(154,255,109,0.08), transparent 42%)',
                pointerEvents: 'none',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: -20,
                left: '14%',
                color: '#9aff6d',
                fontSize: '3.2rem',
                transform: 'rotate(-12deg)',
                animation: 'confettiFloat 1100ms ease-in-out infinite alternate',
                '@keyframes confettiFloat': {
                  '0%': { transform: 'translateY(0px) rotate(-12deg)' },
                  '100%': { transform: 'translateY(14px) rotate(-2deg)' },
                },
              }}
            >
              ♪
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: 40,
                right: '16%',
                color: '#ffd54a',
                fontSize: '2.8rem',
                transform: 'rotate(14deg)',
                animation: 'confettiFloatTwo 900ms ease-in-out infinite alternate',
                '@keyframes confettiFloatTwo': {
                  '0%': { transform: 'translateY(0px) rotate(14deg)' },
                  '100%': { transform: 'translateY(16px) rotate(2deg)' },
                },
              }}
            >
              ♫
            </Box>
          </>
        )}

        <Stack spacing={2} sx={{ position: 'relative', zIndex: 1, flex: 1, justifyContent: 'space-between', minHeight: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
            <Stack spacing={0.5} sx={{ flex: 1, alignItems: 'center' }}>
              <Typography
                sx={{
                  fontSize: 'clamp(2rem, 5vw, 8rem)',
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  textShadow: '0 0 12px rgba(72,210,255,0.8), 0 0 28px rgba(255,141,59,0.45)',
                }}
              >
                <Box component="span" sx={{ color: '#56d7ff' }}>Name That</Box>{' '}
                <Box component="span" sx={{ color: '#ffb14a' }}>Tune</Box>
              </Typography>
            </Stack>

            <GraphicEqIcon sx={{ fontSize: 'clamp(48px, 7vw, 140px)', color: '#ffd54a', filter: 'drop-shadow(0 0 14px rgba(255,213,74,0.8))' }} />
          </Stack>

          <Grid container spacing={2} alignItems="stretch" sx={{ width: '100%', m: 0 }}>
            {state.teams.map((team, index) => {
              const TEAM_ACCENTS = ['#56d7ff', '#ff9e3d', '#c88cff', '#50ffa0'];
              const TEAM_GLOWS = ['rgba(86,215,255,0.45)', 'rgba(255,158,61,0.45)', 'rgba(200,140,255,0.45)', 'rgba(80,255,160,0.45)'];
              const accent = TEAM_ACCENTS[index % TEAM_ACCENTS.length];
              const glow = TEAM_GLOWS[index % TEAM_GLOWS.length];
              const isEliminated = team.eliminated ?? false;
              const isBuzzWinner = buzzWinnerTeamId === team.id && !isCorrectPhase && !isWrongPhase && !isStealAvailable && !stealSuccessFlash && !stealFailFlash;
              const isWinningTeam = winningTeamId === team.id && !stealSuccessFlash;
              const isWrongTeam = wrongTeamId === team.id && (!isStealAvailable || stealWrongFlash) && !stealSuccessFlash && !stealFailFlash;
              const isArtistBonusTeam = artistBonusFlash && artistBonusTeamId === team.id;
              const isStealingTeam = isStealAvailable && stealingTeamId === team.id;
              const isStealWinner = stealSuccessFlash && stealSuccessTeamId === team.id;
              const isOriginalBuzzer = (isStealAvailable || stealSuccessFlash) && !stealFailFlash && buzzWinnerTeamId === team.id;
              const isDimmed = !stealFailFlash && Boolean(buzzWinnerTeamId) && !isBuzzWinner && !isWinningTeam && !isWrongTeam && !isArtistBonusTeam && !isStealingTeam && !isStealWinner && !isOriginalBuzzer;
              const isScoreAnimating = scoreAnimatingTeamId === team.id;
              const sideIcon = isStealWinner
                ? <CheckCircleIcon sx={{ fontSize: 'clamp(44px, 5.5vw, 110px)' }} />
                : isStealingTeam
                  ? <VolumeUpIcon sx={{ fontSize: 'clamp(44px, 5.5vw, 110px)' }} />
                  : isWinningTeam
                    ? <CheckCircleIcon sx={{ fontSize: 'clamp(44px, 5.5vw, 110px)' }} />
                    : isWrongTeam
                      ? <Box component="span" sx={{ fontSize: 'clamp(44px, 5.5vw, 110px)', fontWeight: 900, lineHeight: 1, display: 'block', animation: 'wrongIconFlash 600ms ease-in-out infinite', '@keyframes wrongIconFlash': { '0%': { opacity: 1 }, '50%': { opacity: 0.4 }, '100%': { opacity: 1 } } }}>✕</Box>
                      : isBuzzWinner
                        ? <VolumeUpIcon sx={{ fontSize: 'clamp(44px, 5.5vw, 110px)' }} />
                        : index === 0
                          ? <RadioIcon sx={{ fontSize: 'clamp(40px, 5vw, 100px)' }} />
                          : <AlbumIcon sx={{ fontSize: 'clamp(40px, 5vw, 100px)' }} />;

              const gridCols = state.teams.length <= 2 ? 6 : state.teams.length === 3 ? 4 : 3;
              return (
                <Grid item xs={12} md={gridCols} key={team.id}>
                  <Box
                    sx={{
                      height: '100%',
                      borderRadius: 4,
                      px: 3,
                      py: 2.5,
                      border: `2px solid ${isWrongTeam ? '#ff2020' : isArtistBonusTeam ? '#ffe047' : isStealWinner ? '#ff8c00' : isStealingTeam ? '#ff8c00' : isOriginalBuzzer ? 'rgba(255,80,0,0.25)' : isWinningTeam ? '#dfffb2' : isBuzzWinner ? '#fff2d6' : accent}`,
                      boxShadow: isWrongTeam
                        ? '0 0 24px rgba(255,20,20,0.95), 0 0 52px rgba(200,0,0,0.8), 0 0 90px rgba(180,0,0,0.5), inset 0 0 28px rgba(255,20,20,0.18)'
                        : isArtistBonusTeam
                          ? '0 0 28px rgba(255,220,40,1), 0 0 60px rgba(60,220,255,0.7), 0 0 110px rgba(255,200,30,0.55), inset 0 0 32px rgba(255,230,80,0.2)'
                          : isStealWinner
                            ? '0 0 28px rgba(255,140,0,0.98), 0 0 60px rgba(255,100,0,0.75), 0 0 110px rgba(255,60,0,0.5), inset 0 0 28px rgba(255,140,0,0.18)'
                            : isStealingTeam
                              ? '0 0 28px rgba(255,140,0,0.98), 0 0 60px rgba(255,100,0,0.75), 0 0 110px rgba(255,60,0,0.5), inset 0 0 28px rgba(255,140,0,0.18)'
                              : isOriginalBuzzer
                                ? '0 0 6px rgba(255,80,0,0.2)'
                                : isWinningTeam
                                  ? '0 0 24px rgba(210,255,127,0.95), 0 0 44px rgba(66,255,124,0.72), 0 0 86px rgba(255,214,74,0.48), inset 0 0 26px rgba(255,255,255,0.18)'
                                  : isBuzzWinner
                                    ? '0 0 18px rgba(255,255,255,0.95), 0 0 38px rgba(255,158,61,0.85), 0 0 70px rgba(255,120,35,0.55), inset 0 0 24px rgba(255,255,255,0.12)'
                                    : `0 0 18px ${glow}, inset 0 0 18px rgba(255,255,255,0.05)`,
                      background: isWrongTeam
                        ? 'linear-gradient(135deg, rgba(200,10,10,0.45), rgba(120,0,0,0.25), rgba(40,4,4,0.88))'
                        : isArtistBonusTeam
                          ? 'linear-gradient(135deg, rgba(255,200,30,0.35), rgba(40,210,255,0.18), rgba(30,28,4,0.88))'
                          : isStealWinner || isStealingTeam
                            ? 'linear-gradient(135deg, rgba(255,120,0,0.42), rgba(255,60,0,0.18), rgba(40,16,0,0.88))'
                            : isOriginalBuzzer
                              ? 'rgba(14,5,0,0.82)'
                              : isWinningTeam
                                ? 'linear-gradient(135deg, rgba(76,255,112,0.28), rgba(255,223,99,0.16), rgba(8,52,18,0.76))'
                                : isBuzzWinner
                                  ? 'linear-gradient(135deg, rgba(255,149,64,0.35), rgba(255,255,255,0.12), rgba(70,22,4,0.75))'
                                  : 'rgba(8, 18, 44, 0.72)',
                      filter: isEliminated ? 'grayscale(1) brightness(0.35)' : isDimmed ? 'grayscale(0.85) brightness(0.6)' : isOriginalBuzzer ? 'grayscale(0.7) brightness(0.4)' : 'none',
                      opacity: isEliminated ? 0.55 : 1,
                      transform: isWrongTeam ? 'scale(1.02)' : isArtistBonusTeam ? 'scale(1.05)' : isStealWinner || isStealingTeam ? 'scale(1.04)' : isWinningTeam || isBuzzWinner ? 'scale(1.03)' : 'scale(1)',
                      animation: isWrongTeam ? 'wrongPulse 700ms ease-in-out infinite' : isArtistBonusTeam ? 'artistPulse 600ms ease-in-out infinite' : isStealWinner || isStealingTeam ? 'stealPulse 550ms ease-in-out infinite' : isWinningTeam ? 'winPulse 1100ms ease-in-out infinite' : isBuzzWinner ? 'buzzPulse 900ms ease-in-out infinite' : 'none',
                      transition: 'all 220ms ease',
                      '@keyframes buzzPulse': {
                        '0%': { boxShadow: '0 0 18px rgba(255,255,255,0.85), 0 0 34px rgba(255,158,61,0.72), 0 0 58px rgba(255,120,35,0.42)' },
                        '50%': { boxShadow: '0 0 24px rgba(255,255,255,1), 0 0 48px rgba(255,182,80,0.98), 0 0 90px rgba(255,120,35,0.68)' },
                        '100%': { boxShadow: '0 0 18px rgba(255,255,255,0.85), 0 0 34px rgba(255,158,61,0.72), 0 0 58px rgba(255,120,35,0.42)' },
                      },
                      '@keyframes stealPulse': {
                        '0%': { boxShadow: '0 0 24px rgba(255,140,0,0.85), 0 0 52px rgba(255,90,0,0.65), 0 0 90px rgba(255,50,0,0.4)' },
                        '50%': { boxShadow: '0 0 42px rgba(255,160,0,1), 0 0 80px rgba(255,110,0,0.9), 0 0 140px rgba(255,60,0,0.65)' },
                        '100%': { boxShadow: '0 0 24px rgba(255,140,0,0.85), 0 0 52px rgba(255,90,0,0.65), 0 0 90px rgba(255,50,0,0.4)' },
                      },
                      '@keyframes wrongPulse': {
                        '0%': { boxShadow: '0 0 24px rgba(255,20,20,0.85), 0 0 48px rgba(200,0,0,0.65), 0 0 80px rgba(180,0,0,0.4)' },
                        '50%': { boxShadow: '0 0 36px rgba(255,20,20,1), 0 0 70px rgba(220,0,0,0.9), 0 0 120px rgba(180,0,0,0.6)' },
                        '100%': { boxShadow: '0 0 24px rgba(255,20,20,0.85), 0 0 48px rgba(200,0,0,0.65), 0 0 80px rgba(180,0,0,0.4)' },
                      },
                      '@keyframes artistPulse': {
                        '0%': { boxShadow: '0 0 24px rgba(255,220,40,0.9), 0 0 52px rgba(40,210,255,0.6), 0 0 90px rgba(255,200,30,0.4)' },
                        '50%': { boxShadow: '0 0 42px rgba(255,230,60,1), 0 0 80px rgba(40,220,255,0.9), 0 0 140px rgba(255,210,30,0.65)' },
                        '100%': { boxShadow: '0 0 24px rgba(255,220,40,0.9), 0 0 52px rgba(40,210,255,0.6), 0 0 90px rgba(255,200,30,0.4)' },
                      },
                      '@keyframes winPulse': {
                        '0%': { boxShadow: '0 0 22px rgba(210,255,127,0.9), 0 0 36px rgba(66,255,124,0.6), 0 0 64px rgba(255,214,74,0.34)' },
                        '50%': { boxShadow: '0 0 30px rgba(231,255,163,1), 0 0 56px rgba(66,255,124,0.84), 0 0 96px rgba(255,214,74,0.6)' },
                        '100%': { boxShadow: '0 0 22px rgba(210,255,127,0.9), 0 0 36px rgba(66,255,124,0.6), 0 0 64px rgba(255,214,74,0.34)' },
                      },
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                      <Stack spacing={1}>
                        <Box sx={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography sx={{ color: isEliminated ? 'rgba(255,255,255,0.35)' : isWrongTeam ? '#ff6060' : isArtistBonusTeam ? '#ffe566' : isStealWinner || isStealingTeam ? '#ffb347' : isOriginalBuzzer ? 'rgba(255,255,255,0.25)' : isWinningTeam ? '#fff6dd' : isBuzzWinner ? '#fff6dd' : accent, fontWeight: 900, fontSize: 'clamp(1.2rem, 2.2vw, 3.5rem)', textTransform: 'uppercase', textShadow: isWrongTeam ? '0 0 14px rgba(255,60,60,0.95), 0 0 28px rgba(200,0,0,0.8)' : isArtistBonusTeam ? '0 0 14px rgba(255,230,60,0.98), 0 0 30px rgba(40,210,255,0.7)' : isWinningTeam ? '0 0 14px rgba(218,255,159,0.95), 0 0 28px rgba(255,214,74,0.88)' : isBuzzWinner ? '0 0 14px rgba(255,255,255,0.95), 0 0 28px rgba(255,164,58,0.88)' : `0 0 12px ${glow}`, textDecoration: isEliminated ? 'line-through' : 'none' }}>
                          {team.name}
                        </Typography>
                        {isEliminated && (
                          <Typography sx={{ color: '#ff4444', fontWeight: 900, fontSize: 'clamp(0.6rem, 0.9vw, 1.1rem)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                            ELIMINATED
                          </Typography>
                        )}
                        </Box>
                        <Typography sx={{ color: isWrongTeam ? '#888' : isOriginalBuzzer ? 'rgba(255,255,255,0.2)' : isArtistBonusTeam || isScoreAnimating ? '#fff' : 'white', fontWeight: 900, fontSize: 'clamp(2.5rem, 6vw, 9rem)', lineHeight: 1, textShadow: isWrongTeam ? 'none' : isArtistBonusTeam ? '0 0 10px rgba(255,255,255,1), 0 0 24px rgba(255,230,60,0.95), 0 0 50px rgba(40,210,255,0.7)' : isWinningTeam ? '0 0 14px rgba(255,223,115,0.9), 0 0 28px rgba(147,255,80,0.7)' : isBuzzWinner ? '0 0 14px rgba(255,255,255,0.9), 0 0 28px rgba(255,175,80,0.65)' : 'none', opacity: isWrongTeam ? 0.55 : 1, animation: isArtistBonusTeam ? 'artistScoreFlash 300ms ease-in-out infinite' : isScoreAnimating ? 'scoreFlash 260ms ease-in-out infinite' : isWinningTeam ? 'scoreFlash 900ms ease-in-out infinite' : 'none', transition: 'color 300ms ease, opacity 300ms ease', '@keyframes artistScoreFlash': { '0%': { color: '#ffffff', transform: 'scale(1)' }, '50%': { color: '#ffe566', transform: 'scale(1.06)' }, '100%': { color: '#ffffff', transform: 'scale(1)' } }, '@keyframes scoreFlash': { '0%': { color: '#ffffff' }, '50%': { color: '#ffe98b' }, '100%': { color: '#ffffff' } } }}>
                          {scoreMap[team.id]}
                        </Typography>
                        <Typography sx={{ color: '#f4f7ff', fontSize: 'clamp(0.8rem, 1.2vw, 1.8rem)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                          Points
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.82)', fontSize: 'clamp(0.8rem, 1.2vw, 1.8rem)' }}>
                          {team.players.length ? team.players.join(' • ') : 'Players pending'}
                        </Typography>
                      </Stack>
                      <Box sx={{ color: isWrongTeam ? '#ff2020' : isArtistBonusTeam ? '#ffe047' : isWinningTeam ? '#d8ff9b' : isBuzzWinner ? '#fff6dd' : accent, filter: isWrongTeam ? 'drop-shadow(0 0 14px rgba(255,20,20,0.95)) drop-shadow(0 0 28px rgba(200,0,0,0.8))' : isArtistBonusTeam ? 'drop-shadow(0 0 16px rgba(255,220,40,1)) drop-shadow(0 0 32px rgba(40,210,255,0.8))' : isWinningTeam ? 'drop-shadow(0 0 12px rgba(202,255,116,0.95)) drop-shadow(0 0 18px rgba(255,214,74,0.65))' : isBuzzWinner ? 'drop-shadow(0 0 10px rgba(255,255,255,0.95)) drop-shadow(0 0 18px rgba(255,170,64,0.95))' : `drop-shadow(0 0 14px ${glow})`, opacity: 0.95, animation: isWrongTeam ? 'wrongIconPulse 600ms ease-in-out infinite' : isArtistBonusTeam ? 'artistIconPulse 500ms ease-in-out infinite' : isWinningTeam ? 'winIconPulse 650ms ease-in-out infinite' : isBuzzWinner ? 'buzzIconPulse 420ms ease-in-out infinite' : 'none', '@keyframes artistIconPulse': { '0%': { transform: 'scale(1) rotate(0deg)' }, '25%': { transform: 'scale(1.25) rotate(-8deg)' }, '75%': { transform: 'scale(1.25) rotate(8deg)' }, '100%': { transform: 'scale(1) rotate(0deg)' } }, '@keyframes wrongIconPulse': { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.2)' }, '100%': { transform: 'scale(1)' } }, '@keyframes buzzIconPulse': { '0%': { transform: 'scale(1) translateX(0px)' }, '50%': { transform: 'scale(1.14) translateX(2px)' }, '100%': { transform: 'scale(1) translateX(0px)' } }, '@keyframes winIconPulse': { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.16)' }, '100%': { transform: 'scale(1)' } } }}>
                        {sideIcon}
                      </Box>
                    </Stack>
                  </Box>
                </Grid>
              );
            })}
          </Grid>

          {/* Round + multiplier row */}
          <Stack direction="row" justifyContent="center" spacing={3} alignItems="center">
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 'clamp(0.75rem, 1.2vw, 1.4rem)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Round <Box component="span" sx={{ color: '#56d7ff', fontWeight: 900 }}>{state.currentRound}</Box>
            </Typography>
            <Box sx={{ width: 2, height: '1.2em', bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 'clamp(0.75rem, 1.2vw, 1.4rem)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Multiplier <Box component="span" sx={{ color: state.multiplier > 1 ? '#ffb14a' : 'white', fontWeight: 900 }}>×{state.multiplier}</Box>
            </Typography>
          </Stack>

          {/* Theme / Song / Sudden Death section */}
          <Stack spacing={1} alignItems="center" sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

            {isSuddenDeath ? (
              <Box sx={{
                flex: 1,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}>
                <Typography sx={{
                  fontSize: 'clamp(3rem, 9vw, 14rem)',
                  fontWeight: 900,
                  lineHeight: 0.9,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: '#ff4444',
                  textShadow: '0 0 18px rgba(255,68,68,0.9), 0 0 40px rgba(255,68,68,0.5)',
                  animation: 'sdPulse 900ms ease-in-out infinite',
                  '@keyframes sdPulse': {
                    '0%': { transform: 'scale(1)', opacity: 0.9 },
                    '50%': { transform: 'scale(1.03)', opacity: 1 },
                    '100%': { transform: 'scale(1)', opacity: 0.9 },
                  },
                  textAlign: 'center',
                }}>
                  ⚡ Sudden<br />Death ⚡
                </Typography>
              </Box>
            ) : hasActiveTheme ? (
              <>
                <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 'clamp(0.9rem, 1.6vw, 2rem)', letterSpacing: '0.14em', textTransform: 'uppercase', textShadow: '0 0 10px rgba(255,255,255,0.35)' }}>
                  {selectedQuestion?.category ?? 'Theme'}
                </Typography>
                <Box sx={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', gap: 2, alignItems: 'stretch' }}>
                  {Array.from({ length: SONG_COUNT }, (_, i) => {
                    const isActive = activeSongIndex === i;
                    const isPast = activeSongIndex !== null && i < activeSongIndex;
                    const songStyle = themeStyles[i % themeStyles.length];
                    const showPointsBubble = floatingPoints && floatingPoints.teamId === winningTeamId && isCorrectPhase && isActive;
                    return (
                      <Box key={i} sx={{ flex: 1, display: 'flex' }}>
                        <Box sx={{
                          flex: 1,
                          borderRadius: 4,
                          px: 2,
                          py: 2.5,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          border: `3px solid ${isCorrectPhase && isActive ? '#7dff74' : isPast ? 'rgba(255,255,255,0.1)' : songStyle.color}`,
                          boxShadow: isCorrectPhase && isActive ? '0 0 28px rgba(125,255,116,0.8)' : isActive ? `0 0 28px ${songStyle.glow}` : 'none',
                          background: isCorrectPhase && isActive
                            ? 'linear-gradient(180deg, rgba(90,255,136,0.16), rgba(10,28,14,0.94))'
                            : isActive ? 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(8,16,32,0.92))'
                            : 'rgba(10,16,32,0.86)',
                          opacity: isPast ? 0.25 : 1,
                          transform: isActive ? 'translateY(-6px) scale(1.02)' : 'none',
                          transition: 'all 180ms ease',
                          position: 'relative',
                          overflow: 'visible',
                        }}>
                          {showPointsBubble && (
                            <Box sx={{
                              position: 'absolute', bottom: '74%', left: '50%', transform: 'translateX(-50%)',
                              px: 2, py: 0.8, borderRadius: 999, bgcolor: 'rgba(255,149,64,0.96)', color: 'white',
                              fontWeight: 900, fontSize: '1rem', letterSpacing: '0.08em',
                              boxShadow: '0 0 18px rgba(255,149,64,0.9)',
                              animation: 'pointsRise 1100ms ease-out forwards',
                              '@keyframes pointsRise': {
                                '0%': { opacity: 0, transform: 'translate(-50%, 24px) scale(0.8)' },
                                '15%': { opacity: 1, transform: 'translate(-50%, 0px) scale(1)' },
                                '100%': { opacity: 0, transform: 'translate(-10%, -180px) scale(0.92)' },
                              },
                            }}>
                              +{floatingPoints?.value} PTS
                            </Box>
                          )}
                          <Box sx={{ position: 'relative', color: isCorrectPhase && isActive ? '#7dff74' : songStyle.color, filter: `drop-shadow(0 0 14px ${songStyle.glow})`, '& svg': { fontSize: 'clamp(36px, 4vw, 80px) !important' } }}>
                            {songStyle.icon}
                            {isCorrectPhase && isActive && (
                              <CheckCircleIcon sx={{ position: 'absolute', right: -18, top: -18, fontSize: 34, color: '#8eff65', filter: 'drop-shadow(0 0 12px rgba(125,255,116,0.9))' }} />
                            )}
                          </Box>
                          <Typography sx={{ color: isCorrectPhase && isActive ? '#9eff85' : songStyle.color, textAlign: 'center', fontWeight: 900, fontSize: 'clamp(1rem, 1.6vw, 2.6rem)', textTransform: 'uppercase', textShadow: `0 0 12px ${songStyle.glow}` }}>
                            Song {i + 1}
                          </Typography>
                          {isCorrectPhase && isActive && (
                            <Typography sx={{ color: '#9eff85', textAlign: 'center', fontWeight: 800, fontSize: 'clamp(0.75rem, 1.1vw, 1.6rem)', textTransform: 'uppercase' }}>
                              [CORRECT]
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </>
            ) : (
              <>
                <Typography
                  sx={{
                    color: isCorrectPhase ? '#d8ff9b' : 'white',
                    fontWeight: 900,
                    fontSize: 'clamp(1rem, 1.8vw, 2.2rem)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    textShadow: isCorrectPhase ? '0 0 14px rgba(164,255,124,0.72)' : '0 0 10px rgba(255,255,255,0.35)',
                  }}
                >
                  Choose a theme
                </Typography>
                <Grid container spacing={2} sx={{ flex: 1, minHeight: 0, alignItems: 'stretch', width: '100%', m: 0 }}>
                  {currentRoundQuestions.map((question, index) => {
                    const style = themeStyles[index % themeStyles.length];
                    const isUsed = usedQuestionIds.includes(question.id);
                    const isActiveQuestion = isCorrectPhase && question.id === state.roundState.selectedQuestionId;
                    const showPointsBubble = isActiveQuestion && floatingPoints && floatingPoints.teamId === winningTeamId;

                    return (
                      <Grid item xs={12} sm={6} md={2.4} key={question.id} sx={{ display: 'flex' }}>
                        {isUsed && !isActiveQuestion ? (
                          <Box sx={{
                            flex: 1, borderRadius: 4, border: '2px dashed rgba(255,255,255,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0.2, background: 'rgba(10,16,32,0.4)',
                          }}>
                            <Typography sx={{ color: style.color, fontWeight: 900, fontSize: 'clamp(0.8rem, 1.2vw, 1.8rem)', textTransform: 'uppercase' }}>
                              {question.category}
                            </Typography>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              flex: 1,
                              borderRadius: 4,
                              px: 2,
                              py: 2.5,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              border: isActiveQuestion ? '3px solid #7dff74' : `3px solid ${style.color}`,
                              boxShadow: isActiveQuestion
                                ? '0 0 32px rgba(125,255,116,0.9), 0 0 64px rgba(80,255,100,0.5), inset 0 0 24px rgba(255,255,255,0.12)'
                                : `0 0 18px ${style.glow}`,
                              background: isActiveQuestion
                                ? 'linear-gradient(180deg, rgba(90,255,136,0.16), rgba(10,28,14,0.94))'
                                : 'rgba(10,16,32,0.86)',
                              filter: buzzWinnerTeamId && !isCorrectPhase ? 'grayscale(0.7) brightness(0.62)' : 'none',
                              transform: isActiveQuestion ? 'translateY(-4px) scale(1.03)' : 'none',
                              transition: 'all 180ms ease',
                              position: 'relative',
                              overflow: 'visible',
                            }}
                          >
                            {showPointsBubble && (
                              <Box sx={{
                                position: 'absolute', bottom: '90%', left: '50%', transform: 'translateX(-50%)',
                                px: 2, py: 0.8, borderRadius: 999, bgcolor: 'rgba(255,149,64,0.96)', color: 'white',
                                fontWeight: 900, fontSize: 'clamp(0.85rem, 1.2vw, 1.6rem)', letterSpacing: '0.08em',
                                boxShadow: '0 0 18px rgba(255,149,64,0.9)',
                                whiteSpace: 'nowrap',
                                animation: 'pointsRise 1400ms ease-out forwards',
                                '@keyframes pointsRise': {
                                  '0%': { opacity: 0, transform: 'translate(-50%, 20px) scale(0.8)' },
                                  '12%': { opacity: 1, transform: 'translate(-50%, 0px) scale(1)' },
                                  '100%': { opacity: 0, transform: 'translate(-50%, -160px) scale(0.9)' },
                                },
                              }}>
                                +{floatingPoints?.value} PTS
                              </Box>
                            )}
                            <Box sx={{ color: isActiveQuestion ? '#7dff74' : style.color, filter: `drop-shadow(0 0 14px ${isActiveQuestion ? 'rgba(125,255,116,0.8)' : style.glow})`, '& svg': { fontSize: 'clamp(36px, 4vw, 80px) !important' } }}>
                              {style.icon}
                              {isActiveQuestion && (
                                <CheckCircleIcon sx={{ position: 'absolute', right: -12, top: -12, fontSize: 28, color: '#8eff65', filter: 'drop-shadow(0 0 10px rgba(125,255,116,0.9))' }} />
                              )}
                            </Box>
                            <Typography sx={{ color: isActiveQuestion ? '#9eff85' : style.color, textAlign: 'center', fontWeight: 900, fontSize: 'clamp(1rem, 1.6vw, 2.6rem)', lineHeight: 1.05, textTransform: 'uppercase', textShadow: isActiveQuestion ? '0 0 12px rgba(125,255,116,0.8)' : `0 0 12px ${style.glow}` }}>
                              {question.category || 'Theme'}
                            </Typography>
                          </Box>
                        )}
                      </Grid>
                    );
                  })}
                </Grid>
              </>
            )}
          </Stack>

          <Box sx={{ pt: 1, textAlign: 'center', transition: 'all 220ms ease', flexShrink: 0 }}>
            {artistBonusFlash ? (() => {
              const bonusTeam = state.teams.find(t => t.id === artistBonusTeamId);
              const pts = state.roundState.lastPointsAwarded;
              return bonusTeam && pts ? (
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 1.5,
                  px: 3, py: 1, borderRadius: 999,
                  border: '2px solid rgba(255,215,50,0.85)',
                  background: 'linear-gradient(90deg, rgba(255,200,30,0.2), rgba(40,210,255,0.14), rgba(255,200,30,0.2))',
                  boxShadow: '0 0 28px rgba(255,210,40,0.65), 0 0 56px rgba(40,200,255,0.35)',
                  animation: 'artistBannerPulse 700ms ease-in-out infinite',
                  '@keyframes artistBannerPulse': {
                    '0%': { boxShadow: '0 0 20px rgba(255,210,40,0.5), 0 0 40px rgba(40,200,255,0.25)' },
                    '50%': { boxShadow: '0 0 40px rgba(255,220,60,0.9), 0 0 80px rgba(40,220,255,0.55)' },
                    '100%': { boxShadow: '0 0 20px rgba(255,210,40,0.5), 0 0 40px rgba(40,200,255,0.25)' },
                  },
                }}>
                  <Typography component="span" sx={{ fontSize: 'clamp(1rem, 1.8vw, 2.4rem)' }}>🎵</Typography>
                  <Typography component="span" sx={{ color: '#ffe566', fontWeight: 900, fontSize: 'clamp(1rem, 1.8vw, 2.6rem)', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 0 14px rgba(255,230,60,0.95), 0 0 30px rgba(40,210,255,0.7)' }}>
                    Artist Bonus
                  </Typography>
                  <Typography component="span" sx={{ color: '#40d8ff', fontWeight: 900, fontSize: 'clamp(1rem, 1.8vw, 2.6rem)', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 0 14px rgba(40,210,255,0.98), 0 0 28px rgba(255,220,50,0.6)' }}>
                    +{pts} pts
                  </Typography>
                  <Typography component="span" sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700, fontSize: 'clamp(0.8rem, 1.2vw, 1.8rem)', textTransform: 'uppercase' }}>for</Typography>
                  <Typography component="span" sx={{ color: '#fff9a0', fontWeight: 900, fontSize: 'clamp(1rem, 1.8vw, 2.6rem)', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 0 14px rgba(255,240,100,0.9), 0 0 28px rgba(40,210,255,0.55)' }}>
                    {bonusTeam.name}
                  </Typography>
                  <Typography component="span" sx={{ fontSize: 'clamp(1rem, 1.8vw, 2.4rem)' }}>🎵</Typography>
                </Box>
              ) : null;
            })() : stealFailFlash ? (
              <Typography sx={{
                fontWeight: 700,
                fontSize: 'clamp(1rem, 2vw, 3rem)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'rgba(255,120,120,0.85)',
                textShadow: '0 0 10px rgba(200,60,60,0.5)',
              }}>
                No Steal
              </Typography>
            ) : isStealAvailable && !stealWrongFlash ? (() => {
              const stealTeam = state.teams.find(t => t.id === stealingTeamId);
              return (
                <Typography sx={{
                  fontWeight: 900,
                  fontSize: 'clamp(1.4rem, 3.5vw, 5rem)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#ff8c00',
                  textShadow: '0 0 14px rgba(255,140,0,0.95), 0 0 32px rgba(255,80,0,0.7), 0 0 64px rgba(255,50,0,0.45)',
                  animation: 'stealBannerFlash 500ms ease-in-out infinite',
                  '@keyframes stealBannerFlash': {
                    '0%': { opacity: 0.85, transform: 'scale(1)' },
                    '50%': { opacity: 1, transform: 'scale(1.04)' },
                    '100%': { opacity: 0.85, transform: 'scale(1)' },
                  },
                }}>
                  ⚡ Steal Opportunity{stealTeam ? ` — ${stealTeam.name}` : ''}! ⚡
                </Typography>
              );
            })() : stealSuccessFlash ? (() => {
              const stealTeam = state.teams.find(t => t.id === stealSuccessTeamId);
              const pts = state.roundState.lastPointsAwarded;
              return stealTeam && pts ? (
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 1.5,
                  px: 3, py: 1, borderRadius: 999,
                  border: '2px solid rgba(255,150,0,0.9)',
                  background: 'linear-gradient(90deg, rgba(255,120,0,0.22), rgba(255,200,0,0.14), rgba(255,120,0,0.22))',
                  boxShadow: '0 0 28px rgba(255,140,0,0.7), 0 0 56px rgba(255,100,0,0.4)',
                  animation: 'stealSuccessBanner 700ms ease-in-out infinite',
                  '@keyframes stealSuccessBanner': {
                    '0%': { boxShadow: '0 0 20px rgba(255,140,0,0.55), 0 0 40px rgba(255,100,0,0.3)' },
                    '50%': { boxShadow: '0 0 40px rgba(255,160,0,0.9), 0 0 80px rgba(255,120,0,0.6)' },
                    '100%': { boxShadow: '0 0 20px rgba(255,140,0,0.55), 0 0 40px rgba(255,100,0,0.3)' },
                  },
                }}>
                  <Typography component="span" sx={{ fontSize: 'clamp(1rem, 1.8vw, 2.4rem)' }}>⚡</Typography>
                  <Typography component="span" sx={{ color: '#ffa040', fontWeight: 900, fontSize: 'clamp(1rem, 1.8vw, 2.6rem)', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 0 14px rgba(255,140,0,0.98)' }}>
                    Steal!
                  </Typography>
                  <Typography component="span" sx={{ color: '#ffd060', fontWeight: 900, fontSize: 'clamp(1rem, 1.8vw, 2.6rem)', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 0 12px rgba(255,180,40,0.9)' }}>
                    +{pts} pts
                  </Typography>
                  <Typography component="span" sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700, fontSize: 'clamp(0.8rem, 1.2vw, 1.8rem)', textTransform: 'uppercase' }}>for</Typography>
                  <Typography component="span" sx={{ color: '#ffe090', fontWeight: 900, fontSize: 'clamp(1rem, 1.8vw, 2.6rem)', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 0 14px rgba(255,200,60,0.9)' }}>
                    {stealTeam.name}
                  </Typography>
                  <Typography component="span" sx={{ fontSize: 'clamp(1rem, 1.8vw, 2.4rem)' }}>⚡</Typography>
                </Box>
              ) : null;
            })() : isCorrectPhase ? (() => {
              if (correctSubPhase === 'celebrate') {
                return (
                  <Typography sx={{
                    fontWeight: 900,
                    fontSize: 'clamp(1.4rem, 3.5vw, 5rem)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#d8ff9b',
                    textShadow: '0 0 12px rgba(162,255,109,0.9), 0 0 28px rgba(255,214,74,0.7), 0 0 60px rgba(111,255,84,0.5)',
                    animation: 'correctBannerPulse 700ms ease-in-out infinite',
                    '@keyframes correctBannerPulse': {
                      '0%': { transform: 'scale(1)', opacity: 0.9 },
                      '50%': { transform: 'scale(1.03)', opacity: 1 },
                      '100%': { transform: 'scale(1)', opacity: 0.9 },
                    },
                  }}>
                    ✓ Correct Answer!
                  </Typography>
                );
              }
              const winTeam = state.teams.find(t => t.id === winningTeamId);
              const pts = state.roundState.lastPointsAwarded;
              return winTeam && pts ? (
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 1.5,
                  px: 3, py: 1,
                  borderRadius: 999,
                  border: '2px solid rgba(255,177,74,0.7)',
                  background: 'linear-gradient(90deg, rgba(255,130,30,0.18), rgba(255,210,80,0.12), rgba(255,130,30,0.18))',
                  boxShadow: '0 0 24px rgba(255,160,50,0.5), 0 0 48px rgba(255,130,30,0.28)',
                  animation: 'bannerPulse 1100ms ease-in-out infinite',
                  '@keyframes bannerPulse': {
                    '0%': { boxShadow: '0 0 18px rgba(255,160,50,0.4), 0 0 36px rgba(255,130,30,0.2)' },
                    '50%': { boxShadow: '0 0 32px rgba(255,180,60,0.75), 0 0 64px rgba(255,140,40,0.45)' },
                    '100%': { boxShadow: '0 0 18px rgba(255,160,50,0.4), 0 0 36px rgba(255,130,30,0.2)' },
                  },
                }}>
                  <Typography component="span" sx={{ color: 'rgba(255,255,255,0.82)', fontWeight: 800, fontSize: 'clamp(0.9rem, 1.6vw, 2.2rem)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Score Update:
                  </Typography>
                  <Typography component="span" sx={{ color: '#ffb93a', fontWeight: 900, fontSize: 'clamp(1rem, 1.8vw, 2.6rem)', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 0 12px rgba(255,180,50,0.9), 0 0 28px rgba(255,140,30,0.6)' }}>
                    +{pts} Points
                  </Typography>
                  <Typography component="span" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 'clamp(0.8rem, 1.4vw, 2rem)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    for
                  </Typography>
                  <Typography component="span" sx={{ color: '#ffea70', fontWeight: 900, fontSize: 'clamp(1rem, 1.8vw, 2.6rem)', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 0 14px rgba(255,230,80,0.9), 0 0 30px rgba(255,200,40,0.6)' }}>
                    {winTeam.name}
                  </Typography>
                </Box>
              ) : null;
            })() : (
              <Box sx={{ filter: buzzWinnerTeamId ? 'grayscale(0.55) brightness(0.78)' : 'none', transition: 'all 220ms ease' }}>
                {isSuddenDeath ? (
                  <Typography sx={{ color: '#ff6060', fontWeight: 900, fontSize: 'clamp(1rem, 2vw, 3rem)', letterSpacing: '0.12em', textTransform: 'uppercase', textShadow: '0 0 14px rgba(255,60,60,0.65)', animation: 'sdPulse 1.2s ease-in-out infinite', '@keyframes sdPulse': { '0%': { opacity: 0.8 }, '50%': { opacity: 1 }, '100%': { opacity: 0.8 } } }}>
                    ⚡ Sudden Death ⚡
                  </Typography>
                ) : (
                  <>
                    {!hasActiveTheme && (
                      <Typography sx={{ color: '#ffb14a', fontWeight: 900, fontSize: 'clamp(1rem, 2vw, 3rem)', letterSpacing: '0.08em', textTransform: 'uppercase', textShadow: '0 0 14px rgba(255,177,74,0.65)' }}>
                        {chooserTeam ? `${chooserTeam.name}: Select your next theme` : 'Waiting for the next selection'}
                      </Typography>
                    )}
                    {selectedQuestion && (
                      <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.78)', fontSize: 'clamp(0.85rem, 1.2vw, 1.8rem)' }}>
                        Now playing: {selectedQuestion.songLabel}
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>


          {stealFailFlash && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 3 }}>
              <Typography sx={{
                fontSize: 'clamp(2.5rem, 7vw, 11rem)',
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'rgba(255,80,80,0.75)',
                textShadow: '0 0 20px rgba(200,40,40,0.5)',
                userSelect: 'none',
                textAlign: 'center',
              }}>
                No Steal
              </Typography>
            </Box>
          )}

          {stealSuccessFlash && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 3 }}>
              <Typography sx={{
                fontSize: 'clamp(2.5rem, 7vw, 11rem)',
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#60ff80',
                textShadow: '0 0 20px rgba(80,255,120,0.95), 0 0 50px rgba(40,200,80,0.75), 0 0 100px rgba(20,180,60,0.5)',
                userSelect: 'none',
                textAlign: 'center',
                animation: 'stealSuccessOverlay 600ms ease-in-out infinite',
                '@keyframes stealSuccessOverlay': {
                  '0%': { opacity: 0.6, transform: 'scale(1)' },
                  '50%': { opacity: 1, transform: 'scale(1.04)' },
                  '100%': { opacity: 0.6, transform: 'scale(1)' },
                },
              }}>
                ⚡ Stolen! ⚡
              </Typography>
            </Box>
          )}

          {isStealAvailable && !stealWrongFlash && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            >
              <Typography
                sx={{
                  fontSize: 'clamp(3rem, 9vw, 14rem)',
                  fontWeight: 900,
                  lineHeight: 0.9,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: '#ff8c00',
                  textShadow: '0 0 20px rgba(255,140,0,0.95), 0 0 50px rgba(255,80,0,0.75), 0 0 100px rgba(255,50,0,0.5)',
                  userSelect: 'none',
                  textAlign: 'center',
                  animation: 'stealOverlayFlash 500ms ease-in-out infinite',
                  '@keyframes stealOverlayFlash': {
                    '0%': { opacity: 0.6, transform: 'scale(1)' },
                    '50%': { opacity: 1, transform: 'scale(1.03)' },
                    '100%': { opacity: 0.6, transform: 'scale(1)' },
                  },
                }}
              >
                ⚡ Steal ⚡
              </Typography>
            </Box>
          )}

          {artistBonusFlash && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            >
              <Typography
                sx={{
                  fontSize: 'clamp(8rem, 22vw, 30rem)',
                  lineHeight: 0.85,
                  userSelect: 'none',
                  animation: 'artistOverlayPulse 500ms ease-in-out infinite',
                  filter: 'drop-shadow(0 0 40px rgba(255,215,40,0.9)) drop-shadow(0 0 80px rgba(40,210,255,0.7))',
                  '@keyframes artistOverlayPulse': {
                    '0%': { opacity: 0.55, transform: 'scale(1) rotate(-6deg)' },
                    '50%': { opacity: 0.85, transform: 'scale(1.08) rotate(6deg)' },
                    '100%': { opacity: 0.55, transform: 'scale(1) rotate(-6deg)' },
                  },
                }}
              >
                🎵
              </Typography>
            </Box>
          )}

          {isWrongPhase && (!isStealAvailable || stealWrongFlash) && !stealSuccessFlash && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            >
              <Typography
                sx={{
                  fontSize: 'clamp(10rem, 28vw, 38rem)',
                  fontWeight: 900,
                  lineHeight: 0.85,
                  color: '#cc0000',
                  textShadow: '0 0 30px rgba(255,0,0,0.9), 0 0 70px rgba(200,0,0,0.7), 0 0 140px rgba(160,0,0,0.5)',
                  animation: 'wrongXFlash 600ms ease-in-out infinite',
                  userSelect: 'none',
                  '@keyframes wrongXFlash': {
                    '0%': { opacity: 0.85, transform: 'scale(1)' },
                    '50%': { opacity: 1, transform: 'scale(1.04)' },
                    '100%': { opacity: 0.85, transform: 'scale(1)' },
                  },
                }}
              >
                ✕
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
};
