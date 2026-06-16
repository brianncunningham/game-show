import { Box, Stack, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import type { GameShowState } from './types';

interface Props {
  state: GameShowState;
}

export const VictoryScreen = ({ state }: Props) => {
  const winner = state.teams.find(t => t.id === state.chooserTeamId) ?? state.teams[0];
  const loser = state.teams.find(t => t.id !== winner?.id);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Confetti animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces: Array<{
      x: number; y: number; vx: number; vy: number;
      angle: number; va: number; size: number;
      color: string; shape: 'rect' | 'note';
    }> = [];

    const colors = ['#ffd700', '#40d8ff', '#fff', '#ff9e3d', '#d8ff9b', '#ffa0f0'];
    const notes = ['♪', '♫', '♩', '♬'];

    for (let i = 0; i < 160; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        vx: (Math.random() - 0.5) * 2.5,
        vy: 1.5 + Math.random() * 3,
        angle: Math.random() * Math.PI * 2,
        va: (Math.random() - 0.5) * 0.12,
        size: 8 + Math.random() * 14,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() > 0.75 ? 'note' : 'rect',
      });
    }

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = p.color;
        if (p.shape === 'note') {
          ctx.font = `${p.size * 2}px serif`;
          ctx.fillText(notes[Math.floor(Math.random() * notes.length)], 0, 0);
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.va;
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(255,220,0,0.55) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(40,210,255,0.45) 0%, transparent 55%), linear-gradient(180deg, #0a0e00 0%, #10140a 40%, #050d12 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      {/* Confetti canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* Radial spotlight */}
      <Box sx={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(255,210,30,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 1,
        animation: 'spotPulse 2.2s ease-in-out infinite',
        '@keyframes spotPulse': {
          '0%': { opacity: 0.7 },
          '50%': { opacity: 1 },
          '100%': { opacity: 0.7 },
        },
      }} />

      <Stack alignItems="center" spacing={0} sx={{ position: 'relative', zIndex: 2, px: 4, textAlign: 'center' }}>

        {/* Header */}
        <Typography sx={{
          fontWeight: 900,
          fontSize: 'clamp(1rem, 2.2vw, 2.8rem)',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: '#40d8ff',
          textShadow: '0 0 18px rgba(40,210,255,0.95), 0 0 40px rgba(40,210,255,0.6)',
          mb: 0.5,
        }}>
          Name That Tune
        </Typography>
        <Box sx={{ mb: 3 }} />

        {/* CHAMPIONS! text */}
        <Typography sx={{
          fontWeight: 900,
          fontSize: 'clamp(3rem, 9vw, 13rem)',
          lineHeight: 0.9,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#ffd700',
          textShadow: '0 0 20px rgba(255,215,0,1), 0 0 50px rgba(255,200,0,0.85), 0 0 100px rgba(255,160,0,0.6), 0 4px 30px rgba(0,0,0,0.8)',
          animation: 'champPulse 1.4s ease-in-out infinite',
          '@keyframes champPulse': {
            '0%': { textShadow: '0 0 20px rgba(255,215,0,0.9), 0 0 50px rgba(255,200,0,0.75), 0 0 100px rgba(255,160,0,0.5)' },
            '50%': { textShadow: '0 0 30px rgba(255,225,0,1), 0 0 70px rgba(255,210,0,1), 0 0 140px rgba(255,180,0,0.8), 0 0 200px rgba(40,210,255,0.4)' },
            '100%': { textShadow: '0 0 20px rgba(255,215,0,0.9), 0 0 50px rgba(255,200,0,0.75), 0 0 100px rgba(255,160,0,0.5)' },
          },
          mb: 1,
        }}>
          Champions!
        </Typography>

        {/* Hero team panel */}
        <Box sx={{
          my: 2,
          px: { xs: 4, md: 8 },
          py: { xs: 3, md: 4 },
          borderRadius: 6,
          border: '3px solid rgba(255,215,0,0.9)',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,200,30,0.38), rgba(10,14,6,0.97) 60%), rgba(10,12,4,0.97)',
          boxShadow: '0 0 40px rgba(255,215,0,0.9), 0 0 80px rgba(255,200,0,0.6), 0 0 160px rgba(40,210,255,0.35), inset 0 0 40px rgba(255,215,0,0.12)',
          animation: 'heroPanelPulse 1.6s ease-in-out infinite',
          '@keyframes heroPanelPulse': {
            '0%': { boxShadow: '0 0 36px rgba(255,215,0,0.85), 0 0 72px rgba(255,200,0,0.55), 0 0 140px rgba(40,210,255,0.3)' },
            '50%': { boxShadow: '0 0 55px rgba(255,225,0,1), 0 0 110px rgba(255,210,0,0.8), 0 0 200px rgba(40,210,255,0.55), 0 0 300px rgba(255,180,0,0.25)' },
            '100%': { boxShadow: '0 0 36px rgba(255,215,0,0.85), 0 0 72px rgba(255,200,0,0.55), 0 0 140px rgba(40,210,255,0.3)' },
          },
          minWidth: { xs: '80vw', md: '40vw' },
        }}>
          {/* Laurel decorations */}
          <Typography sx={{ fontSize: 'clamp(1.5rem, 3vw, 3.5rem)', lineHeight: 1, mb: 1, filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.8))' }}>
            🏆 🌟 🏆
          </Typography>

          <Typography sx={{
            fontWeight: 900,
            fontSize: 'clamp(2rem, 5.5vw, 8rem)',
            lineHeight: 1,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#ffa040',
            textShadow: '0 0 16px rgba(255,160,64,1), 0 0 36px rgba(255,200,40,0.8), 0 0 70px rgba(255,130,20,0.5)',
            animation: 'teamNamePulse 1.4s ease-in-out infinite',
            '@keyframes teamNamePulse': {
              '0%': { color: '#ffa040' },
              '50%': { color: '#ffd060' },
              '100%': { color: '#ffa040' },
            },
          }}>
            {winner?.name}
          </Typography>

          <Typography sx={{
            fontWeight: 900,
            fontSize: 'clamp(4rem, 12vw, 18rem)',
            lineHeight: 0.85,
            color: '#fff',
            textShadow: '0 0 20px rgba(255,255,255,1), 0 0 50px rgba(255,220,60,0.9), 0 0 100px rgba(255,200,40,0.65)',
            letterSpacing: '-0.02em',
          }}>
            {winner?.score}
          </Typography>

          <Typography sx={{
            fontWeight: 700,
            fontSize: 'clamp(0.9rem, 1.8vw, 2.2rem)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: 'rgba(255,215,0,0.85)',
            mt: 0.5,
          }}>
            Points
          </Typography>

          {winner?.players?.length ? (
            <Typography sx={{ mt: 1.5, color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.75rem, 1.2vw, 1.6rem)', letterSpacing: '0.08em' }}>
              {winner.players.join(' · ')}
            </Typography>
          ) : null}
        </Box>

        {/* Floating champions banner */}
        <Box sx={{
          mt: 1,
          px: 4, py: 1.5,
          border: '2px solid rgba(255,215,0,0.7)',
          borderRadius: 2,
          background: 'linear-gradient(90deg, rgba(40,210,255,0.2), rgba(255,215,0,0.25), rgba(40,210,255,0.2))',
          boxShadow: '0 0 24px rgba(255,215,0,0.6), 0 0 50px rgba(40,210,255,0.3)',
          animation: 'bannerGlow 1.2s ease-in-out infinite',
          '@keyframes bannerGlow': {
            '0%': { boxShadow: '0 0 18px rgba(255,215,0,0.5), 0 0 36px rgba(40,210,255,0.25)' },
            '50%': { boxShadow: '0 0 32px rgba(255,225,0,0.9), 0 0 64px rgba(40,210,255,0.5)' },
            '100%': { boxShadow: '0 0 18px rgba(255,215,0,0.5), 0 0 36px rgba(40,210,255,0.25)' },
          },
        }}>
          <Typography sx={{
            fontWeight: 900,
            fontSize: 'clamp(1rem, 2.2vw, 2.8rem)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#ffd700',
            textShadow: '0 0 14px rgba(255,215,0,0.98), 0 0 30px rgba(40,210,255,0.7)',
          }}>
            ⭐ {winner?.name} — Champions!! ⭐
          </Typography>
        </Box>

        {/* Runner up */}
        {loser && (
          <Typography sx={{
            mt: 3,
            color: 'rgba(255,255,255,0.4)',
            fontSize: 'clamp(0.75rem, 1.1vw, 1.4rem)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            {loser.name} — {loser.score} pts
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
