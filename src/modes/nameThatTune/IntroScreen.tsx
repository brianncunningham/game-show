import { Box, Stack, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';

export const IntroScreen = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Floating ambient particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; color: string;
    }> = [];

    const colors = ['rgba(40,210,255,', 'rgba(80,180,255,', 'rgba(180,220,255,', 'rgba(100,160,255,'];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.2 - Math.random() * 0.5,
        size: 1 + Math.random() * 3,
        opacity: 0.2 + Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.opacity})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(10,40,90,0.95) 0%, rgba(2,8,22,1) 70%), linear-gradient(180deg, #010510 0%, #030b1a 50%, #010510 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* Mist layer */}
      <Box sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '35%',
        background: 'linear-gradient(to top, rgba(10,40,100,0.35) 0%, transparent 100%)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Floor reflection glow */}
      <Box sx={{
        position: 'absolute',
        bottom: 0,
        left: '10%',
        right: '10%',
        height: '2px',
        background: 'linear-gradient(90deg, transparent, rgba(40,210,255,0.5), rgba(255,215,0,0.4), rgba(40,210,255,0.5), transparent)',
        boxShadow: '0 0 40px 20px rgba(40,180,255,0.12)',
        zIndex: 2,
      }} />

      <Stack alignItems="center" spacing={0} sx={{ position: 'relative', zIndex: 3, textAlign: 'center', px: 4 }}>

        {/* Crown / wreath decoration */}
        <Typography sx={{
          fontSize: 'clamp(1.5rem, 3.5vw, 4rem)',
          mb: 1,
          filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.7)) drop-shadow(0 0 30px rgba(255,180,0,0.4))',
          animation: 'crownPulse 3s ease-in-out infinite',
          '@keyframes crownPulse': {
            '0%': { filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.6)) drop-shadow(0 0 25px rgba(255,180,0,0.3))' },
            '50%': { filter: 'drop-shadow(0 0 18px rgba(255,225,0,0.9)) drop-shadow(0 0 45px rgba(255,200,0,0.6))' },
            '100%': { filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.6)) drop-shadow(0 0 25px rgba(255,180,0,0.3))' },
          },
        }}>
          👑 🌿 🎵 🌿 👑
        </Typography>

        {/* Main title */}
        <Typography sx={{
          fontWeight: 900,
          fontSize: 'clamp(3.5rem, 12vw, 18rem)',
          lineHeight: 0.85,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          background: 'linear-gradient(180deg, #ffffff 0%, #a8d8ff 35%, #40d8ff 65%, #1090cc 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: 'none',
          filter: 'drop-shadow(0 0 20px rgba(40,210,255,0.8)) drop-shadow(0 0 50px rgba(40,180,255,0.5))',
          animation: 'titleGlow 2.5s ease-in-out infinite',
          '@keyframes titleGlow': {
            '0%': { filter: 'drop-shadow(0 0 16px rgba(40,210,255,0.7)) drop-shadow(0 0 40px rgba(40,180,255,0.4))' },
            '50%': { filter: 'drop-shadow(0 0 28px rgba(60,230,255,1)) drop-shadow(0 0 70px rgba(40,200,255,0.7)) drop-shadow(0 0 120px rgba(20,160,255,0.4))' },
            '100%': { filter: 'drop-shadow(0 0 16px rgba(40,210,255,0.7)) drop-shadow(0 0 40px rgba(40,180,255,0.4))' },
          },
          mb: 0.5,
        }}>
          Name
        </Typography>
        <Typography sx={{
          fontWeight: 900,
          fontSize: 'clamp(1.8rem, 5.5vw, 8rem)',
          lineHeight: 1,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#ffd700',
          textShadow: '0 0 16px rgba(255,215,0,0.95), 0 0 40px rgba(255,200,0,0.7), 0 0 80px rgba(255,180,0,0.4)',
          animation: 'goldPulse 2.5s ease-in-out infinite',
          '@keyframes goldPulse': {
            '0%': { textShadow: '0 0 14px rgba(255,215,0,0.85), 0 0 35px rgba(255,200,0,0.6), 0 0 70px rgba(255,180,0,0.35)' },
            '50%': { textShadow: '0 0 24px rgba(255,225,0,1), 0 0 55px rgba(255,210,0,0.9), 0 0 110px rgba(255,200,0,0.6)' },
            '100%': { textShadow: '0 0 14px rgba(255,215,0,0.85), 0 0 35px rgba(255,200,0,0.6), 0 0 70px rgba(255,180,0,0.35)' },
          },
          mb: 2,
        }}>
          That Tune
        </Typography>

        {/* Divider line */}
        <Box sx={{
          width: 'clamp(200px, 50vw, 700px)',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.7), rgba(40,210,255,0.7), rgba(255,215,0,0.7), transparent)',
          boxShadow: '0 0 12px rgba(255,215,0,0.5), 0 0 24px rgba(40,210,255,0.3)',
          mb: 3,
        }} />

        {/* Tagline */}
        <Typography sx={{
          fontWeight: 800,
          fontSize: 'clamp(0.9rem, 2.2vw, 3rem)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#ffd700',
          textShadow: '0 0 12px rgba(255,215,0,0.8), 0 0 28px rgba(255,200,0,0.5)',
          mb: 1.5,
        }}>
          Buzz Fast. Name That Tune. Win Big.
        </Typography>

        {/* EST */}
        <Typography sx={{
          fontWeight: 600,
          fontSize: 'clamp(0.6rem, 1.1vw, 1.4rem)',
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          color: 'rgba(255,215,0,0.5)',
          mb: 5,
        }}>
          Est. 2026
        </Typography>

        {/* Get ready line */}
        <Typography sx={{
          fontWeight: 700,
          fontSize: 'clamp(0.8rem, 1.8vw, 2.4rem)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#40d8ff',
          textShadow: '0 0 14px rgba(40,210,255,0.95), 0 0 30px rgba(40,180,255,0.6)',
          animation: 'readyPulse 1.8s ease-in-out infinite',
          '@keyframes readyPulse': {
            '0%': { opacity: 0.7 },
            '50%': { opacity: 1 },
            '100%': { opacity: 0.7 },
          },
        }}>
          Get Ready... The Match Begins Soon.
        </Typography>

        {/* Musical note floaters */}
        {['♪', '♫', '♩', '♬', '♪', '♫'].map((note, i) => (
          <Box key={i} component="span" sx={{
            position: 'fixed',
            left: `${10 + i * 16}%`,
            bottom: `${8 + (i % 3) * 8}%`,
            fontSize: `clamp(1rem, ${1.5 + i * 0.4}vw, ${2 + i * 0.5}rem)`,
            color: i % 2 === 0 ? 'rgba(40,210,255,0.25)' : 'rgba(255,215,0,0.2)',
            filter: 'blur(0.5px)',
            animation: `noteFloat${i} ${4 + i * 0.7}s ease-in-out infinite`,
            [`@keyframes noteFloat${i}`]: {
              '0%': { transform: `translateY(0) rotate(${i * 5}deg)`, opacity: 0.15 },
              '50%': { transform: `translateY(-24px) rotate(${i * 5 + 10}deg)`, opacity: 0.35 },
              '100%': { transform: `translateY(0) rotate(${i * 5}deg)`, opacity: 0.15 },
            },
            zIndex: 2,
          }}>
            {note}
          </Box>
        ))}

      </Stack>
    </Box>
  );
};
