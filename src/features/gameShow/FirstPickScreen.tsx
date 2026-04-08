import { Box, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { GameShowState } from './types';

interface Props {
  state: GameShowState;
}

const TEAM_COLORS = ['#56d7ff', '#ff9e3d'];
const CYCLE_DURATION = 3200;  // total bounce time
const SETTLE_DURATION = 800;  // flash-slow down time

export const FirstPickScreen = ({ state }: Props) => {
  const teams = state.teams;
  const winnerTeamId = state.firstPickTeamId;
  const winnerTeam = teams.find(t => t.id === winnerTeamId);

  const [activeIndex, setActiveIndex] = useState(0);
  const [settled, setSettled] = useState(false);
  const intervalRef = useRef<number>(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    setSettled(false);
    setActiveIndex(0);

    let step = 0;

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / CYCLE_DURATION, 1);
      // Ease out — interval gets longer as it slows
      const interval = 80 + progress * progress * 500;

      step++;
      setActiveIndex(step % teams.length);

      if (elapsed >= CYCLE_DURATION) {
        // Lock onto winner
        const winnerIdx = teams.findIndex(t => t.id === winnerTeamId);
        setActiveIndex(winnerIdx >= 0 ? winnerIdx : 0);

        // Brief flash, then settle
        let flashes = 0;
        const flash = () => {
          flashes++;
          setActiveIndex(i => (i + 1) % teams.length);
          if (flashes < 6) {
            window.setTimeout(flash, SETTLE_DURATION / 6);
          } else {
            const finalIdx = teams.findIndex(t => t.id === winnerTeamId);
            setActiveIndex(finalIdx >= 0 ? finalIdx : 0);
            window.setTimeout(() => setSettled(true), 400);
          }
        };
        window.setTimeout(flash, 100);
        return;
      }

      intervalRef.current = window.setTimeout(tick, interval);
    };

    intervalRef.current = window.setTimeout(tick, 100);
    return () => window.clearTimeout(intervalRef.current);
  }, [state.firstPickSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      background: 'radial-gradient(ellipse 90% 70% at 50% 40%, rgba(8,25,65,0.97) 0%, rgba(2,6,18,1) 65%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4vh',
    }}>

      {/* Header */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{
          fontWeight: 900,
          fontSize: 'clamp(1.2rem, 3vw, 4.5rem)',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: '#40d8ff',
          textShadow: '0 0 20px rgba(40,210,255,0.9), 0 0 50px rgba(40,180,255,0.4)',
          animation: 'fpPulse 1.8s ease-in-out infinite',
          '@keyframes fpPulse': { '0%': { opacity: 0.8 }, '50%': { opacity: 1 }, '100%': { opacity: 0.8 } },
        }}>
          {settled ? '🎉 First Pick!' : '🎲 Picking First Theme...'}
        </Typography>
      </Box>

      {/* Team boxes */}
      <Stack direction="row" spacing={{ xs: 3, md: 6 }} justifyContent="center" sx={{ width: '100%', px: '5vw' }}>
        {teams.map((team, ti) => {
          const color = TEAM_COLORS[ti % TEAM_COLORS.length];
          const isActive = activeIndex === ti;
          const isWinner = settled && team.id === winnerTeamId;

          return (
            <Box
              key={team.id}
              sx={{
                flex: 1,
                maxWidth: '38vw',
                minHeight: '22vh',
                borderRadius: 5,
                border: `3px solid ${isActive || isWinner ? color : color + '30'}`,
                background: isWinner
                  ? `radial-gradient(ellipse at 50% 0%, ${color}30, rgba(5,10,25,0.97) 70%)`
                  : `rgba(5,10,25,${isActive ? '0.85' : '0.5'})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border 120ms ease, box-shadow 120ms ease, background 200ms ease',
                boxShadow: isWinner
                  ? `0 0 60px ${color}99, 0 0 120px ${color}44, inset 0 0 40px ${color}18`
                  : isActive
                    ? `0 0 35px ${color}88, 0 0 70px ${color}33, inset 0 0 20px ${color}12`
                    : `0 0 6px ${color}11`,
              }}
            >
              <Typography sx={{
                fontWeight: 900,
                fontSize: 'clamp(1.4rem, 3.5vw, 5rem)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: isActive || isWinner ? color : color + '55',
                textShadow: isActive || isWinner ? `0 0 18px ${color}, 0 0 40px ${color}88` : 'none',
                transition: 'color 120ms ease, text-shadow 120ms ease',
                textAlign: 'center',
                px: 2,
              }}>
                {team.name}
              </Typography>
            </Box>
          );
        })}
      </Stack>

      {/* Winner overlay message */}
      <Box sx={{
        minHeight: 'clamp(2rem, 6vh, 6rem)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {settled && winnerTeam && (
          <Typography sx={{
            fontWeight: 900,
            fontSize: 'clamp(1.2rem, 2.8vw, 4rem)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#ffd700',
            textShadow: '0 0 20px rgba(255,215,0,0.9), 0 0 50px rgba(255,215,0,0.4)',
            textAlign: 'center',
            opacity: 0,
            animation: 'fadeInWinner 600ms ease 100ms forwards',
            '@keyframes fadeInWinner': {
              from: { opacity: 0, transform: 'translateY(16px)' },
              to: { opacity: 1, transform: 'none' },
            },
          }}>
            {winnerTeam.name} Gets to Choose the First Theme!
          </Typography>
        )}
      </Box>
    </Box>
  );
};
