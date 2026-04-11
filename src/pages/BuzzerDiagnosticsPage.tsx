import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { armJudge, resetJudge, simulateBuzz } from '../features/buzzer/buzzerApi';
import type { BuzzerEvent, JudgeState } from '../features/buzzer/useBuzzerState';

const STATE_COLOR: Record<JudgeState, 'default' | 'success' | 'error'> = {
  IDLE: 'default',
  ARMED: 'success',
  LOCKED: 'error',
};

const EVENT_COLOR: Record<string, string> = {
  READY: '#56d7ff',
  STATE: '#aaa',
  BUZZ_RECEIVED: '#ffb14a',
  BUZZ_ACCEPTED: '#4cff91',
  BUZZ_REJECTED: '#ff5c5c',
};

const SIM_CONTROLLERS = ['P1', 'P2', 'P3', 'P4'];

const getBuzzerSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.port === '4174'
    ? `${window.location.hostname}:3001`
    : window.location.host;
  return `${protocol}//${host}/ws/buzzer`;
};

const MAX_LOG = 100;

export const BuzzerDiagnosticsPage = () => {
  const [judgeState, setJudgeState] = useState<JudgeState>('IDLE');
  const [connected, setConnected] = useState(false);
  const [eventLog, setEventLog] = useState<BuzzerEvent[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const socket = new WebSocket(getBuzzerSocketUrl());
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);

    socket.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as BuzzerEvent;
      setEventLog(prev => [...prev, msg].slice(-MAX_LOG));
      if (msg.type === 'STATE') {
        setJudgeState((msg.payload as { state: JudgeState }).state);
      }
      if (msg.type === 'BUZZ_ACCEPTED') {
        setJudgeState('LOCKED');
      }
    };

    return () => socket.close();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventLog]);

  return (
    <Box sx={{ bgcolor: '#0b1020', minHeight: '100vh', color: 'white', p: 3 }}>
      <Stack spacing={3} maxWidth={700}>

        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h5" fontWeight={700}>Buzzer Diagnostics</Typography>
          <Chip
            label={connected ? 'Connected' : 'Disconnected'}
            color={connected ? 'success' : 'error'}
            size="small"
          />
        </Stack>

        <Divider sx={{ borderColor: '#ffffff22' }} />

        {/* Judge State */}
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary">Judge State</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip
              label={judgeState}
              color={STATE_COLOR[judgeState]}
              sx={{ fontSize: '1rem', px: 1, fontWeight: 700 }}
            />
          </Stack>
        </Stack>

        {/* Controls */}
        <Stack spacing={1}>
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
        </Stack>

        <Divider sx={{ borderColor: '#ffffff22' }} />

        {/* Simulation */}
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary">Simulate Buzz</Typography>
          <Typography variant="caption" color="text.disabled">
            Each button sends a buzz through the judge — same code path as hardware.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
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
        </Stack>

        <Divider sx={{ borderColor: '#ffffff22' }} />

        {/* Event Log */}
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="overline" color="text.secondary">
              Event Log ({eventLog.length})
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
              maxHeight: 420,
              overflowY: 'auto',
              fontFamily: 'monospace',
            }}
          >
            {eventLog.length === 0 && (
              <Typography variant="caption" color="text.disabled">No events yet.</Typography>
            )}
            {eventLog.map((ev, i) => (
              <Stack key={i} direction="row" spacing={1.5} alignItems="baseline" sx={{ mb: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{ color: '#555', flexShrink: 0, minWidth: 80 }}
                >
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: EVENT_COLOR[ev.type] ?? '#ccc',
                    fontWeight: 700,
                    flexShrink: 0,
                    minWidth: 140,
                  }}
                >
                  {ev.type}
                </Typography>
                {ev.payload && Object.keys(ev.payload).length > 0 && (
                  <Typography variant="caption" sx={{ color: '#888' }}>
                    {JSON.stringify(ev.payload)}
                  </Typography>
                )}
              </Stack>
            ))}
            <div ref={logEndRef} />
          </Box>
        </Stack>

      </Stack>
    </Box>
  );
};

export default BuzzerDiagnosticsPage;
