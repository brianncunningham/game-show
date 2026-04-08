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
import type { GameShowQuestion, GameShowState } from './types';

const themeStyles = [
  { color: '#ff4fd8', glow: 'rgba(255,79,216,0.55)', icon: <MicIcon sx={{ fontSize: 44 }} /> },
  { color: '#63ff7a', glow: 'rgba(99,255,122,0.55)', icon: <AlbumIcon sx={{ fontSize: 44 }} /> },
  { color: '#ff6548', glow: 'rgba(255,101,72,0.55)', icon: <MusicNoteIcon sx={{ fontSize: 44 }} /> },
  { color: '#5ab7ff', glow: 'rgba(90,183,255,0.55)', icon: <TheaterComedyIcon sx={{ fontSize: 44 }} /> },
  { color: '#ffd54a', glow: 'rgba(255,213,74,0.55)', icon: <OndemandVideoIcon sx={{ fontSize: 44 }} /> },
];

const getStatusLabel = (question: GameShowQuestion, selectedQuestionId: string | null, isCorrectSelection: boolean) => {
  if (isCorrectSelection) {
    return '[SECURED]';
  }
  if (selectedQuestionId === question.id) {
    return `CURRENT: ${question.basePoints} PTS`;
  }
  return '[OPEN]';
};

