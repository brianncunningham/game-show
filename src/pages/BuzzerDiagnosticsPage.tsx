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
  TextField,
  Typography,
} from '@mui/material';
import { openWindow, armWindow, closeWindow, resetJudge, simulateBuzz } from '../features/buzzer/buzzerApi';
import { useGameShowState } from '../features/gameShow/useGameShowState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BuzzerEvent {
  type: string;
  timestamp: string;
  payload: Record<string, string | number | null | undefined>;
}

type WindowState = 'WAITING' | 'ARMED' | 'LOCKED' | 'IDLE';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WINDOW_STATE_COLOR: Record<WindowState, 'default' | 'warning' | 'success' | 'error'> = {
  IDLE:    'default',
  WAITING: 'warning',
  ARMED:   'success',
  LOCKED:  'error',
};

const WINDOW_STATE_DESC: Record<WindowState, string> = {
  IDLE:    'No active window. Open a window to begin.',
  WAITING: 'Window open, not yet armed. Song hasn\'t resumed.',
  ARMED:   'Armed — first eligible buzz wins.',
  LOCKED:  'Winner accepted. Close window or reset to continue.',
};

const EVENT_COLOR: Record<string, string> = {
  READY:        '#56d7ff',
  WINDOW_STATE: '#666',
  WINDOW_CLOSED:'#884400',
  BUZZ_RECEIVED:'#ffb14a',
  BUZZ_EARLY:   '#ffaa00',
  BUZZ_ACCEPTED:'#4cff91',
  BUZZ_REJECTED:'#ff5c5c',
};

const SIM_CONTROLLERS = ['1', '2', '3', '4'];

const MAX_LOG = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getBuzzerSocketUrl = () => {
  const judgeUrl = import.meta.env['VITE_JUDGE_URL'] as string | undefined;
  if (judgeUrl) return judgeUrl.replace(/^http/, 'ws') + '/ws/buzzer';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.port === '4174'
    ? `${window.location.hostname}:3001`
    : window.location.host;
  return `${protocol}//${host}/ws/buzzer`;
};

const cell = { color: 'white', borderColor: '#ffffff18', py: 0.75, px: 1.5, fontSize: '0.8rem' };

