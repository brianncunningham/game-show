import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { GameShowState } from './types';

const FLASH_MS = 1200;

const getBuzzerSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.port === '4174'
    ? `${window.location.hostname}:3001`
    : window.location.host;
  return `${protocol}//${host}/ws/buzzer`;
};

interface WandTestScreenProps {
  state: GameShowState;
}

export const WandTestScreen = ({ state }: WandTestScreenProps) => {
  const [activeControllerIds, setActiveControllerIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const socket = new WebSocket(getBuzzerSocketUrl());

    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { type: string; payload: Record<string, unknown> };
        if (msg.type === 'BUZZ_RECEIVED') {
          const controllerId = msg.payload.controllerId as string | undefined;
          if (!controllerId) return;

          const audio = new Audio('/buzz.mp3');
          void audio.play().catch(() => { /* autoplay blocked */ });

          setActiveControllerIds(prev => {
            const next = new Set(prev);
            next.add(controllerId);
            return next;
          });

          const existing = timersRef.current.get(controllerId);
          if (existing) clearTimeout(existing);

          const timer = setTimeout(() => {
            setActiveControllerIds(prev => {
              const next = new Set(prev);
              next.delete(controllerId);
              return next;
            });
            timersRef.current.delete(controllerId);
          }, FLASH_MS);

          timersRef.current.set(controllerId, timer);
        }
      } catch {
        /* ignore malformed */
      }
    };

    return () => {
      socket.close();
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  const assignments = [...state.controllerAssignments].sort(
    (a, b) => Number(a.controllerId) - Number(b.controllerId)
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0a0a1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        gap: 3,
      }}
    >
      <Typography
        variant="h4"
        sx={{ color: '#fff', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 2 }}
      >
        Wand Test
      </Typography>

      {assignments.length === 0 ? (
        <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem' }}>
          No controller assignments configured.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 2,
            width: '100%',
            maxWidth: 900,
          }}
        >
          {assignments.map((a) => {
            const isActive = activeControllerIds.has(a.controllerId);
            const team = state.teams.find(t => t.id === a.teamId);
            return (
              <Box
                key={a.controllerId}
                sx={{
                  borderRadius: 3,
                  border: '2px solid',
                  borderColor: isActive ? '#00ff88' : 'rgba(255,255,255,0.12)',
                  bgcolor: isActive ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)',
                  boxShadow: isActive ? '0 0 24px rgba(0,255,136,0.6)' : 'none',
                  transition: 'all 0.1s ease',
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: isActive ? '#00ff88' : 'rgba(255,255,255,0.25)',
                    bgcolor: isActive ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.06)',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <Typography
                    sx={{
                      color: isActive ? '#00ff88' : 'rgba(255,255,255,0.5)',
                      fontSize: '0.8rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      lineHeight: 1,
                    }}
                  >
                    {a.controllerId}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.75)',
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {a.playerName}
                </Typography>
                {team && (
                  <Typography
                    sx={{
                      color: isActive ? 'rgba(0,255,136,0.8)' : 'rgba(255,255,255,0.3)',
                      fontSize: '0.72rem',
                      textAlign: 'center',
                    }}
                  >
                    {team.name}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', mt: 2 }}>
        Press any wand to verify it's working
      </Typography>
    </Box>
  );
};