export const ShowBoard = ({ state }: { state: GameShowState }) => {
  const selectedQuestion = state.questions.find((question) => question.id === state.roundState.selectedQuestionId) ?? null;
  const chooserTeam = state.teams.find((team) => team.id === state.chooserTeamId) ?? null;
  const buzzWinnerTeamId = state.roundState.buzzWinnerTeamId;
  const winningTeamId = state.roundState.answerState === 'correct' ? state.roundState.buzzWinnerTeamId : null;
  const isCorrectPhase = state.roundState.answerState === 'correct';

  const previousScoresRef = useRef<Record<string, number>>({});
  const [displayScores, setDisplayScores] = useState<Record<string, number>>({});
  const [scoreAnimatingTeamId, setScoreAnimatingTeamId] = useState<string | null>(null);
  const [floatingPoints, setFloatingPoints] = useState<{ teamId: string; value: number } | null>(null);

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
    }

    setDisplayScores((currentScores) => ({
      ...nextScoreMap,
      ...currentScores,
    }));

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
        minHeight: '100vh',
        px: { xs: 2, md: 5 },
        py: { xs: 3, md: 4 },
        background: 'radial-gradient(circle at top, rgba(40,80,180,0.28), transparent 35%), linear-gradient(180deg, #070d1f 0%, #0b1228 45%, #070b18 100%)',
        transition: 'background 260ms ease',
      }}
    >
      <Box
        sx={{
          maxWidth: 1400,
          mx: 'auto',
          borderRadius: 6,
          p: { xs: 2, md: 4 },
          border: '3px solid rgba(83, 201, 255, 0.95)',
          boxShadow: '0 0 30px rgba(70, 190, 255, 0.45), inset 0 0 30px rgba(50, 100, 255, 0.18)',
          background: 'radial-gradient(circle at 50% 0%, rgba(66, 24, 135, 0.5), rgba(11, 17, 40, 0.95) 36%), rgba(9,14,28,0.96)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 240ms ease',
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

        <Stack spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
            <Stack spacing={1} sx={{ flex: 1, alignItems: 'center' }}>
              <Typography
                sx={{
                  fontSize: { xs: '2.7rem', md: '4.5rem' },
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
              <Typography
                sx={{
                  fontSize: { xs: '1rem', md: '1.3rem' },
                  color: 'white',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  textShadow: '0 0 10px rgba(255,255,255,0.35)',
                }}
              >
                {`Season 1 | Episode ${state.currentRound + 3}`}
              </Typography>
            </Stack>

            <GraphicEqIcon sx={{ fontSize: { xs: 64, md: 92 }, color: '#ffd54a', filter: 'drop-shadow(0 0 14px rgba(255,213,74,0.8))' }} />
          </Stack>

          <Grid container spacing={2} alignItems="stretch">
            {state.teams.map((team, index) => {
              const accent = index === 0 ? '#56d7ff' : '#ff9e3d';
              const glow = index === 0 ? 'rgba(86,215,255,0.45)' : 'rgba(255,158,61,0.45)';
              const isBuzzWinner = buzzWinnerTeamId === team.id && !isCorrectPhase;
              const isWinningTeam = winningTeamId === team.id;
              const isDimmed = Boolean(buzzWinnerTeamId) && !isBuzzWinner && !isWinningTeam;
              const isScoreAnimating = scoreAnimatingTeamId === team.id;
              const sideIcon = isWinningTeam
                ? <CheckCircleIcon sx={{ fontSize: 58 }} />
                : isBuzzWinner
                  ? <VolumeUpIcon sx={{ fontSize: 58 }} />
                  : index === 0
                    ? <RadioIcon sx={{ fontSize: 54 }} />
                    : <AlbumIcon sx={{ fontSize: 54 }} />;

              return (
                <Grid item xs={12} md={6} key={team.id}>
                  <Box
                    sx={{
                      height: '100%',
                      borderRadius: 4,
                      px: 3,
                      py: 2.5,
                      border: `2px solid ${isWinningTeam ? '#dfffb2' : isBuzzWinner ? '#fff2d6' : accent}`,
                      boxShadow: isWinningTeam
                        ? '0 0 24px rgba(210,255,127,0.95), 0 0 44px rgba(66,255,124,0.72), 0 0 86px rgba(255,214,74,0.48), inset 0 0 26px rgba(255,255,255,0.18)'
                        : isBuzzWinner
                          ? '0 0 18px rgba(255,255,255,0.95), 0 0 38px rgba(255,158,61,0.85), 0 0 70px rgba(255,120,35,0.55), inset 0 0 24px rgba(255,255,255,0.12)'
                          : `0 0 18px ${glow}, inset 0 0 18px rgba(255,255,255,0.05)`,
                      background: isWinningTeam
                        ? 'linear-gradient(135deg, rgba(76,255,112,0.28), rgba(255,223,99,0.16), rgba(8,52,18,0.76))'
                        : isBuzzWinner
                          ? 'linear-gradient(135deg, rgba(255,149,64,0.35), rgba(255,255,255,0.12), rgba(70,22,4,0.75))'
                          : 'rgba(8, 18, 44, 0.72)',
                      filter: isDimmed ? 'grayscale(0.85) brightness(0.6)' : 'none',
                      transform: isWinningTeam || isBuzzWinner ? 'scale(1.03)' : 'scale(1)',
                      animation: isWinningTeam ? 'winPulse 1100ms ease-in-out infinite' : isBuzzWinner ? 'buzzPulse 900ms ease-in-out infinite' : 'none',
                      transition: 'all 220ms ease',
                      '@keyframes buzzPulse': {
                        '0%': { boxShadow: '0 0 18px rgba(255,255,255,0.85), 0 0 34px rgba(255,158,61,0.72), 0 0 58px rgba(255,120,35,0.42)' },
                        '50%': { boxShadow: '0 0 24px rgba(255,255,255,1), 0 0 48px rgba(255,182,80,0.98), 0 0 90px rgba(255,120,35,0.68)' },
                        '100%': { boxShadow: '0 0 18px rgba(255,255,255,0.85), 0 0 34px rgba(255,158,61,0.72), 0 0 58px rgba(255,120,35,0.42)' },
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
                        <Typography sx={{ color: isWinningTeam ? '#fff6dd' : isBuzzWinner ? '#fff6dd' : accent, fontWeight: 900, fontSize: { xs: '1.4rem', md: '2rem' }, textTransform: 'uppercase', textShadow: isWinningTeam ? '0 0 14px rgba(218,255,159,0.95), 0 0 28px rgba(255,214,74,0.88)' : isBuzzWinner ? '0 0 14px rgba(255,255,255,0.95), 0 0 28px rgba(255,164,58,0.88)' : `0 0 12px ${glow}` }}>
                          {team.name}
                        </Typography>
                        <Typography sx={{ color: isScoreAnimating ? '#fff2a5' : 'white', fontWeight: 900, fontSize: { xs: '3rem', md: '4.3rem' }, lineHeight: 1, textShadow: isWinningTeam ? '0 0 14px rgba(255,223,115,0.9), 0 0 28px rgba(147,255,80,0.7)' : isBuzzWinner ? '0 0 14px rgba(255,255,255,0.9), 0 0 28px rgba(255,175,80,0.65)' : 'none', animation: isScoreAnimating ? 'scoreFlash 260ms ease-in-out infinite' : isWinningTeam ? 'scoreFlash 900ms ease-in-out infinite' : 'none', '@keyframes scoreFlash': { '0%': { color: '#ffffff' }, '50%': { color: '#ffe98b' }, '100%': { color: '#ffffff' } } }}>
                          {scoreMap[team.id]}
                        </Typography>
                        <Typography sx={{ color: '#f4f7ff', fontSize: { xs: '0.95rem', md: '1.15rem' }, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                          Points
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.82)', fontSize: { xs: '0.95rem', md: '1.15rem' } }}>
                          {team.players.length ? team.players.join(' • ') : 'Players pending'}
                        </Typography>
                      </Stack>
                      <Box sx={{ color: isWinningTeam ? '#d8ff9b' : isBuzzWinner ? '#fff6dd' : accent, filter: isWinningTeam ? 'drop-shadow(0 0 12px rgba(202,255,116,0.95)) drop-shadow(0 0 18px rgba(255,214,74,0.65))' : isBuzzWinner ? 'drop-shadow(0 0 10px rgba(255,255,255,0.95)) drop-shadow(0 0 18px rgba(255,170,64,0.95))' : `drop-shadow(0 0 14px ${glow})`, opacity: 0.95, animation: isWinningTeam ? 'winIconPulse 650ms ease-in-out infinite' : isBuzzWinner ? 'buzzIconPulse 420ms ease-in-out infinite' : 'none', '@keyframes buzzIconPulse': { '0%': { transform: 'scale(1) translateX(0px)' }, '50%': { transform: 'scale(1.14) translateX(2px)' }, '100%': { transform: 'scale(1) translateX(0px)' } }, '@keyframes winIconPulse': { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.16)' }, '100%': { transform: 'scale(1)' } } }}>
                        {sideIcon}
                      </Box>
                    </Stack>
                  </Box>
                </Grid>
              );
            })}
          </Grid>

          <Stack spacing={2} alignItems="center" sx={{ filter: isCorrectPhase ? 'none' : undefined }}>
            <Typography
              sx={{
                color: isCorrectPhase ? '#d8ff9b' : 'white',
                fontWeight: 900,
                fontSize: { xs: '1.4rem', md: '2rem' },
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                textShadow: isCorrectPhase ? '0 0 14px rgba(164,255,124,0.72)' : '0 0 10px rgba(255,255,255,0.35)',
              }}
            >
              {isCorrectPhase ? 'Winning theme' : 'Choose a theme'}
            </Typography>

            <Grid container spacing={2}>
              {state.questions.slice(0, 5).map((question, index) => {
                const style = themeStyles[index % themeStyles.length];
                const isActive = state.roundState.selectedQuestionId === question.id;
                const isCorrectSelection = isActive && isCorrectPhase;
                const showPointsBubble = floatingPoints && floatingPoints.teamId === winningTeamId && isCorrectSelection;

                return (
                  <Grid item xs={12} sm={6} md={2.4} key={question.id}>
                    <Box
                      sx={{
                        height: '100%',
                        minHeight: 250,
                        borderRadius: 4,
                        px: 2,
                        py: 2.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: `3px solid ${isCorrectSelection ? '#7dff74' : style.color}`,
                        boxShadow: isCorrectSelection
                          ? '0 0 28px rgba(125,255,116,0.8), inset 0 0 24px rgba(255,255,255,0.12)'
                          : isActive
                            ? `0 0 28px ${style.glow}, inset 0 0 24px rgba(255,255,255,0.08)`
                            : `0 0 18px ${style.glow}`,
                        background: isCorrectSelection
                          ? 'linear-gradient(180deg, rgba(90,255,136,0.16), rgba(10,28,14,0.94))'
                          : isActive
                            ? 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(8,16,32,0.92))'
                            : 'rgba(10,16,32,0.86)',
                        transform: isActive ? 'translateY(-6px) scale(1.02)' : 'none',
                        filter: buzzWinnerTeamId && !isCorrectPhase ? 'grayscale(0.7) brightness(0.62)' : 'none',
                        transition: 'all 180ms ease',
                        position: 'relative',
                        overflow: 'visible',
                      }}
                    >
                      {showPointsBubble && (
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: '74%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            px: 2,
                            py: 0.8,
                            borderRadius: 999,
                            bgcolor: 'rgba(255,149,64,0.96)',
                            color: 'white',
                            fontWeight: 900,
                            fontSize: '1rem',
                            letterSpacing: '0.08em',
                            boxShadow: '0 0 18px rgba(255,149,64,0.9)',
                            animation: 'pointsRise 1100ms ease-out forwards',
                            '@keyframes pointsRise': {
                              '0%': { opacity: 0, transform: 'translate(-50%, 24px) scale(0.8)' },
                              '15%': { opacity: 1, transform: 'translate(-50%, 0px) scale(1)' },
                              '100%': { opacity: 0, transform: 'translate(-10%, -180px) scale(0.92)' },
                            },
                          }}
                        >
                          +{floatingPoints.value} PTS
                        </Box>
                      )}
                      <Typography sx={{ alignSelf: 'flex-start', color: 'white', fontWeight: 900, fontSize: '1.4rem' }}>
                        {index + 1}
                      </Typography>
                      <Box sx={{ position: 'relative', color: isCorrectSelection ? '#7dff74' : style.color, filter: isCorrectSelection ? 'drop-shadow(0 0 16px rgba(125,255,116,0.9))' : `drop-shadow(0 0 14px ${style.glow})` }}>
                        {style.icon}
                        {isCorrectSelection && (
                          <CheckCircleIcon sx={{ position: 'absolute', right: -18, top: -18, fontSize: 34, color: '#8eff65', filter: 'drop-shadow(0 0 12px rgba(125,255,116,0.9))' }} />
                        )}
                      </Box>
                      <Typography
                        sx={{
                          color: isCorrectSelection ? '#9eff85' : style.color,
                          textAlign: 'center',
                          fontWeight: 900,
                          fontSize: { xs: '1.25rem', md: '1.5rem' },
                          lineHeight: 1.05,
                          textTransform: 'uppercase',
                          textShadow: isCorrectSelection ? '0 0 14px rgba(125,255,116,0.85)' : `0 0 12px ${style.glow}`,
                        }}
                      >
                        {question.category || 'Theme'}
                      </Typography>
                      <Typography
                        sx={{
                          color: '#f5f6fb',
                          textAlign: 'center',
                          fontWeight: 800,
                          fontSize: { xs: '0.95rem', md: '1rem' },
                          textTransform: 'uppercase',
                        }}
                      >
                        {getStatusLabel(question, state.roundState.selectedQuestionId, isCorrectSelection)}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Stack>

          <Box
            sx={{
              pt: 1,
              textAlign: 'center',
              filter: buzzWinnerTeamId && !isCorrectPhase ? 'grayscale(0.55) brightness(0.78)' : 'none',
              transition: 'all 220ms ease',
            }}
          >
            {!isCorrectPhase && (
              <>
                <Typography
                  sx={{
                    color: '#ffb14a',
                    fontWeight: 900,
                    fontSize: { xs: '1.2rem', md: '2rem' },
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    textShadow: '0 0 14px rgba(255,177,74,0.65)',
                  }}
                >
                  {chooserTeam ? `${chooserTeam.name}: Select your next theme` : 'Waiting for the next selection'}
                </Typography>
                {selectedQuestion && (
                  <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.78)', fontSize: { xs: '1rem', md: '1.15rem' } }}>
                    Now playing: {selectedQuestion.songLabel}
                  </Typography>
                )}
              </>
            )}
          </Box>

          {isCorrectPhase && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 3,
                background: 'radial-gradient(circle at center, rgba(255,255,255,0.04), transparent 30%)',
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: '3.2rem', md: '6.8rem' },
                  fontWeight: 900,
                  lineHeight: 0.95,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  color: '#d8ff9b',
                  textShadow: '0 0 12px rgba(162,255,109,0.9), 0 0 28px rgba(255,214,74,0.7), 0 0 60px rgba(111,255,84,0.5)',
                  animation: 'correctBannerPulse 980ms ease-in-out infinite',
                  '@keyframes correctBannerPulse': {
                    '0%': { transform: 'scale(1)', opacity: 0.94 },
                    '50%': { transform: 'scale(1.03)', opacity: 1 },
                    '100%': { transform: 'scale(1)', opacity: 0.94 },
                  },
                }}
              >
                Correct Answer!
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
};
