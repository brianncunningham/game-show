import { Box, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { SurveyTeam } from './types';

interface Props {
  teams: [SurveyTeam, SurveyTeam];
  playerPool: string[];
  onDone?: () => void;
}

interface PlayerBubble {
  name: string;
  x: number; y: number;
  vx: number; vy: number;
  targetX: number | null; targetY: number | null;
  assignedTeamIndex: number | null;
  alpha: number;
  color: string;
}

const TEAM_COLORS = ['#00e5ff', '#ff6a00'] as const;
const BUBBLE_COLORS = ['rgba(0,229,255,', 'rgba(255,106,0,', 'rgba(120,200,255,', 'rgba(255,170,90,'];
const fontSx = { fontFamily: '"Barlow Condensed", Impact, sans-serif' };

const PHASE_CHAOS = 0;
const PHASE_SETTLE = 1;
const PHASE_DONE = 2;
const CHAOS_DURATION = 3400;
const SETTLE_DURATION = 1600;

export const SSTeamRandomizer = ({ teams, playerPool, onDone }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<PlayerBubble[]>([]);
  const phaseRef = useRef(PHASE_CHAOS);
  const animIdRef = useRef<number>(0);
  const teamPanelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [phase, setPhase] = useState(PHASE_CHAOS);
  const [settled, setSettled] = useState(false);

  // All players that will be assigned (union of pool + already-assigned).
  const players = [...new Set([...playerPool, ...teams.flatMap(t => t.players)])];

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
        const b = bubblesRef.current.find(x => x.name === playerName);
        if (b) b.assignedTeamIndex = ti;
      });
    });

    const chaosTimer = window.setTimeout(() => { phaseRef.current = PHASE_SETTLE; setPhase(PHASE_SETTLE); }, CHAOS_DURATION);
    const doneTimer = window.setTimeout(() => {
      phaseRef.current = PHASE_DONE;
      setPhase(PHASE_DONE);
      window.setTimeout(() => { setSettled(true); onDone?.(); }, 300);
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
    const RADIUS = 95;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      bubblesRef.current.forEach(b => {
        if (phaseRef.current === PHASE_CHAOS) {
          b.x += b.vx; b.y += b.vy;
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
          b.x += dx * 0.09; b.y += dy * 0.09;
          b.alpha = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 80);
        } else if (phaseRef.current === PHASE_DONE) {
          b.alpha = Math.max(0, b.alpha - 0.06);
        }
        if (b.alpha <= 0.01) return;

        const grad = ctx.createRadialGradient(b.x, b.y, RADIUS * 0.3, b.x, b.y, RADIUS * 1.8);
        grad.addColorStop(0, b.color + '0.15)');
        grad.addColorStop(1, b.color + '0)');
        ctx.save();
        ctx.globalAlpha = b.alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, RADIUS * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(b.x, b.y, RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = b.color + '0.14)';
        ctx.fill();
        ctx.strokeStyle = b.color + '0.95)';
        ctx.lineWidth = 3;
        ctx.shadowColor = b.color + '1)';
        ctx.shadowBlur = 26;
        ctx.stroke();
        ctx.font = 'bold 26px "Barlow Condensed", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = b.color + '1)';
        ctx.shadowBlur = 12;
        ctx.fillText(b.name, b.x, b.y);
        ctx.restore();
      });
      animIdRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animIdRef.current); window.removeEventListener('resize', resize); };
  }, []);

  // Compute bubble targets toward each team panel when settling
  useEffect(() => {
    if (phase !== PHASE_SETTLE) return;
    const t = window.setTimeout(() => {
      teams.forEach((_, ti) => {
        const panel = teamPanelRefs.current[ti];
        if (!panel) return;
        const rect = panel.getBoundingClientRect();
        const teamBubbles = bubblesRef.current.filter(b => b.assignedTeamIndex === ti);
        const spacing = 110;
        teamBubbles.forEach((b, bi) => {
          b.targetX = rect.left + rect.width / 2;
          b.targetY = rect.top + rect.height / 2 + bi * spacing - ((teamBubbles.length - 1) * spacing) / 2;
        });
      });
    }, 80);
    return () => clearTimeout(t);
  }, [phase, teams]);

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 50, overflow: 'hidden',
      background: 'radial-gradient(ellipse 90% 70% at 50% 40%, rgba(8,20,55,0.96) 0%, rgba(2,6,18,1) 65%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} />

      <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', pt: '3vh' }}>
        <Typography sx={{
          ...fontSx, fontWeight: 900, fontSize: 'clamp(1.6rem, 4vw, 5rem)',
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: phase === PHASE_DONE ? '#f5c518' : '#40d8ff',
          textShadow: phase === PHASE_DONE
            ? '0 0 22px rgba(245,197,24,0.9)'
            : '0 0 18px rgba(40,210,255,0.9)',
          transition: 'color 600ms ease, text-shadow 600ms ease',
        }}>
          {phase === PHASE_CHAOS ? '🎲 Drawing Families…' : phase === PHASE_SETTLE ? '⚡ Assigning…' : '✅ Families Set!'}
        </Typography>
        <Typography sx={{ ...fontSx, color: 'rgba(245,197,24,0.55)', fontSize: 'clamp(0.7rem, 1.1vw, 1.3rem)', letterSpacing: '0.3em', textTransform: 'uppercase', mt: 0.5 }}>
          Survey Says
        </Typography>
      </Box>

      <Box sx={{
        position: 'relative', zIndex: 2, flex: 1, width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        px: '4vw', pt: '2vh', pb: '4vh', gap: '4vw',
      }}>
        {teams.map((team, ti) => (
          <Box
            key={team.id}
            ref={(el: HTMLDivElement | null) => { teamPanelRefs.current[ti] = el; }}
            sx={{
              flex: 1, maxWidth: '42vw', minHeight: '60vh', borderRadius: 4,
              border: `3px solid ${TEAM_COLORS[ti]}`,
              background: `radial-gradient(ellipse at 50% 10%, ${TEAM_COLORS[ti]}28 0%, rgba(5,10,25,0.97) 65%)`,
              boxShadow: settled
                ? `0 0 50px ${TEAM_COLORS[ti]}88, inset 0 0 40px ${TEAM_COLORS[ti]}15`
                : `0 0 26px ${TEAM_COLORS[ti]}44`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              transition: 'all 500ms ease', opacity: phase === PHASE_CHAOS ? 0.4 : 1,
            }}
          >
            <Typography sx={{
              ...fontSx, fontWeight: 900, fontSize: 'clamp(1.5rem, 3vw, 4rem)',
              textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center',
              color: TEAM_COLORS[ti], textShadow: `0 0 16px ${TEAM_COLORS[ti]}, 0 0 36px ${TEAM_COLORS[ti]}88`,
              mb: settled ? 3 : 0, transition: 'margin 400ms ease', px: 2,
            }}>
              {team.name}
            </Typography>
            {settled && (
              <Stack spacing={1.2} alignItems="center" sx={{ width: '100%', px: 2 }}>
                {team.players.map((p, pi) => (
                  <Typography key={p} sx={{
                    ...fontSx, color: '#fff', fontWeight: 700, letterSpacing: '0.05em', textAlign: 'center',
                    fontSize: 'clamp(1.1rem, 2.2vw, 2.8rem)',
                    textShadow: `0 0 10px ${TEAM_COLORS[ti]}88`,
                    opacity: 0,
                    animation: `ssFadePlayer 500ms ease ${pi * 120}ms forwards`,
                    '@keyframes ssFadePlayer': {
                      from: { opacity: 0, transform: 'translateY(16px)' },
                      to: { opacity: 1, transform: 'none' },
                    },
                  }}>
                    {p}
                  </Typography>
                ))}
              </Stack>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default SSTeamRandomizer;
