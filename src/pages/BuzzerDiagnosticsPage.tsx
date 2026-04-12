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
  const logSectionRef = useRef<HTMLDivElement | null>(null);

  // Resolve winner display name from controllerAssignments
  const resolveWinner = (controllerId: string) => {
    const a = gameState?.controllerAssignments?.find(x => x.controllerId === controllerId);
    if (!a) return { label: controllerId, sub: null };
    const team = gameState?.teams.find(t => t.id === a.teamId);
    return { label: a.playerName, sub: team?.name ?? null };
  };

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

  // Scroll the inner log box to bottom on every new event
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventLog]);

  // Scroll the page to the event log section when a buzz arrives
  useEffect(() => {
    const last = eventLog[eventLog.length - 1];
    if (last && (last.type === 'BUZZ_RECEIVED' || last.type === 'BUZZ_ACCEPTED' || last.type === 'BUZZ_REJECTED')) {
      logSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [eventLog]);

  const winnerResolved = winner ? resolveWinner(winner) : null;

  return (
    <Box sx={{ bgcolor: '#0b1020', minHeight: '100vh', color: 'white', p: 3 }}>
      <Stack spacing={3} maxWidth={1100}>

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
                {winnerResolved?.label ?? winner}
              </Typography>
              {winnerResolved?.sub && (
                <Typography variant="body2" color="text.secondary">
                  {winnerResolved.sub}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                controller #{winner} &nbsp;·&nbsp; {elapsedMs !== null ? `${elapsedMs}ms after ARM` : ''}
              </Typography>
            </Stack>
          </Box>
        )}

        <Divider sx={{ borderColor: '#ffffff22' }} />

        {/* ---------------------------------------------------------------- */}
        {/* Controller assignments + Simulate                               */}
        {/* ---------------------------------------------------------------- */}
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary">
            Controller Assignments
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Sends through judge logic — same path as hardware. ARM first, then buzz.
          </Typography>

          {!gameState || gameState.controllerAssignments.length === 0 ? (
            <>
              <Typography variant="caption" color="text.disabled">
                No assignments — run player shuffle on /gameadmin, or use generic sim buttons below.
              </Typography>
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
            </>
          ) : (() => {
            const all = gameState.controllerAssignments;
            const mid = Math.ceil(all.length / 2);
            const cols = [all.slice(0, mid), all.slice(mid)];
            const AssignmentTable = ({ rows }: { rows: typeof all }) => (
              <Table size="small" sx={{ '& td, & th': cell }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...cell, color: '#aaa' }}>#</TableCell>
                    <TableCell sx={{ ...cell, color: '#aaa' }}>Player</TableCell>
                    <TableCell sx={{ ...cell, color: '#aaa' }}>Team</TableCell>
                    <TableCell sx={{ ...cell, color: '#aaa' }}>Sim</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(a => {
                    const team = gameState.teams.find(t => t.id === a.teamId);
                    return (
                      <TableRow key={a.controllerId}>
                        <TableCell>
                          <Box sx={{
                            width: 26, height: 26, borderRadius: '50%',
                            border: '2px solid #56d7ffcc',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: '#56d7ff18',
                          }}>
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', color: '#56d7ff', lineHeight: 1 }}>
                              {a.controllerId}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{a.playerName}</TableCell>
                        <TableCell sx={{ color: '#888' }}>{team?.name ?? a.teamId}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => void simulateBuzz(a.controllerId)}
                            sx={{ minWidth: 48, py: 0.25, fontSize: '0.7rem' }}
                          >
                            Buzz
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            );
            return (
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box flex={1}><AssignmentTable rows={cols[0]} /></Box>
                {cols[1].length > 0 && <Box flex={1}><AssignmentTable rows={cols[1]} /></Box>}
              </Stack>
            );
          })()}
        </Stack>

        <Divider sx={{ borderColor: '#ffffff22' }} />

        {/* ---------------------------------------------------------------- */}
        {/* Event Log                                                        */}
        {/* ---------------------------------------------------------------- */}
        <Stack spacing={1} ref={logSectionRef}>
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
              const payload = ev.payload as Record<string, string | number | undefined>;

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
