import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { armJudge, resetJudge, simulateBuzz } from '../features/buzzer/buzzerApi';
import { useGameShowState } from '../features/gameShow/useGameShowState';
import type { BuzzerEvent, JudgeState } from '../features/buzzer/useBuzzerState';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATE_COLOR: Record<JudgeState, 'default' | 'success' | 'error'> = {
  IDLE: 'default',
  ARMED: 'success',
  LOCKED: 'error',
};

const STATE_DESC: Record<JudgeState, string> = {
  IDLE:   'Waiting. Press ARM to accept buzzes.',
  ARMED:  'Accepting buzzes. First press wins.',
  LOCKED: 'Winner locked. Press RESET to clear.',
};

const EVENT_COLOR: Record<string, string> = {
  READY:         '#56d7ff',
  STATE:         '#555',
  BUZZ_RECEIVED: '#ffb14a',
  BUZZ_ACCEPTED: '#4cff91',
  BUZZ_REJECTED: '#ff5c5c',
};

const SIM_CONTROLLERS = ['P1', 'P2', 'P3', 'P4'];

const MAX_LOG = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getBuzzerSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.port === '4174'
    ? `${window.location.hostname}:3001`
    : window.location.host;
  return `${protocol}//${host}/ws/buzzer`;
};

const cell = { color: 'white', borderColor: '#ffffff18', py: 0.75, px: 1.5, fontSize: '0.8rem' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BuzzerDiagnosticsPage = () => {
  const { state: gameState } = useGameShowState();

  const [judgeState, setJudgeState]   = useState<JudgeState>('IDLE');
  const [connected,  setConnected]    = useState(false);
  const [winner,     setWinner]       = useState<string | null>(null);
  const [elapsedMs,  setElapsedMs]    = useState<number | null>(null);
  const [eventLog,   setEventLog]     = useState<BuzzerEvent[]>([]);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Controller → team lookup from live game state
  const teamByControllerId = (id: string) =>
    gameState?.teams.find(t => t.id === id);

  useEffect(() => {
    const socket = new WebSocket(getBuzzerSocketUrl());

    socket.onopen  = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);

    socket.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as BuzzerEvent;
      setEventLog(prev => [...prev, msg].slice(-MAX_LOG));

      if (msg.type === 'STATE') {
        const s = (msg.payload as { state: JudgeState }).state;
        setJudgeState(s);
        if (s === 'IDLE') { setWinner(null); setElapsedMs(null); }
      }
      if (msg.type === 'BUZZ_ACCEPTED') {
        const p = msg.payload as { controllerId: string; elapsedMs: number };
        setJudgeState('LOCKED');
        setWinner(p.controllerId);
        setElapsedMs(p.elapsedMs);
      }
    };

    return () => socket.close();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventLog]);

  const winnerTeam = winner ? teamByControllerId(winner) : null;

  return (
    <Box sx={{ bgcolor: '#0b1020', minHeight: '100vh', color: 'white', p: 3 }}>
      <Stack spacing={3} maxWidth={760}>

        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h5" fontWeight={700}>Buzzer Diagnostics</Typography>
          <Chip
            label={connected ? 'WS Connected' : 'WS Disconnected'}
            color={connected ? 'success' : 'error'}
            size="small"
          />
        </Stack>

        <Divider sx={{ borderColor: '#ffffff22' }} />

        {/* ---------------------------------------------------------------- */}
        {/* State machine + Controls (side by side)                         */}
        {/* ---------------------------------------------------------------- */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>

          {/* State */}
          <Stack spacing={1} flex={1}>
            <Typography variant="overline" color="text.secondary">Judge State</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                label={judgeState}
                color={STATE_COLOR[judgeState]}
                sx={{ fontSize: '1rem', px: 1, fontWeight: 900 }}
              />
            </Stack>
            <Typography variant="caption" color="text.disabled">{STATE_DESC[judgeState]}</Typography>

            {/* State machine flow */}
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
              {(['IDLE', '→', 'ARMED', '→', 'LOCKED'] as const).map((s, i) =>
                typeof s === 'string' && s === '→'
                  ? <Typography key={i} variant="caption" sx={{ color: '#444' }}>→</Typography>
                  : <Typography
                      key={i}
                      variant="caption"
                      sx={{
                        color: judgeState === s ? EVENT_COLOR[
                          s === 'ARMED' ? 'READY' : s === 'LOCKED' ? 'BUZZ_ACCEPTED' : 'STATE'
                        ] : '#333',
                        fontWeight: judgeState === s ? 900 : 400,
                        fontFamily: 'monospace',
                      }}
                    >{s}</Typography>
              )}
              <Typography variant="caption" sx={{ color: '#444' }}>→ IDLE (RESET)</Typography>
            </Stack>
          </Stack>

          {/* Controls */}
          <Stack spacing={1} flex={1}>
            <Typography variant="overline" color="text.secondary">Controls</Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="success"
                disabled={judgeState === 'ARMED'}
                onClick={() => void armJudge()}
              >
                ARM
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => void resetJudge()}
              >
                RESET
              </Button>
            </Stack>
            <Typography variant="caption" color="text.disabled">
              ARM: IDLE → ARMED &nbsp;|&nbsp; RESET: any → IDLE
            </Typography>
          </Stack>
        </Stack>

        {/* ---------------------------------------------------------------- */}
        {/* Winner banner                                                    */}
        {/* ---------------------------------------------------------------- */}
        {winner && (
          <Box sx={{
            border: '1px solid #4cff9155',
            bgcolor: '#0d2218',
            borderRadius: 1,
            p: 2,
          }}>
            <Typography variant="overline" sx={{ color: '#4cff91' }}>Winner</Typography>
            <Stack direction="row" spacing={2} alignItems="baseline" flexWrap="wrap">
              <Typography variant="h6" fontWeight={900} sx={{ color: '#4cff91' }}>
                {winnerTeam ? winnerTeam.name : winner}
              </Typography>
              {winnerTeam && (
                <Typography variant="body2" color="text.secondary">
                  controllerId: <code>{winner}</code>
                </Typography>
              )}
              {elapsedMs !== null && (
                <Typography variant="body2" color="text.secondary">
                  {elapsedMs}ms after ARM
                </Typography>
              )}
            </Stack>
            {winnerTeam && (
              <Typography variant="caption" color="text.disabled">
                Players: {winnerTeam.players.join(', ') || 'none assigned'}
              </Typography>
            )}
          </Box>
        )}

        <Divider sx={{ borderColor: '#ffffff22' }} />

        {/* ---------------------------------------------------------------- */}
        {/* Controller → Team mapping                                        */}
        {/* ---------------------------------------------------------------- */}
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary">
            Controller → Team Mapping
          </Typography>
          {!gameState ? (
            <Typography variant="caption" color="text.disabled">
              Game state not loaded — mapping unavailable.
            </Typography>
          ) : (
            <>
              <Typography variant="caption" color="text.disabled">
                Mapping is based on team IDs from game state. Simulate using a team ID to test mapping.
              </Typography>
              <Table size="small" sx={{ '& td, & th': cell }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...cell, color: '#aaa' }}>controllerId</TableCell>
                    <TableCell sx={{ ...cell, color: '#aaa' }}>Team Name</TableCell>
                    <TableCell sx={{ ...cell, color: '#aaa' }}>Players</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gameState.teams.slice(0, gameState.teamCount).map(t => (
                    <TableRow key={t.id}>
                      <TableCell><code>{t.id}</code></TableCell>
                      <TableCell>{t.name}</TableCell>
                      <TableCell sx={{ color: '#888' }}>
                        {t.players.length ? t.players.join(', ') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </Stack>

        <Divider sx={{ borderColor: '#ffffff22' }} />

        {/* ---------------------------------------------------------------- */}
        {/* Simulation                                                       */}
        {/* ---------------------------------------------------------------- */}
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary">Simulate Buzz</Typography>
          <Typography variant="caption" color="text.disabled">
            Sends through judge logic — same path as hardware. ARM first, then buzz.
          </Typography>

          {/* Named sim controllers */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {SIM_CONTROLLERS.map(id => (
              <Button
                key={id}
                variant="outlined"
                color="warning"
                onClick={() => void simulateBuzz(id)}
                sx={{ minWidth: 80 }}
              >
                Buzz {id}
              </Button>
            ))}
          </Stack>

          {/* Team ID sim buttons if game state loaded */}
          {gameState && (
            <>
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                Or buzz by team ID (matches mapping table above):
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {gameState.teams.slice(0, gameState.teamCount).map(t => (
                  <Button
                    key={t.id}
                    variant="outlined"
                    size="small"
                    sx={{ borderColor: '#56d7ff55', color: '#56d7ff', minWidth: 100 }}
                    onClick={() => void simulateBuzz(t.id)}
                  >
                    {t.name} ({t.id})
                  </Button>
                ))}
              </Stack>
            </>
          )}
        </Stack>

        <Divider sx={{ borderColor: '#ffffff22' }} />

        {/* ---------------------------------------------------------------- */}
        {/* Event Log                                                        */}
        {/* ---------------------------------------------------------------- */}
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="overline" color="text.secondary">
              Event Log ({eventLog.length}/{MAX_LOG})
            </Typography>
            <Button size="small" variant="text" color="inherit" onClick={() => setEventLog([])}>
              Clear
            </Button>
          </Stack>

          <Box
            sx={{
              bgcolor: '#060b18',
              border: '1px solid #ffffff18',
              borderRadius: 1,
              p: 1.5,
              maxHeight: 480,
              overflowY: 'auto',
              fontFamily: 'monospace',
            }}
          >
            {eventLog.length === 0 && (
              <Typography variant="caption" color="text.disabled">No events yet.</Typography>
            )}
            {eventLog.map((ev, i) => {
              const isAccepted = ev.type === 'BUZZ_ACCEPTED';
              const isRejected = ev.type === 'BUZZ_REJECTED';
              const payload = ev.payload as Record<string, unknown>;

              return (
                <Stack
                  key={i}
                  direction="row"
                  spacing={1.5}
                  alignItems="baseline"
                  sx={{
                    mb: 0.5,
                    px: 0.5,
                    borderRadius: 0.5,
                    bgcolor: isAccepted ? '#0d2218' : isRejected ? '#1c0a0a' : 'transparent',
                  }}
                >
                  {/* Timestamp */}
                  <Typography variant="caption" sx={{ color: '#444', flexShrink: 0, minWidth: 76 }}>
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </Typography>

                  {/* Event type */}
                  <Typography
                    variant="caption"
                    sx={{
                      color: EVENT_COLOR[ev.type] ?? '#ccc',
                      fontWeight: 700,
                      flexShrink: 0,
                      minWidth: 150,
                    }}
                  >
                    {ev.type}
                  </Typography>

                  {/* controllerId */}
                  {payload?.controllerId && (
                    <Typography variant="caption" sx={{ color: '#aaa', flexShrink: 0 }}>
                      {String(payload.controllerId)}
                    </Typography>
                  )}

                  {/* Rejection reason — prominent */}
                  {isRejected && payload?.reason && (
                    <Typography variant="caption" sx={{ color: '#ff5c5c', fontWeight: 700 }}>
                      [{String(payload.reason)}]
                    </Typography>
                  )}

                  {/* elapsedMs for accepted */}
                  {isAccepted && payload?.elapsedMs !== undefined && (
                    <Typography variant="caption" sx={{ color: '#4cff9199' }}>
                      {String(payload.elapsedMs)}ms
                    </Typography>
                  )}

                  {/* STATE payload */}
                  {ev.type === 'STATE' && payload?.state && (
                    <Typography variant="caption" sx={{ color: '#555' }}>
                      → {String(payload.state)}
                    </Typography>
                  )}
                </Stack>
              );
            })}
            <div ref={logEndRef} />
          </Box>
        </Stack>

      </Stack>
    </Box>
  );
};

export default BuzzerDiagnosticsPage;
