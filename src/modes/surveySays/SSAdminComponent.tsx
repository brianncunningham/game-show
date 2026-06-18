import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Divider,
  IconButton, MenuItem, Select, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';
import PeopleIcon from '@mui/icons-material/People';
import CasinoIcon from '@mui/icons-material/Casino';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import SaveIcon from '@mui/icons-material/Save';
import type { SurveySaysState, SurveyBoard, SurveySaysConfig } from './types';
import {
  getState, updateConfig, setTeamName, setBoards,
  setPlayerPool, assignPlayers, randomAssignPlayers,
  listSaves, createSave, loadSave as apiLoadSave, deleteSave, patchSaveConfig,
} from './api';
import type { SSSaveMeta } from './api';
import { parseSurveyCSV } from './csvParser';
import { SSPlayerRosterModal } from './SSPlayerRosterModal';

const MAX_PER_TEAM = 5;

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAM_COLORS = ['#00e5ff', '#ff6a00'] as const;
const sectionLabelSx = { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'text.disabled', mb: 1 };

const EXAMPLE_CSV = `1, Name something you bring to a picnic, Sandwiches, 42, Blanket, 26, Fruit, 18, Drinks, 8, Sunscreen, 4
1, Name a reason you might be late to work, Traffic, 38, Overslept, 31, Bad weather, 15, Forgot something, 10, Car trouble, 6
2, Name something people do at the beach, Swim, 45, Build sandcastles, 28, Sunbathe, 15, Play volleyball, 8
3, Name something in a doctor's waiting room, Magazines, 40, Chairs, 30, TV, 18, Fish tank, 8, Pamphlets, 4`;

// ─── CSV Content Manager ──────────────────────────────────────────────────────