const Badge = ({ label, color = '#56d7ff' }: { label: string; color?: string }) => (
  <Box sx={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26, borderRadius: '50%',
    border: `2px solid ${color}cc`, bgcolor: `${color}18`,
  }}>
    <Typography sx={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', color, lineHeight: 1 }}>
      {label}
    </Typography>
  </Box>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BuzzerDiagnosticsPage = () => {
  const { state: gameState } = useGameShowState();

  // Judge window state (from WINDOW_STATE events)
  const [windowState,          setWindowState]          = useState<WindowState>('IDLE');
  const [activeWindowId,       setActiveWindowId]       = useState<string | null>(null);
  const [eligibleControllers,  setEligibleControllers]  = useState<string[]>([]);
  const [earlyBuzzPenalty,     setEarlyBuzzPenalty]     = useState(false);
  const [disabledControllers,  setDisabledControllers]  = useState<string[]>([]); // BUZZ_EARLY within current window

  // Winner tracking
  const [winner,    setWinner]    = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  // Accumulated excluded teams across steal rounds (diagnostics-local, mirrors attemptedTeamIds)
  const [diagExcludedTeamIds, setDiagExcludedTeamIds] = useState<string[]>([]);

  // Connection
  const [connected, setConnected] = useState(false);

  // Event log
  const [eventLog, setEventLog] = useState<BuzzerEvent[]>([]);
  const logEndRef     = useRef<HTMLDivElement | null>(null);
  const logSectionRef = useRef<HTMLDivElement | null>(null);

  // Open-window form state
  const [formWindowId,     setFormWindowId]     = useState('diag-window-1');
  const [formEligible,     setFormEligible]     = useState('');
  const [formEarlyPenalty, setFormEarlyPenalty] = useState(false);

  // ---------------------------------------------------------------------------
  // WebSocket
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const socket = new WebSocket(getBuzzerSocketUrl());
    socket.onopen  = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);

    socket.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as BuzzerEvent;
      setEventLog(prev => [...prev, msg].slice(-MAX_LOG));

      if (msg.type === 'WINDOW_STATE') {
        const ws = msg.payload.windowState as WindowState;
        const wid = msg.payload.windowId as string | null;
        setWindowState(ws);
        setActiveWindowId(wid);
        if (ws === 'IDLE') {
          // Only clear transient winner state. eligibleControllers/earlyBuzzPenalty
          // are owned by the open-window calls (optimistic) and must survive the
          // transient IDLE that the server emits between closing one window and
          // opening the next (steal flow). They are cleared explicitly on Reset.
          setWinner(null);
          setElapsedMs(null);
          setDisabledControllers([]);
        }
      }

      if (msg.type === 'BUZZ_ACCEPTED') {
        setWinner(String(msg.payload.controllerId ?? ''));
        setElapsedMs(Number(msg.payload.elapsedMs ?? 0));
        setWindowState('LOCKED');
      }

      if (msg.type === 'BUZZ_EARLY') {
        const cid = String(msg.payload.controllerId ?? '');
        setDisabledControllers(prev => prev.includes(cid) ? prev : [...prev, cid]);
      }

      if (msg.type === 'WINDOW_CLOSED') {
        setDisabledControllers([]);
        // Do NOT clear eligibleControllers/earlyBuzzPenalty here — a new window
        // may be opening immediately after (steal flow). Those are cleared only
        // when WINDOW_STATE arrives with windowState === 'IDLE'.
      }
    };

    return () => socket.close();
  }, []);

  // Scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventLog]);

  // Scroll page to log on buzz events
  useEffect(() => {
    const last = eventLog[eventLog.length - 1];
    if (last && ['BUZZ_RECEIVED', 'BUZZ_ACCEPTED', 'BUZZ_REJECTED', 'BUZZ_EARLY'].includes(last.type)) {
      logSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [eventLog]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const assignments = gameState?.controllerAssignments ?? [];
  const teams       = gameState?.teams ?? [];

  const resolveController = (cid: string) => {
    const a = assignments.find(x => x.controllerId === cid);
    if (!a) return { player: cid, team: null, teamId: null };
    const t = teams.find(t => t.id === a.teamId);
    return { player: a.playerName, team: t?.name ?? a.teamId, teamId: a.teamId };
  };

  // Song-level failed teams (from roundState.attemptedTeamIds, only meaningful post-buzz)
  const failedTeamIds: string[] = (() => {
    const rs = gameState?.roundState;
    if (!rs || rs.answerState !== 'wrong') return [];
    return rs.attemptedTeamIds;
  })();

  const winnerResolved = winner ? resolveController(winner) : null;

  // ---------------------------------------------------------------------------
  // Open-window handler
  // ---------------------------------------------------------------------------

  const handleOpenWindow = () => {
    const eligible = formEligible.trim()
      ? formEligible.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    void openWindow({ windowId: formWindowId, eligibleControllers: eligible, earlyBuzzPenalty: formEarlyPenalty });
    // Update local eligible/penalty display optimistically (WINDOW_STATE will confirm)
    setEligibleControllers(eligible);
    setEarlyBuzzPenalty(formEarlyPenalty);
    setDisabledControllers([]);
    // Auto-increment window ID for convenience
    setFormWindowId(id => {
      const m = id.match(/^(.*?)(\d+)$/);
      return m ? `${m[1]}${Number(m[2]) + 1}` : id + '-2';
    });
  };

  /**
   * Mirror of HostPage.openStealWindow:
   * - Exclude all controllers whose team has already attempted (winner's team + any prior failed teams)
   * - earlyBuzzPenalty: true
   * - Close previous window first
   */
  const handleMarkWrongOpenSteal = () => {
    if (!winner) return;
    const winnerTeamId = resolveController(winner).teamId;
    // Accumulate: prior excluded + game-state failed + this winner's team
    const nextExcluded = Array.from(new Set([
      ...diagExcludedTeamIds,
      ...failedTeamIds,
      ...(winnerTeamId ? [winnerTeamId] : []),
    ]));
    setDiagExcludedTeamIds(nextExcluded);
    const eligible = nextExcluded.length === 0
      ? []
      : assignments.filter(a => !nextExcluded.includes(a.teamId)).map(a => a.controllerId);
    const stealN = nextExcluded.length;
    const wid = `diag-steal-${stealN}-${Date.now()}`;
    if (activeWindowId) void closeWindow(activeWindowId).catch(() => {});
    void openWindow({ windowId: wid, eligibleControllers: eligible, earlyBuzzPenalty: true });
    setEligibleControllers(eligible);
    setEarlyBuzzPenalty(true);
    setDisabledControllers([]);
    setWinner(null);
    setElapsedMs(null);
  };

  // ---------------------------------------------------------------------------
  // Controller status for table
  // ---------------------------------------------------------------------------

  type CtrlStatus = 'eligible' | 'ineligible' | 'disabled' | 'team-failed';

  const controllerStatus = (cid: string, teamId: string | null): CtrlStatus => {
    if (disabledControllers.includes(cid))                                        return 'disabled';
    if (teamId && (failedTeamIds.includes(teamId) || diagExcludedTeamIds.includes(teamId))) return 'team-failed';
    if (eligibleControllers.length > 0 && !eligibleControllers.includes(cid))    return 'ineligible';
    return 'eligible';
  };

  const statusColor: Record<CtrlStatus, string> = {
    eligible:    '#56d7ff',
    ineligible:  '#555',
    disabled:    '#ff5c5c',
    'team-failed': '#884400',
  };

  const statusLabel: Record<CtrlStatus, string> = {
    eligible:    '',
    ineligible:  'ineligible',
    disabled:    'early-buzz locked',
    'team-failed': 'team failed',
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ bgcolor: '#0b1020', minHeight: '100vh', color: 'white', p: 3 }}>
      <Stack spacing={3} maxWidth={1200}>

        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h5" fontWeight={700}>Buzzer Diagnostics</Typography>
          <Chip
            label={connected ? 'WS Connected' : 'WS Disconnected'}
            color={connected ? 'success' : 'error'}
            size="small"
          />
          <Chip label="Protocol v2" size="small" variant="outlined" sx={{ color: '#666', borderColor: '#333' }} />
        </Stack>

        <Divider sx={{ borderColor: '#ffffff22' }} />

        {/* ================================================================ */}
        {/* Top row: Window State + Song Context                            */}
        {/* ================================================================ */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>

          {/* ---- Judge: Window State ---- */}
          <Box flex={1} sx={{ border: '1px solid #ffffff18', borderRadius: 1, p: 2 }}>
            <Typography variant="overline" color="text.secondary">Judge — Active Window</Typography>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, mb: 0.5 }}>
              <Chip
                label={windowState}
                color={WINDOW_STATE_COLOR[windowState]}
                sx={{ fontWeight: 900, fontSize: '0.9rem', px: 0.5 }}
              />
              {activeWindowId && (
                <Typography variant="caption" sx={{ color: '#aaa', fontFamily: 'monospace' }}>
                  {activeWindowId}
                </Typography>
              )}
            </Stack>

            <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 1.5 }}>
              {WINDOW_STATE_DESC[windowState]}
            </Typography>

            {/* State machine flow */}
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5 }}>
              {(['WAITING', '→', 'ARMED', '→', 'LOCKED'] as const).map((s, i) =>
                s === '→'
                  ? <Typography key={i} variant="caption" sx={{ color: '#333' }}>→</Typography>
                  : <Typography key={i} variant="caption" sx={{
                      fontFamily: 'monospace', fontWeight: windowState === s ? 900 : 400,
                      color: windowState === s ? (EVENT_COLOR[s === 'ARMED' ? 'BUZZ_ACCEPTED' : s === 'LOCKED' ? 'BUZZ_REJECTED' : 'BUZZ_RECEIVED'] ?? '#aaa') : '#333',
                    }}>{s}</Typography>
              )}
              <Typography variant="caption" sx={{ color: '#333' }}>→ IDLE</Typography>
            </Stack>

            {/* Eligible controllers */}
            <Stack spacing={0.5}>
              <Typography variant="caption" sx={{ color: '#666' }}>
                Eligible controllers:{' '}
                {eligibleControllers.length === 0
                  ? <span style={{ color: '#4cff91' }}>all</span>
                  : eligibleControllers.map(c => (
                      <Chip key={c} label={c} size="small"
                        sx={{ mr: 0.5, height: 18, fontSize: '0.7rem', bgcolor: '#56d7ff22', color: '#56d7ff' }} />
                    ))
                }
              </Typography>

              <Typography variant="caption" sx={{ color: '#666' }}>
                Early-buzz penalty:{' '}
                <span style={{ color: earlyBuzzPenalty ? '#ffaa00' : '#444' }}>
                  {earlyBuzzPenalty ? 'ON' : 'off'}
                </span>
              </Typography>

              {disabledControllers.length > 0 && (
                <Typography variant="caption" sx={{ color: '#666' }}>
                  Locked (early buzz):{' '}
                  {disabledControllers.map(c => (
                    <Chip key={c} label={c} size="small"
                      sx={{ mr: 0.5, height: 18, fontSize: '0.7rem', bgcolor: '#ff5c5c22', color: '#ff5c5c' }} />
                  ))}
                </Typography>
              )}
            </Stack>
          </Box>

          {/* ---- App: Song Context ---- */}
          <Box flex={1} sx={{ border: '1px solid #ffffff18', borderRadius: 1, p: 2 }}>
            <Typography variant="overline" color="text.secondary">App — Song Context</Typography>

            {!gameState || !gameState.roundState.selectedQuestionId ? (
              <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 1 }}>
                No active song round. Select a question and song on the host page.
              </Typography>
            ) : (() => {
              const rs = gameState.roundState;
              const q  = gameState.questions.find(q => q.id === rs.selectedQuestionId);
              const song = q && rs.activeSongIndex != null ? q.songs[rs.activeSongIndex] : null;
              const failedTeams = teams.filter(t => failedTeamIds.includes(t.id));
              const buzzWinner  = rs.buzzWinnerTeamId
                ? teams.find(t => t.id === rs.buzzWinnerTeamId)
                : null;

              return (
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  <Typography variant="caption" sx={{ color: '#aaa' }}>
                    <span style={{ color: '#666' }}>Theme: </span>{q?.category ?? '—'}
                    {song && <span style={{ color: '#666' }}> · Song: </span>}
                    {song && <span>{song.title || `Song ${(rs.activeSongIndex ?? 0) + 1}`}</span>}
                  </Typography>

                  <Typography variant="caption" sx={{ color: '#aaa' }}>
                    <span style={{ color: '#666' }}>Clip state: </span>
                    <span style={{ color: rs.clipState === 'active' ? '#56d7ff' : rs.clipState === 'resolved' ? '#4cff91' : '#555' }}>
                      {rs.clipState}
                    </span>
                    {'  '}
                    <span style={{ color: '#666' }}>Answer: </span>
                    <span style={{ color: rs.answerState === 'correct' ? '#4cff91' : rs.answerState === 'wrong' ? '#ff5c5c' : '#555' }}>
                      {rs.answerState}
                    </span>
                  </Typography>

                  {buzzWinner && (
                    <Typography variant="caption" sx={{ color: '#4cff91' }}>
                      Buzz winner: {buzzWinner.name}
                    </Typography>
                  )}

                  <Typography variant="caption" sx={{ color: '#666' }}>
                    Steal state:{' '}
                    <span style={{ color: rs.stealState === 'available' ? '#ffb14a' : '#555' }}>
                      {rs.stealState}
                    </span>
                  </Typography>

                  {failedTeams.length > 0 ? (
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Failed teams:{' '}
                      {failedTeams.map(t => (
                        <Chip key={t.id} label={t.name} size="small"
                          sx={{ mr: 0.5, height: 18, fontSize: '0.7rem', bgcolor: '#ff5c5c22', color: '#ff5c5c' }} />
                      ))}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.disabled">No teams failed yet.</Typography>
                  )}

                  <Typography variant="caption" sx={{ color: '#666' }}>
                    Buzzer mode:{' '}
                    <span style={{ color: gameState.buzzerMode === 'manual' ? '#555' : '#56d7ff' }}>
                      {gameState.buzzerMode}
                    </span>
                  </Typography>
                </Stack>
              );
            })()}
          </Box>
        </Stack>

        {/* ================================================================ */}
        {/* Winner banner                                                    */}
        {/* ================================================================ */}
        {winner && (
          <Box sx={{ border: '1px solid #4cff9155', bgcolor: '#0d2218', borderRadius: 1, p: 2 }}>
            <Typography variant="overline" sx={{ color: '#4cff91' }}>Winner</Typography>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Typography variant="h6" fontWeight={900} sx={{ color: '#4cff91' }}>
                {winnerResolved?.player ?? winner}
              </Typography>
              {winnerResolved?.team && (
                <Typography variant="body2" color="text.secondary">{winnerResolved.team}</Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                controller #{winner}&nbsp;·&nbsp;{elapsedMs !== null ? `${elapsedMs}ms after ARM` : ''}
              </Typography>
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={handleMarkWrongOpenSteal}
                sx={{ ml: 'auto !important' }}
              >
                ✗ Wrong → Open Steal
              </Button>
            </Stack>
            {winnerResolved?.teamId && (
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                Steal will exclude: {winnerResolved.team} (+ any prior failed teams).
                Eligible = all other controllers. earlyBuzzPenalty ON.
              </Typography>
            )}
          </Box>
        )}

        <Divider sx={{ borderColor: '#ffffff22' }} />

        {/* ================================================================ */}
        {/* Controls                                                         */}
        {/* ================================================================ */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>

          {/* ---- Open Window form ---- */}
          <Box flex={1} sx={{ border: '1px solid #ffffff18', borderRadius: 1, p: 2 }}>
            <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Open Window
            </Typography>
            <Stack spacing={1}>
              <TextField
                label="windowId"
                size="small"
                value={formWindowId}
                onChange={e => setFormWindowId(e.target.value)}
                InputProps={{ sx: { color: 'white', fontFamily: 'monospace', fontSize: '0.8rem' } }}
                InputLabelProps={{ sx: { color: '#888' } }}
                sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ffffff22' } }}
              />
              <TextField
                label="eligibleControllers (comma-separated, blank = all)"
                size="small"
                value={formEligible}
                onChange={e => setFormEligible(e.target.value)}
                placeholder="1,2,3  or leave blank for all"
                InputProps={{ sx: { color: 'white', fontFamily: 'monospace', fontSize: '0.8rem' } }}
                InputLabelProps={{ sx: { color: '#888' } }}
                sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ffffff22' } }}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  variant={formEarlyPenalty ? 'contained' : 'outlined'}
                  color="warning"
                  onClick={() => setFormEarlyPenalty(p => !p)}
                  sx={{ minWidth: 0 }}
                >
                  earlyBuzzPenalty: {formEarlyPenalty ? 'ON' : 'off'}
                </Button>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" color="primary" onClick={handleOpenWindow}>
                  Open Window
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  disabled={!activeWindowId || windowState !== 'WAITING'}
                  onClick={() => activeWindowId && void armWindow(activeWindowId)}
                >
                  Arm
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  disabled={!activeWindowId || windowState === 'IDLE'}
                  onClick={() => activeWindowId && void closeWindow(activeWindowId)}
                >
                  Close
                </Button>
                <Button variant="outlined" color="error" onClick={() => {
                  void resetJudge();
                  setEligibleControllers([]);
                  setEarlyBuzzPenalty(false);
                  setDisabledControllers([]);
                  setWinner(null);
                  setElapsedMs(null);
                  setDiagExcludedTeamIds([]);
                }}>
                  Reset
                </Button>
              </Stack>
              <Typography variant="caption" color="text.disabled">
                Open → Arm (when song resumes) → judge accepts buzzes → Close/Reset
              </Typography>
            </Stack>
          </Box>

          {/* ---- Quick open+arm convenience ---- */}
          <Box flex={1} sx={{ border: '1px solid #ffffff18', borderRadius: 1, p: 2 }}>
            <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Quick Open+Arm
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="outlined"
                  size="small"
                  color="success"
                  onClick={() => {
                    const wid = `diag-initial-${Date.now()}`;
                    void openWindow({ windowId: wid, eligibleControllers: [], earlyBuzzPenalty: false })
                      .then(() => armWindow(wid));
                    setEligibleControllers([]);
                    setEarlyBuzzPenalty(false);
                    setDiagExcludedTeamIds([]);
                    setWinner(null);
                    setElapsedMs(null);
                    setDisabledControllers([]);
                  }}
                >
                  Open+Arm (all eligible)
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="warning"
                  onClick={() => {
                    const wid = `diag-steal-${Date.now()}`;
                    void openWindow({ windowId: wid, eligibleControllers: [], earlyBuzzPenalty: true });
                    setEligibleControllers([]);
                    setEarlyBuzzPenalty(true);
                    setDisabledControllers([]);
                  }}
                >
                  Open Steal Window (unarmed, penalty ON)
                </Button>
              </Stack>
              <Typography variant="caption" color="text.disabled">
                Use "Open Steal Window" then "Arm" (via main panel) to simulate steal countdown flow.
              </Typography>
            </Stack>
          </Box>
        </Stack>

        <Divider sx={{ borderColor: '#ffffff22' }} />

        {/* ================================================================ */}
        {/* Controller assignments + Simulate                               */}
        {/* ================================================================ */}
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary">
            Controller Assignments &amp; Simulate
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Buzz buttons send through judge logic — same path as hardware/phone.
            Row colour reflects current window eligibility.
          </Typography>

          {assignments.length === 0 ? (
            <>
              <Typography variant="caption" color="text.disabled">
                No assignments — run player shuffle on /gameadmin, or use generic sim buttons below.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {SIM_CONTROLLERS.map(id => (
                  <Button key={id} variant="outlined" color="warning"
                    onClick={() => void simulateBuzz(id)} sx={{ minWidth: 80 }}>
                    Buzz {id}
                  </Button>
                ))}
              </Stack>
            </>
          ) : (() => {
            const mid = Math.ceil(assignments.length / 2);
            const cols = [assignments.slice(0, mid), assignments.slice(mid)];

            const AssignmentTable = ({ rows }: { rows: typeof assignments }) => (
              <Table size="small" sx={{ '& td, & th': cell }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...cell, color: '#aaa' }}>#</TableCell>
                    <TableCell sx={{ ...cell, color: '#aaa' }}>Player</TableCell>
                    <TableCell sx={{ ...cell, color: '#aaa' }}>Team</TableCell>
                    <TableCell sx={{ ...cell, color: '#aaa' }}>Status</TableCell>
                    <TableCell sx={{ ...cell, color: '#aaa' }}>Sim</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(a => {
                    const team   = teams.find(t => t.id === a.teamId);
                    const status = controllerStatus(a.controllerId, a.teamId);
                    const color  = statusColor[status];
                    const isOut  = status !== 'eligible';
                    return (
                      <TableRow key={a.controllerId} sx={{ opacity: isOut ? 0.5 : 1 }}>
                        <TableCell>
                          <Badge label={a.controllerId} color={color} />
                        </TableCell>
                        <TableCell sx={{ color: isOut ? '#555' : 'white' }}>{a.playerName}</TableCell>
                        <TableCell sx={{ color: '#888' }}>{team?.name ?? a.teamId}</TableCell>
                        <TableCell>
                          {isOut && (
                            <Typography variant="caption" sx={{ color, fontStyle: 'italic' }}>
                              {statusLabel[status]}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small" variant="outlined" color="warning"
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

        {/* ================================================================ */}
        {/* Event Log                                                        */}
        {/* ================================================================ */}
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
              maxHeight: 520,
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
              const isEarly    = ev.type === 'BUZZ_EARLY';
              const p = ev.payload;

              return (
                <Stack
                  key={i}
                  direction="row"
                  spacing={1.5}
                  alignItems="baseline"
                  sx={{
                    mb: 0.5, px: 0.5, py: 0.25, borderRadius: 0.5,
                    bgcolor: isAccepted ? '#0d2218' : isRejected ? '#1c0a0a' : isEarly ? '#1a0f00' : 'transparent',
                  }}
                >
                  {/* Timestamp */}
                  <Typography variant="caption" sx={{ color: '#444', flexShrink: 0, minWidth: 76 }}>
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </Typography>

                  {/* Event type */}
                  <Typography variant="caption" sx={{
                    color: EVENT_COLOR[ev.type] ?? '#ccc',
                    fontWeight: 700, flexShrink: 0, minWidth: 140,
                  }}>
                    {ev.type}
                  </Typography>

                  {/* windowId — shown for most events */}
                  {p?.windowId !== undefined && p.windowId !== null && (
                    <Typography variant="caption" sx={{ color: '#444', flexShrink: 0, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      [{String(p.windowId)}]
                    </Typography>
                  )}

                  {/* controllerId */}
                  {p?.controllerId !== undefined && (
                    <Typography variant="caption" sx={{ color: '#aaa', flexShrink: 0 }}>
                      c{String(p.controllerId)}
                    </Typography>
                  )}

                  {/* Rejection reason */}
                  {isRejected && p?.reason && (
                    <Typography variant="caption" sx={{ color: '#ff5c5c', fontWeight: 700 }}>
                      {String(p.reason)}
                    </Typography>
                  )}

                  {/* elapsedMs */}
                  {isAccepted && p?.elapsedMs !== undefined && (
                    <Typography variant="caption" sx={{ color: '#4cff9199' }}>
                      {String(p.elapsedMs)}ms
                    </Typography>
                  )}

                  {/* WINDOW_STATE inline summary */}
                  {ev.type === 'WINDOW_STATE' && p?.windowState && (
                    <Typography variant="caption" sx={{ color: '#555' }}>
                      → {String(p.windowState)}
                    </Typography>
                  )}

                  {/* BUZZ_EARLY note */}
                  {isEarly && (
                    <Typography variant="caption" sx={{ color: '#ffaa0099', fontStyle: 'italic' }}>
                      early-buzz penalty
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
