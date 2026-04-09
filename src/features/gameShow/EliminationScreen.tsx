import { Box, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import type { GameShowTeam } from './types';

interface Props {
  team: GameShowTeam;
  onDone: () => void;
  duration?: number;
}

export const EliminationScreen = ({ team, onDone, duration = 4500 }: Props) => {
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    const t = window.setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    }, duration);
    return () => window.clearTimeout(t);
  }, [team.id, duration, onDone]);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 110% 80% at 50% 30%, rgba(160,0,0,0.75) 0%, rgba(60,0,0,0.98) 55%), linear-gradient(180deg, #0d0000 0%, #1a0000 50%, #080000 100%)',
        animation: 'elimBgPulse 800ms ease-in-out infinite',
        '@keyframes elimBgPulse': {
          '0%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.18)' },
          '100%': { filter: 'brightness(1)' },
        },
      }}
    >
      {/* Strobe scanlines overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,0,0,0.04) 3px, rgba(255,0,0,0.04) 6px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Radial red halo burst */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,0,0,0.22) 0%, transparent 60%)',
          animation: 'haloPulse 600ms ease-in-out infinite',
          '@keyframes haloPulse': {
            '0%': { opacity: 0.6 },
            '50%': { opacity: 1 },
            '100%': { opacity: 0.6 },
          },
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Big X */}
      <Box
        sx={{
          position: 'absolute',
          top: '6vh',
          fontSize: 'clamp(4rem, 10vw, 12rem)',
          fontWeight: 900,
          lineHeight: 1,
          color: '#ff1a1a',
          textShadow:
            '0 0 30px rgba(255,0,0,1), 0 0 70px rgba(220,0,0,0.9), 0 0 130px rgba(180,0,0,0.7)',
          animation: 'xFlash 500ms ease-in-out infinite',
          '@keyframes xFlash': {
            '0%': { opacity: 1, transform: 'scale(1)' },
            '50%': { opacity: 0.55, transform: 'scale(0.96)' },
            '100%': { opacity: 1, transform: 'scale(1)' },
          },
          zIndex: 2,
          userSelect: 'none',
        }}
      >
        ✕
      </Box>

      {/* Logo above */}
      <Typography
        sx={{
          position: 'absolute',
          top: '4vh',
          fontWeight: 900,
          fontSize: 'clamp(0.9rem, 2vw, 2.2rem)',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'rgba(255,80,80,0.45)',
          textShadow: '0 0 12px rgba(255,0,0,0.3)',
          zIndex: 2,
        }}
      >
        Name That Tune
      </Typography>

      {/* Central shattered team panel */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          mt: '-4vh',
          px: { xs: '6vw', md: '10vw' },
          py: '3vh',
          borderRadius: 5,
          border: '3px solid rgba(255,20,20,0.85)',
          background:
            'linear-gradient(135deg, rgba(80,0,0,0.7) 0%, rgba(30,0,0,0.92) 60%, rgba(10,0,0,0.97) 100%)',
          boxShadow:
            '0 0 60px rgba(255,0,0,0.9), 0 0 140px rgba(200,0,0,0.65), inset 0 0 50px rgba(255,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          minWidth: { xs: '70vw', md: '44vw' },
          animation: 'panelShake 120ms ease-in-out infinite',
          '@keyframes panelShake': {
            '0%': { transform: 'translateX(0px) rotate(0deg)' },
            '25%': { transform: 'translateX(-2px) rotate(-0.3deg)' },
            '75%': { transform: 'translateX(2px) rotate(0.3deg)' },
            '100%': { transform: 'translateX(0px) rotate(0deg)' },
          },
        }}
      >
        {/* Crack lines SVG overlay */}
        <Box
          component="svg"
          viewBox="0 0 400 200"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            opacity: 0.6,
          }}
        >
          <polyline points="80,0 110,60 60,90 120,140 90,200" stroke="#ff2020" strokeWidth="1.5" fill="none" />
          <polyline points="220,0 240,50 200,80 260,130 230,200" stroke="#ff2020" strokeWidth="1" fill="none" />
          <polyline points="340,20 310,70 360,100 320,160" stroke="#ff3030" strokeWidth="1.2" fill="none" />
          <polyline points="0,60 50,80 20,120" stroke="#ff2020" strokeWidth="0.8" fill="none" />
        </Box>

        {/* Team name — grayscale + cracked feel */}
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: 'clamp(2rem, 5vw, 7rem)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.22)',
            textShadow:
              '0 0 18px rgba(255,20,20,0.9), 0 0 40px rgba(200,0,0,0.7)',
            filter: 'grayscale(1)',
          }}
        >
          {team.name}
        </Typography>

        {/* Score locked banner */}
        <Box
          sx={{
            px: 4,
            py: 1,
            borderRadius: 99,
            background:
              'linear-gradient(90deg, rgba(20,10,0,0.92), rgba(40,20,0,0.92))',
            border: '2px solid rgba(255,180,0,0.7)',
            boxShadow:
              '0 0 18px rgba(255,160,0,0.7), 0 0 40px rgba(200,120,0,0.45)',
          }}
        >
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: 'clamp(0.9rem, 1.6vw, 2rem)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#ffd54a',
              textShadow: '0 0 12px rgba(255,200,40,0.9), 0 0 28px rgba(255,160,0,0.6)',
              animation: 'goldFlash 700ms ease-in-out infinite',
              '@keyframes goldFlash': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.6 },
                '100%': { opacity: 1 },
              },
            }}
          >
            ★ Points Locked: {team.score} ★
          </Typography>
        </Box>
      </Box>

      {/* ELIMINATED! text */}
      <Typography
        sx={{
          position: 'relative',
          zIndex: 2,
          mt: '4vh',
          fontWeight: 900,
          fontSize: 'clamp(3.5rem, 10vw, 14rem)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          lineHeight: 0.9,
          textAlign: 'center',
          color: '#ff1a1a',
          textShadow:
            '0 0 20px rgba(255,0,0,1), 0 0 50px rgba(220,0,0,0.9), 0 0 100px rgba(180,0,0,0.7), 0 6px 0 rgba(100,0,0,0.8)',
          WebkitTextStroke: '2px rgba(255,80,80,0.6)',
          animation: 'elimTextPulse 600ms ease-in-out infinite',
          '@keyframes elimTextPulse': {
            '0%': { transform: 'scale(1)', textShadow: '0 0 20px rgba(255,0,0,1), 0 0 50px rgba(220,0,0,0.9), 0 0 100px rgba(180,0,0,0.7)' },
            '50%': { transform: 'scale(1.04)', textShadow: '0 0 32px rgba(255,0,0,1), 0 0 80px rgba(240,0,0,1), 0 0 160px rgba(200,0,0,0.85)' },
            '100%': { transform: 'scale(1)', textShadow: '0 0 20px rgba(255,0,0,1), 0 0 50px rgba(220,0,0,0.9), 0 0 100px rgba(180,0,0,0.7)' },
          },
        }}
      >
        🚫 Eliminated!
      </Typography>

      {/* Team name callout below */}
      <Typography
        sx={{
          position: 'relative',
          zIndex: 2,
          mt: '2vh',
          fontWeight: 900,
          fontSize: 'clamp(1.8rem, 4.5vw, 7rem)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          textAlign: 'center',
          color: '#ff6060',
          textShadow:
            '0 0 16px rgba(255,60,60,0.95), 0 0 40px rgba(200,0,0,0.7)',
          animation: 'nameFlash 800ms ease-in-out infinite',
          '@keyframes nameFlash': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.7 },
            '100%': { opacity: 1 },
          },
        }}
      >
        ✦ {team.name}! ✦
      </Typography>

      {/* Footer lockout banner */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '4vh',
          px: 5,
          py: 1.5,
          borderRadius: 2,
          border: '2px solid rgba(255,40,40,0.6)',
          background: 'rgba(40,0,0,0.88)',
          boxShadow: '0 0 24px rgba(255,0,0,0.5)',
          zIndex: 2,
        }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: 'clamp(0.75rem, 1.3vw, 1.6rem)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#ff6060',
            textShadow: '0 0 10px rgba(255,50,50,0.8)',
          }}
        >
          🛑 Locked Out of Play — Next Team's Turn 🛑
        </Typography>
      </Box>
    </Box>
  );
};
