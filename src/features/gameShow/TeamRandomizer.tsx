import { Box, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { GameShowState } from './types';

interface Props {
  state: GameShowState;
}

interface PlayerBubble {
  name: string;
  x: number; y: number;
  vx: number; vy: number;
  targetX: number | null; targetY: number | null;
  assignedTeamIndex: number | null;
  alpha: number; // 0–1, fades out when settled
  color: string;
}

const BUBBLE_COLORS = [
  'rgba(86,215,255,',
  'rgba(255,158,61,',
  'rgba(200,140,255,',
  'rgba(80,255,160,',
  'rgba(255,110,160,',
  'rgba(255,230,60,',
  'rgba(100,220,255,',
  'rgba(255,180,80,',
];

const PHASE_CHAOS = 0;
const PHASE_SETTLE = 1;
const PHASE_DONE = 2;

const CHAOS_DURATION = 3800;
const SETTLE_DURATION = 1600;

const TEAM_COLORS = ['#56d7ff', '#ff9e3d', '#c88cff', '#50ffa0'];

export const TeamRandomizer = ({ state }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<PlayerBubble[]>([]);
  const phaseRef = useRef(PHASE_CHAOS);
  const animIdRef = useRef<number>(0);
  const teamPanelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [phase, setPhase] = useState(PHASE_CHAOS);
  const [settled, setSettled] = useState(false);

  const players = state.playerPool;
  const teams = state.teams.filter(t => !t.eliminated);

  useEffect(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;

    bubblesRef.current = players.map((name, i) => ({
      name,
      x: W * 0.15 + Math.random() * W * 0.7,
      y: H * 0.15 + Math.random() * H * 0.6,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      targetX: null, targetY: null,
      assignedTeamIndex: null,
      alpha: 1,
      color: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
    }));

    teams.forEach((team, ti) => {
      team.players.forEach(playerName => {
        const b = bubblesRef.current.find(b => b.name === playerName);
        if (b) b.assignedTeamIndex = ti;
      });
    });

    const chaosTimer = window.setTimeout(() => {
      phaseRef.current = PHASE_SETTLE;
      setPhase(PHASE_SETTLE);
    }, CHAOS_DURATION);

    const doneTimer = window.setTimeout(() => {
      phaseRef.current = PHASE_DONE;
      setPhase(PHASE_DONE);
      window.setTimeout(() => setSettled(true), 300);
    }, CHAOS_DURATION + SETTLE_DURATION);

    return () => { window.clearTimeout(chaosTimer); window.clearTimeout(doneTimer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const RADIUS = 105;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      bubblesRef.current.forEach(b => {
        if (phaseRef.current === PHASE_CHAOS) {
          b.x += b.vx;
          b.y += b.vy;
          if (b.x < RADIUS) { b.x = RADIUS; b.vx = Math.abs(b.vx); }
          if (b.x > W - RADIUS) { b.x = W - RADIUS; b.vx = -Math.abs(b.vx); }
          if (b.y < RADIUS) { b.y = RADIUS; b.vy = Math.abs(b.vy); }
          if (b.y > H - RADIUS) { b.y = H - RADIUS; b.vy = -Math.abs(b.vy); }
          b.vx += (Math.random() - 0.5) * 0.5;
          b.vy += (Math.random() - 0.5) * 0.5;
          b.vx = Math.max(-8, Math.min(8, b.vx));
          b.vy = Math.max(-8, Math.min(8, b.vy));
        } else if (phaseRef.current === PHASE_SETTLE && b.targetX !== null && b.targetY !== null) {
          const dx = b.targetX - b.x;
          const dy = b.targetY - b.y;
          b.x += dx * 0.09;
          b.y += dy * 0.09;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // Fade out as they approach target
          b.alpha = Math.min(1, dist / 80);
        } else if (phaseRef.current === PHASE_DONE) {
          b.alpha = Math.max(0, b.alpha - 0.06);
        }

        if (b.alpha <= 0.01) return;

        // Glow halo
        const grad = ctx.createRadialGradient(b.x, b.y, RADIUS * 0.3, b.x, b.y, RADIUS * 1.8);
        grad.addColorStop(0, b.color + '0.15)');
        grad.addColorStop(1, b.color + '0)');
        ctx.save();
        ctx.globalAlpha = b.alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, RADIUS * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Bubble circle
        ctx.beginPath();
        ctx.arc(b.x, b.y, RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = b.color + '0.14)';
        ctx.fill();
        ctx.strokeStyle = b.color + '0.95)';
        ctx.lineWidth = 3;
        ctx.shadowColor = b.color + '1)';
        ctx.shadowBlur = 28;
        ctx.stroke();

        // Name
        ctx.font = 'bold 28px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = b.color + '1)';
        ctx.shadowBlur = 14;
        const words = b.name.split(' ');
        if (words.length > 1) {
          ctx.fillText(words[0], b.x, b.y - 16);
          ctx.fillText(words.slice(1).join(' '), b.x, b.y + 16);
        } else {
          ctx.fillText(b.name, b.x, b.y);
        }
        ctx.restore();
      });

      animIdRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(animIdRef.current); window.removeEventListener('resize', resize); };
  }, []);

  // Compute targets when entering settle phase
  useEffect(() => {
    if (phase !== PHASE_SETTLE) return;
    const t = window.setTimeout(() => {
      teams.forEach((_, ti) => {
        const panel = teamPanelRefs.current[ti];
        if (!panel) return;
        const rect = panel.getBoundingClientRect();
        const teamBubbles = bubblesRef.current.filter(b => b.assignedTeamIndex === ti);
        const cols = Math.min(4, teamBubbles.length);
        const spacing = 120;
        teamBubbles.forEach((b, bi) => {
          const col = bi % cols;
          const row = Math.floor(bi / cols);
          const totalCols = Math.min(cols, teamBubbles.length - row * cols);
          const startX = rect.left + rect.width / 2 - ((totalCols - 1) * spacing) / 2;
          b.targetX = startX + col * spacing;
          b.targetY = rect.top + rect.height / 2 + row * spacing - (Math.floor((teamBubbles.length - 1) / cols) * spacing) / 2;
        });
      });
    }, 80);
    return () => clearTimeout(t);
  }, [phase, teams]);

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      overflow: 'auto',
      background: 'radial-gradient(ellipse 90% 70% at 50% 40%, rgba(8,25,65,0.95) 0%, rgba(2,6,18,1) 65%), linear-gradient(180deg, #010510 0%, #020a1a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} />

      {/* Header — top 15% */}
      <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', pt: '3vh' }}>
        <Typography sx={{
          fontWeight: 900,
          fontSize: 'clamp(1.5rem, 4vw, 5.5rem)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: phase === PHASE_DONE ? '#60ff90' : '#40d8ff',
          textShadow: phase === PHASE_DONE
            ? '0 0 20px rgba(80,255,140,0.95), 0 0 50px rgba(40,220,100,0.6)'
            : '0 0 18px rgba(40,210,255,0.95), 0 0 45px rgba(40,180,255,0.55)',
          transition: 'color 600ms ease, text-shadow 600ms ease',
          animation: 'headerPulse 2s ease-in-out infinite',
          '@keyframes headerPulse': { '0%': { opacity: 0.85 }, '50%': { opacity: 1 }, '100%': { opacity: 0.85 } },
        }}>
          {phase === PHASE_CHAOS ? '🎲 Randomizing Teams...' : phase === PHASE_SETTLE ? '⚡ Assigning Players...' : '✅ Teams Set!'}
        </Typography>
        <Typography sx={{
          color: 'rgba(255,215,0,0.55)',
          fontSize: 'clamp(0.65rem, 1.1vw, 1.3rem)',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          mt: 0.5,
        }}>
          Name That Tune
        </Typography>
      </Box>

      {/* Team panels — centered vertically, large, filling most of the screen */}
      <Box sx={{
        position: 'relative',
        zIndex: 2,
        flex: 1,
        width: '100%',
        display: 'flex',
        flexWrap: teams.length === 4 ? 'wrap' : 'nowrap',
        alignItems: teams.length === 4 ? 'flex-start' : 'center',
        justifyContent: 'center',
        px: '4vw',
        pt: '2vh',
        pb: '4vh',
        gap: '3vw',
      }}>
        {teams.map((team, ti) => (
          <Box
            key={team.id}
            ref={(el: HTMLDivElement | null) => { teamPanelRefs.current[ti] = el; }}
            sx={{
              flex: teams.length === 4 ? '0 0 calc(50% - 1.5vw)' : 1,
              minHeight: teams.length === 4 ? '36vh' : '58vh',
              maxWidth: teams.length <= 2 ? '42vw' : teams.length === 3 ? '30vw' : 'calc(50% - 1.5vw)',
              overflow: 'hidden',
              borderRadius: 5,
              border: `2px solid ${TEAM_COLORS[ti % TEAM_COLORS.length]}`,
              background: `radial-gradient(ellipse at 50% 10%, ${TEAM_COLORS[ti % TEAM_COLORS.length]}28 0%, rgba(5,10,25,0.97) 65%)`,
              boxShadow: `0 0 30px ${TEAM_COLORS[ti % TEAM_COLORS.length]}44, inset 0 0 30px ${TEAM_COLORS[ti % TEAM_COLORS.length]}0a`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 500ms ease',
              opacity: phase === PHASE_CHAOS ? 0.35 : 1,
              ...(settled && {
                boxShadow: `0 0 50px ${TEAM_COLORS[ti % TEAM_COLORS.length]}88, 0 0 100px ${TEAM_COLORS[ti % TEAM_COLORS.length]}33, inset 0 0 40px ${TEAM_COLORS[ti % TEAM_COLORS.length]}15`,
              }),
            }}
          >
            <Typography sx={{
              fontWeight: 900,
              fontSize: 'clamp(1.3rem, 3vw, 4rem)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              textAlign: 'center',
              color: TEAM_COLORS[ti % TEAM_COLORS.length],
              textShadow: `0 0 16px ${TEAM_COLORS[ti % TEAM_COLORS.length]}, 0 0 36px ${TEAM_COLORS[ti % TEAM_COLORS.length]}88`,
              mb: settled ? 3 : 0,
              transition: 'margin 400ms ease',
              px: 2,
            }}>
              {team.name}
            </Typography>

            {settled && (
              <Box sx={{ overflowY: 'auto', maxHeight: teams.length === 4 ? '22vh' : '40vh', width: '100%', px: 2 }}>
              <Stack spacing={team.players.length > 4 ? 0.5 : 1.5} alignItems="center">
                {team.players.map((p, pi) => (
                  <Typography key={p} sx={{
                    color: '#fff',
                    fontSize: team.players.length > 6
                      ? 'clamp(0.75rem, 1.2vw, 1.4rem)'
                      : team.players.length > 4
                        ? 'clamp(0.9rem, 1.5vw, 2rem)'
                        : 'clamp(1rem, 2vw, 2.8rem)',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textAlign: 'center',
                    textShadow: `0 0 10px ${TEAM_COLORS[ti % TEAM_COLORS.length]}88`,
                    opacity: 0,
                    animation: `fadeInPlayer 500ms ease ${pi * 120}ms forwards`,
                    '@keyframes fadeInPlayer': {
                      from: { opacity: 0, transform: 'translateY(16px)' },
                      to: { opacity: 1, transform: 'none' },
                    },
                  }}>
                    {p}
                  </Typography>
                ))}
              </Stack>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