function ContentManager({ state, onRefresh }: { state: SurveySaysState; onRefresh: () => Promise<void> }) {
  const [csvText, setCsvText] = useState('');
  const [parseResult, setParseResult] = useState<SurveyBoard[] | null>(null);
  const [parseError, setParseError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleParse = () => {
    setParseError('');
    try {
      const boards = parseSurveyCSV(csvText);
      if (boards.length === 0) {
        setParseError('No valid boards found. Check CSV format.');
      } else {
        setParseResult(boards);
      }
    } catch (e) {
      setParseError(String(e));
    }
  };

  const handleUpload = async () => {
    if (!parseResult) return;
    setUploading(true);
    try {
      await setBoards(parseResult);
      await onRefresh();
      setParseResult(null);
      setCsvText('');
    } finally {
      setUploading(false);
    }
  };

  const roundGroups: Record<number, SurveyBoard[]> = {};
  for (const b of state.boards) {
    (roundGroups[b.round] ??= []).push(b);
  }

  return (
    <Stack spacing={2}>
      {/* Current boards summary */}
      <Card>
        <CardContent>
          <Typography sx={sectionLabelSx}>Loaded Boards ({state.boards.length})</Typography>
          {state.boards.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No boards loaded. Paste CSV below to load a game.</Typography>
          ) : (
            Object.entries(roundGroups).map(([round, boards]) => (
              <Box key={round} sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Round {round}</Typography>
                {boards.map(b => (
                  <Typography key={b.id} variant="body2" sx={{ pl: 1 }}>
                    • {b.question} <Typography component="span" variant="caption" color="text.disabled">({b.answers.length} answers)</Typography>
                  </Typography>
                ))}
              </Box>
            ))
          )}
        </CardContent>
      </Card>

      {/* CSV input */}
      <Card>
        <CardContent>
          <Typography sx={sectionLabelSx}>Paste CSV</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Format: <code>round, question, answer1, points1, answer2, points2, ...</code> (up to 8 answers)
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={5}
            maxRows={16}
            placeholder={EXAMPLE_CSV}
            value={csvText}
            onChange={e => { setCsvText(e.target.value); setParseResult(null); setParseError(''); }}
            sx={{ fontFamily: 'monospace', mb: 1 }}
            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
          />
          {parseError && <Alert severity="error" sx={{ mb: 1 }}>{parseError}</Alert>}
          {parseResult && (
            <Alert severity="success" sx={{ mb: 1 }}>
              Parsed {parseResult.length} board{parseResult.length !== 1 ? 's' : ''} across rounds: {[...new Set(parseResult.map(b => b.round))].sort().join(', ')}
            </Alert>
          )}
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={handleParse} disabled={!csvText.trim()}>Parse</Button>
            {parseResult && (
              <Button variant="contained" color="primary" startIcon={<DownloadDoneIcon />}
                disabled={uploading} onClick={() => void handleUpload()}>
                Load {parseResult.length} Boards
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function Settings({ state, onRefresh }: { state: SurveySaysState; onRefresh: () => Promise<void> }) {
  const { config, teams } = state;
  const [multText, setMultText] = useState(config.multiplierSchedule.join(', '));
  const [saving, setSaving] = useState(false);

  const handleConfigChange = async (patch: Partial<SurveySaysConfig>) => {
    setSaving(true);
    try { await updateConfig(patch); await onRefresh(); } finally { setSaving(false); }
  };

  const handleMultSave = async () => {
    const parsed = multText.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    if (parsed.length === 0) return;
    await handleConfigChange({ multiplierSchedule: parsed });
  };

  const handleTeamName = async (teamId: string, name: string) => {
    if (!name.trim()) return;
    setSaving(true);
    try { await setTeamName(teamId, name); await onRefresh(); } finally { setSaving(false); }
  };

  return (
    <Stack spacing={2}>
      {/* Team names */}
      <Card>
        <CardContent>
          <Typography sx={sectionLabelSx}>Team Names</Typography>
          <Stack spacing={1.5}>
            {teams.map((t, i) => (
              <Box key={t.id}>
                <Typography variant="caption" sx={{ color: TEAM_COLORS[i], fontWeight: 700 }}>Family {i + 1}</Typography>
                <TextField
                  fullWidth size="small"
                  defaultValue={t.name}
                  onBlur={e => void handleTeamName(t.id, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void handleTeamName(t.id, (e.target as HTMLInputElement).value); }}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Scoring */}
      <Card>
        <CardContent>
          <Typography sx={sectionLabelSx}>Scoring</Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" gutterBottom>Winning Threshold</Typography>
              <TextField size="small" type="number"
                defaultValue={config.winningThreshold}
                onBlur={e => void handleConfigChange({ winningThreshold: parseInt(e.target.value, 10) })}
              />
            </Box>
            <Box>
              <Typography variant="body2" gutterBottom>Sweep Bonus</Typography>
              <TextField size="small" type="number"
                defaultValue={config.sweepBonus}
                onBlur={e => void handleConfigChange({ sweepBonus: parseInt(e.target.value, 10) })}
              />
            </Box>
            <Box>
              <Typography variant="body2" gutterBottom>Round Multipliers (comma-separated, index = round)</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField size="small" value={multText} onChange={e => setMultText(e.target.value)} sx={{ width: 200 }} />
                <Button size="small" variant="outlined" onClick={() => void handleMultSave()} disabled={saving}>Save</Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">e.g. 1, 1, 2, 3 → R1=×1, R2=×1, R3=×2, R4=×3</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Rules */}
      <Card>
        <CardContent>
          <Typography sx={sectionLabelSx}>Rules</Typography>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button size="small"
                variant={config.addStolenAnswerPoints ? 'contained' : 'outlined'}
                color={config.addStolenAnswerPoints ? 'success' : 'inherit'}
                onClick={() => void handleConfigChange({ addStolenAnswerPoints: !config.addStolenAnswerPoints })}>
                Add stolen answer points: {config.addStolenAnswerPoints ? 'ON' : 'OFF'}
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button size="small"
                variant={config.answerTimerEnabled ? 'contained' : 'outlined'}
                color={config.answerTimerEnabled ? 'warning' : 'inherit'}
                onClick={() => void handleConfigChange({ answerTimerEnabled: !config.answerTimerEnabled })}>
                Answer Timer: {config.answerTimerEnabled ? `ON (${config.answerTimerSecs}s)` : 'OFF'}
              </Button>
              {config.answerTimerEnabled && (
                <TextField size="small" type="number" label="Seconds" sx={{ width: 90 }}
                  defaultValue={config.answerTimerSecs}
                  onBlur={e => void handleConfigChange({ answerTimerSecs: parseInt(e.target.value, 10) })} />
              )}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button size="small"
                variant={config.buzzerMode === 'hardware' ? 'contained' : 'outlined'}
                color={config.buzzerMode === 'hardware' ? 'info' : 'inherit'}
                onClick={() => void handleConfigChange({ buzzerMode: config.buzzerMode === 'hardware' ? 'manual' : 'hardware' })}>
                Buzzer: {config.buzzerMode === 'hardware' ? 'HARDWARE' : 'MANUAL'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

// ─── Teams & Players ──────────────────────────────────────────────────────────

function TeamsSetup({ state, onRefresh }: { state: SurveySaysState; onRefresh: () => Promise<void> }) {
  const { teams, playerPool } = state;
  const [rosterOpen, setRosterOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); await onRefresh(); } finally { setBusy(false); }
  };

  const assignedElsewhere = (teamId: string) =>
    new Set(teams.filter(t => t.id !== teamId).flatMap(t => t.players));
  const unassignedFor = (teamId: string) => {
    const taken = new Set(teams.flatMap(t => t.players));
    return playerPool.filter(p => !taken.has(p) && !assignedElsewhere(teamId).has(p));
  };

  const teamsPayload = () => teams.map(t => ({ id: t.id, name: t.name, players: t.players }));

  const addPlayer = (teamId: string, name: string) => {
    const next = teamsPayload().map(t =>
      t.id === teamId ? { ...t, players: [...t.players, name].slice(0, MAX_PER_TEAM) } : t
    );
    void run(() => assignPlayers(next));
  };
  const removePlayer = (teamId: string, name: string) => {
    const next = teamsPayload().map(t =>
      t.id === teamId ? { ...t, players: t.players.filter(p => p !== name) } : t
    );
    void run(() => assignPlayers(next));
  };
  const clearTeam = (teamId: string) => {
    const next = teamsPayload().map(t => (t.id === teamId ? { ...t, players: [] } : t));
    void run(() => assignPlayers(next));
  };

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
            <Typography sx={sectionLabelSx} style={{ marginBottom: 0 }}>Player Pool ({playerPool.length}/10)</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<PeopleIcon />} onClick={() => setRosterOpen(true)}>
                Manage players
              </Button>
              <Button size="small" variant="contained" color="secondary" startIcon={<CasinoIcon />}
                disabled={busy || playerPool.length === 0}
                onClick={() => void run(() => randomAssignPlayers())}>
                Random assign
              </Button>
            </Stack>
          </Stack>
          {playerPool.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No players in the pool. Add up to 10 via “Manage players”.
            </Typography>
          ) : (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {playerPool.map(p => <Chip key={p} label={p} size="small" />)}
            </Stack>
          )}
        </CardContent>
      </Card>

      {teams.map((team, i) => {
        const options = unassignedFor(team.id);
        const full = team.players.length >= MAX_PER_TEAM;
        return (
          <Card key={team.id}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: TEAM_COLORS[i] }} />
                <TextField
                  size="small" defaultValue={team.name}
                  onBlur={e => { if (e.target.value.trim()) void run(() => setTeamName(team.id, e.target.value.trim())); }}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  sx={{ flex: 1 }}
                />
                <Chip size="small" label={`${team.players.length}/${MAX_PER_TEAM}`}
                  sx={{ color: TEAM_COLORS[i], border: `1px solid ${TEAM_COLORS[i]}55` }} variant="outlined" />
              </Stack>

              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                {team.players.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No players assigned.</Typography>
                )}
                {team.players.map((p, pi) => (
                  <Chip key={p} label={`${pi + 1}. ${p}`} size="small"
                    onDelete={() => removePlayer(team.id, p)}
                    sx={{ borderColor: `${TEAM_COLORS[i]}66` }} variant="outlined" />
                ))}
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <Select
                  size="small" displayEmpty value="" disabled={busy || full || options.length === 0}
                  onChange={e => { if (e.target.value) addPlayer(team.id, e.target.value as string); }}
                  sx={{ minWidth: 170, fontSize: '0.85rem' }}
                  renderValue={() => <em>{full ? 'Family full (5)' : 'Add player…'}</em>}
                >
                  {options.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
                {team.players.length > 0 && (
                  <Tooltip title="Clear family">
                    <IconButton size="small" onClick={() => clearTeam(team.id)}><ClearIcon fontSize="small" /></IconButton>
                  </Tooltip>
                )}
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      <SSPlayerRosterModal
        open={rosterOpen}
        currentPool={playerPool}
        onClose={() => setRosterOpen(false)}
        onApply={pool => void run(() => setPlayerPool(pool))}
      />
    </Stack>
  );
}

// ─── Save Manager ─────────────────────────────────────────────────────────────

function SaveManager() {
  const [saves, setSaves] = useState<SSSaveMeta[]>([]);
  const [saveName, setSaveName] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [patchingId, setPatchingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try { setSaves(await listSaves()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setLoading(true);
    try { await createSave(saveName.trim()); setSaveName(''); await refresh(); } finally { setLoading(false); }
  };

  const handleLoad = async (id: string) => {
    setLoading(true);
    try { await apiLoadSave(id); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try { await deleteSave(id); await refresh(); } finally { setDeletingId(null); }
  };

  const handlePatchConfig = async (id: string) => {
    setPatchingId(id);
    try { await patchSaveConfig(id); await refresh(); } finally { setPatchingId(null); }
  };

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography sx={sectionLabelSx}>Save Current Game</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Saves capture boards and game config (multipliers, threshold, buzzer mode).
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField size="small" label="Save name" value={saveName} onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleSave(); }} sx={{ flex: 1 }} />
            <Button variant="contained" startIcon={<SaveIcon />} disabled={!saveName.trim() || loading}
              onClick={() => void handleSave()}>
              Save
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography sx={sectionLabelSx}>Saved Games ({saves.length})</Typography>
          {saves.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No saves yet.</Typography>
          ) : (
            <Stack spacing={1} divider={<Divider />}>
              {saves.map(s => (
                <Stack key={s.id} direction="row" spacing={1} alignItems="center">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(s.savedAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Tooltip title="Load this game">
                    <Button size="small" variant="outlined" disabled={loading}
                      onClick={() => void handleLoad(s.id)}>
                      Load
                    </Button>
                  </Tooltip>
                  <Tooltip title="Update this save's config from current settings">
                    <span>
                      <IconButton size="small" color="info" disabled={patchingId === s.id}
                        onClick={() => void handlePatchConfig(s.id)}>
                        <SettingsBackupRestoreIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Delete save">
                    <span>
                      <IconButton size="small" color="error" disabled={deletingId === s.id}
                        onClick={() => void handleDelete(s.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const SSAdminComponent = () => {
  const [state, setState] = useState<SurveySaysState | null>(null);
  const [tab, setTab] = useState(0);

  const refresh = useCallback(async () => {
    try { setState(await getState()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  if (!state) {
    return (
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  const roundsLoaded = [...new Set(state.boards.map(b => b.round))].sort();

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', p: 2 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Survey Says — Admin</Typography>
        {roundsLoaded.length > 0
          ? roundsLoaded.map(r => <Chip key={r} label={`Round ${r}`} size="small" color="primary" />)
          : <Chip label="No boards" size="small" color="default" />
        }
      </Stack>

      <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Content" />
        <Tab label="Teams" />
        <Tab label="Settings" />
        <Tab label="Saves" />
      </Tabs>

      {tab === 0 && <ContentManager state={state} onRefresh={refresh} />}
      {tab === 1 && <TeamsSetup state={state} onRefresh={refresh} />}
      {tab === 2 && <Settings state={state} onRefresh={refresh} />}
      {tab === 3 && <SaveManager />}
    </Box>
  );
};

export default SSAdminComponent;
