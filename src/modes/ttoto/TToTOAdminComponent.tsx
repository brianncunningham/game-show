import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Divider, IconButton, MenuItem, Select, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CasinoIcon from '@mui/icons-material/Casino';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';
import SaveIcon from '@mui/icons-material/Save';
import type { TToTOState, TToTORound, TToTOQuestion, TToTOFlavor, TToTOConfig } from './types';
import { FLAVOR_LABELS } from './types';
import {
  getState, setRounds, updateConfig, setTeamName,
  setPlayerPool, setTeamRosters, randomAssignPlayers,
  listSaves, createSave, loadSave as apiLoadSave, updateSave, deleteSave,
} from './api';
import { TToTOPlayerRosterModal } from './TToTOPlayerRosterModal';
import type { TToTOSaveMeta } from './api';
import { TTOTO_COLORS } from './colors';

const TEAM_COLORS = [TTOTO_COLORS.team1, TTOTO_COLORS.team2] as const;
const sectionLabelSx = { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'text.disabled', mb: 1 };
const FLAVOR_OPTIONS = Object.keys(FLAVOR_LABELS) as TToTOFlavor[];

const uid = () => Math.random().toString(36).slice(2, 10);

const EXAMPLE_ROUNDS: TToTORound[] = [
  {
    id: 'round-1', roundNumber: 1, flavor: 'trivia',
    questions: [
      { id: 'q1', prompt: 'Which planet is closest to the sun?', choices: ['Mercury', 'Venus', 'Earth'] },
      {
        id: 'q2', prompt: 'Which of these is NOT a mammal?', choices: ['Bat', 'Dolphin', 'Penguin'],
        hostNote: 'Bats and dolphins are both mammals; penguins are birds.',
      },
    ],
  },
  {
    // category_sort: categoryOptions is fixed for the whole round; each question's choices
    // must be a permutation of it (index 0 = correct, same convention as every other flavor).
    id: 'round-2', roundNumber: 2, flavor: 'category_sort',
    categoryOptions: ['Animal', 'Mineral', 'Vegetable'],
    questions: [
      { id: 'q3', prompt: 'Tomato', choices: ['Vegetable', 'Animal', 'Mineral'] },
      { id: 'q4', prompt: 'Granite', choices: ['Mineral', 'Animal', 'Vegetable'] },
      { id: 'q5', prompt: 'Elephant', choices: ['Animal', 'Mineral', 'Vegetable'] },
    ],
  },
];

const emptyQuestion = (): TToTOQuestion => ({ id: uid(), prompt: '', choices: ['', '', ''], hostNote: '' });
const emptyRound = (roundNumber: number): TToTORound => ({ id: uid(), roundNumber, flavor: 'trivia', questions: [emptyQuestion()] });
const cloneRounds = (rounds: TToTORound[]): TToTORound[] => rounds.map(r => ({ ...r, questions: r.questions.map(q => ({ ...q, choices: [...q.choices] as [string, string, string] })) }));

// ─── Form-based round/question editor ────────────────────────────────────────

// category_sort: builds an authored `choices` triplet (index 0 = correct, as usual) from
// the round's fixed category set plus which one is correct for this particular item.
const buildCategoryChoices = (categoryOptions: [string, string, string], correctIndex: number): [string, string, string] => {
  const rest = categoryOptions.filter((_, i) => i !== correctIndex);
  return [categoryOptions[correctIndex], rest[0], rest[1]];
};

// media_id ("ID Please") only — mediaType dropdown + a mediaRef field whose label/
// placeholder switches with it. Same "flavor-specific fields bolted onto the generic
// question form" approach as category_sort's dedicated row, just smaller since media_id
// otherwise uses the normal prompt/3-choices shape (unlike category_sort's own layout).
function MediaFields({ question, onChange }: { question: TToTOQuestion; onChange: (q: TToTOQuestion) => void }) {
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
      <TextField
        size="small" select label="Media type" value={question.mediaType ?? ''}
        sx={{ minWidth: 140 }}
        onChange={e => onChange({ ...question, mediaType: (e.target.value || undefined) as TToTOQuestion['mediaType'] })}
      >
        <MenuItem value=""><em>None</em></MenuItem>
        <MenuItem value="song">Song</MenuItem>
        <MenuItem value="image">Image</MenuItem>
        <MenuItem value="sound">Sound effect</MenuItem>
      </TextField>
      {question.mediaType && (
        <TextField
          fullWidth size="small"
          label={question.mediaType === 'song' ? 'Spotify Track ID' : question.mediaType === 'image' ? 'Image filename' : 'Sound filename'}
          placeholder={
            question.mediaType === 'song' ? 'e.g. 3BQHpFgAp4l80e1XslIjNI'
              : question.mediaType === 'image' ? 'e.g. eiffel-tower.jpg (in public/ttoto/media/)'
                : 'e.g. dial-up-modem.mp3 (in public/ttoto/media/)'
          }
          value={question.mediaRef ?? ''}
          onChange={e => onChange({ ...question, mediaRef: e.target.value || undefined })}
        />
      )}
    </Stack>
  );
}

function QuestionForm({ question, flavor, onChange, onRemove, canRemove }: {
  question: TToTOQuestion; flavor: TToTOFlavor; onChange: (q: TToTOQuestion) => void; onRemove: () => void; canRemove: boolean;
}) {
  return (
    <Box sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1, mb: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          fullWidth size="small" label="Prompt" value={question.prompt}
          onChange={e => onChange({ ...question, prompt: e.target.value })}
          sx={{ mb: 1.5 }}
        />
        <Tooltip title="Remove question">
          <span>
            <IconButton size="small" color="error" disabled={!canRemove} onClick={onRemove}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      {flavor === 'media_id' && <MediaFields question={question} onChange={onChange} />}
      <Stack spacing={1}>
        {(['Correct answer', 'Wrong answer 1', 'Wrong answer 2'] as const).map((label, i) => (
          <TextField
            key={i} fullWidth size="small" label={label} value={question.choices[i]}
            color={i === 0 ? 'success' : undefined}
            focused={i === 0 && question.choices[0].length > 0 ? true : undefined}
            onChange={e => {
              const choices = [...question.choices] as [string, string, string];
              choices[i] = e.target.value;
              onChange({ ...question, choices });
            }}
          />
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 1 }}>
        The game randomizes which of This/That/The Other shows each answer — the "Correct answer" field is just for authoring.
      </Typography>
      <TextField
        fullWidth size="small" label="Host note (optional)" placeholder='e.g. "Tomato is technically a fruit; the other two are vegetables"'
        value={question.hostNote ?? ''} multiline minRows={1} maxRows={3}
        onChange={e => onChange({ ...question, hostNote: e.target.value })}
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        Shown only on the host screen — never on the audience display.
      </Typography>
    </Box>
  );
}

// category_sort: a dense two-column row (item | correct category) instead of QuestionForm's
// full card — this flavor is meant as a quick-fire round with many items, so no host note
// field and minimal per-row chrome, to keep a long list scannable/editable at a glance.
function CategorySortRow({ question, categoryOptions, onChange, onRemove, canRemove }: {
  question: TToTOQuestion; categoryOptions: [string, string, string];
  onChange: (q: TToTOQuestion) => void; onRemove: () => void; canRemove: boolean;
}) {
  const categoriesReady = categoryOptions.every(c => c.trim());
  const selectedIndex = categoriesReady ? categoryOptions.indexOf(question.choices[0]) : -1;

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
      <TextField
        size="small" placeholder="Item to classify" value={question.prompt}
        onChange={e => onChange({ ...question, prompt: e.target.value })}
        sx={{ flex: 1 }}
      />
      <TextField
        size="small" select placeholder="Correct category" value={selectedIndex >= 0 ? selectedIndex : ''}
        disabled={!categoriesReady}
        onChange={e => onChange({ ...question, choices: buildCategoryChoices(categoryOptions, Number(e.target.value)) })}
        sx={{ flex: 1 }}
      >
        {categoryOptions.map((c, i) => <MenuItem key={i} value={i}>{c}</MenuItem>)}
      </TextField>
      <Tooltip title="Remove item">
        <span>
          <IconButton size="small" color="error" disabled={!canRemove} onClick={onRemove}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

function RoundForm({ round, index, total, onChange, onRemove, onMove }: {
  round: TToTORound; index: number; total: number;
  onChange: (r: TToTORound) => void; onRemove: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const updateQuestion = (qi: number, q: TToTOQuestion) => {
    onChange({ ...round, questions: round.questions.map((existing, i) => (i === qi ? q : existing)) });
  };
  const removeQuestion = (qi: number) => {
    onChange({ ...round, questions: round.questions.filter((_, i) => i !== qi) });
  };
  const addQuestion = () => {
    onChange({ ...round, questions: [...round.questions, emptyQuestion()] });
  };
  const isCategorySort = round.flavor === 'category_sort';
  const setCategoryOption = (i: number, value: string) => {
    const options = [...(round.categoryOptions ?? ['', '', ''])] as [string, string, string];
    options[i] = value;
    // Clear any previously-assigned round-slot mapping — it was computed against the old
    // category set and would no longer line up (see server store's ensureCategorySlots).
    onChange({ ...round, categoryOptions: options, categorySlots: undefined });
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Chip label={`Round ${round.roundNumber}`} size="small" color="primary" />
          <Select
            size="small" value={round.flavor}
            onChange={e => {
              const flavor = e.target.value as TToTOFlavor;
              const categoryOptions = flavor === 'category_sort' ? (round.categoryOptions ?? ['', '', '']) : round.categoryOptions;
              onChange({ ...round, flavor, categoryOptions });
            }}
            sx={{ minWidth: 180, fontSize: '0.85rem' }}
          >
            {FLAVOR_OPTIONS.map(f => <MenuItem key={f} value={f}>{FLAVOR_LABELS[f]}</MenuItem>)}
          </Select>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Move round up">
            <span><IconButton size="small" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUpwardIcon fontSize="small" /></IconButton></span>
          </Tooltip>
          <Tooltip title="Move round down">
            <span><IconButton size="small" disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDownwardIcon fontSize="small" /></IconButton></span>
          </Tooltip>
          <Tooltip title="Delete round">
            <IconButton size="small" color="error" onClick={onRemove}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Stack>

        {isCategorySort && (
          <Box sx={{ mb: 1.5, p: 1.5, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
              Category options — fixed for the whole round (e.g. "Animal" / "Mineral" / "Vegetable"). The game randomly
              assigns these three to This/That/The Other once, then holds that layout stable for every question below.
            </Typography>
            <Stack direction="row" spacing={1}>
              {[0, 1, 2].map(i => (
                <TextField
                  key={i} fullWidth size="small" label={`Category ${i + 1}`} value={round.categoryOptions?.[i] ?? ''}
                  onChange={e => setCategoryOption(i, e.target.value)}
                />
              ))}
            </Stack>
          </Box>
        )}

        {isCategorySort ? (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ flex: 1, color: 'text.disabled' }}>ITEM</Typography>
              <Typography variant="caption" sx={{ flex: 1, color: 'text.disabled' }}>CORRECT CATEGORY</Typography>
              <Box sx={{ width: 34 }} />
            </Stack>
            {round.questions.map((q, qi) => (
              <CategorySortRow key={q.id} question={q} canRemove={round.questions.length > 1}
                categoryOptions={round.categoryOptions ?? ['', '', '']}
                onChange={(nq) => updateQuestion(qi, nq)} onRemove={() => removeQuestion(qi)} />
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={addQuestion} sx={{ mt: 0.5 }}>Add Item</Button>
          </>
        ) : (
          <>
            {round.questions.map((q, qi) => (
              <QuestionForm key={q.id} question={q} flavor={round.flavor} canRemove={round.questions.length > 1}
                onChange={(nq) => updateQuestion(qi, nq)} onRemove={() => removeQuestion(qi)} />
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={addQuestion}>Add Question</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RoundFormEditor({ state, onRefresh }: { state: TToTOState; onRefresh: () => Promise<void> }) {
  const [draft, setDraft] = useState<TToTORound[]>(() => cloneRounds(state.rounds));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Re-sync from the server whenever it changes from elsewhere (e.g. JSON import, or
  // after our own save completes) — but not while the user has unsaved local edits.
  useEffect(() => {
    if (!dirty) setDraft(cloneRounds(state.rounds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rounds]);

  const updateRound = (ri: number, r: TToTORound) => {
    setDraft(d => d.map((existing, i) => (i === ri ? r : existing)));
    setDirty(true);
  };
  const removeRound = (ri: number) => {
    setDraft(d => d.filter((_, i) => i !== ri).map((r, i) => ({ ...r, roundNumber: i + 1 })));
    setDirty(true);
  };
  const addRound = () => {
    setDraft(d => [...d, emptyRound(d.length + 1)]);
    setDirty(true);
  };
  const moveRound = (ri: number, dir: -1 | 1) => {
    setDraft(d => {
      const next = [...d];
      const target = ri + dir;
      if (target < 0 || target >= next.length) return d;
      [next[ri], next[target]] = [next[target], next[ri]];
      return next.map((r, i) => ({ ...r, roundNumber: i + 1 }));
    });
    setDirty(true);
  };

  const validationError = (): string | null => {
    for (const [ri, r] of draft.entries()) {
      if (r.questions.length === 0) return `Round ${ri + 1}: needs at least one question.`;
      if (r.flavor === 'category_sort') {
        if (!r.categoryOptions || r.categoryOptions.some(c => !c.trim())) {
          return `Round ${ri + 1}: all 3 category options required.`;
        }
      }
      for (const [qi, q] of r.questions.entries()) {
        if (!q.prompt.trim()) return `Round ${ri + 1}, Q${qi + 1}: ${r.flavor === 'category_sort' ? 'item to classify' : 'prompt'} required.`;
        if (q.choices.some(c => !c.trim())) return `Round ${ri + 1}, Q${qi + 1}: all three answers required.`;
        if (r.flavor === 'category_sort' && r.categoryOptions) {
          const validSet = new Set(r.categoryOptions);
          if (q.choices.length !== 3 || !q.choices.every(c => validSet.has(c)) || new Set(q.choices).size !== 3) {
            return `Round ${ri + 1}, Q${qi + 1}: correct category not selected — pick one from the round's 3 categories.`;
          }
        }
      }
    }
    return null;
  };
  const error = validationError();

  const handleSave = async () => {
    if (error) return;
    setSaving(true);
    try {
      await setRounds(draft);
      await onRefresh();
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      {draft.map((round, ri) => (
        <RoundForm key={round.id} round={round} index={ri} total={draft.length}
          onChange={(r) => updateRound(ri, r)} onRemove={() => removeRound(ri)} onMove={(dir) => moveRound(ri, dir)} />
      ))}
      <Button variant="outlined" startIcon={<AddIcon />} onClick={addRound}>Add Round</Button>
      {error && <Alert severity="warning">{error}</Alert>}
      <Button variant="contained" color="primary" startIcon={<SaveIcon />} disabled={saving || !!error || !dirty} onClick={() => void handleSave()}>
        {dirty ? 'Save Changes' : 'Saved'}
      </Button>
    </Stack>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────

function BulkJsonImport({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [parseResult, setParseResult] = useState<TToTORound[] | null>(null);
  const [parseError, setParseError] = useState('');
  const [uploading, setUploading] = useState(false);

  const validate = (data: unknown): TToTORound[] => {
    if (!Array.isArray(data)) throw new Error('Expected a JSON array of rounds.');
    return data.map((r, i) => {
      if (!r || typeof r !== 'object') throw new Error(`Round ${i + 1}: not an object.`);
      const round = r as Partial<TToTORound>;
      if (!round.flavor || !(round.flavor in FLAVOR_LABELS)) throw new Error(`Round ${i + 1}: invalid or missing flavor. Valid values: ${FLAVOR_OPTIONS.join(', ')}.`);
      if (!Array.isArray(round.questions) || round.questions.length === 0) throw new Error(`Round ${i + 1}: needs at least one question.`);
      const isCategorySort = round.flavor === 'category_sort';
      if (isCategorySort && (!Array.isArray(round.categoryOptions) || round.categoryOptions.length !== 3 || round.categoryOptions.some((c: unknown) => typeof c !== 'string' || !c.trim()))) {
        throw new Error(`Round ${i + 1}: category_sort needs a "categoryOptions" array of exactly 3 strings.`);
      }
      round.questions.forEach((q, qi) => {
        if (!q.prompt?.trim()) throw new Error(`Round ${i + 1}, Q${qi + 1}: prompt required.`);
        if (!Array.isArray(q.choices) || q.choices.length !== 3 || q.choices.some((c: unknown) => typeof c !== 'string' || !c.trim())) {
          throw new Error(`Round ${i + 1}, Q${qi + 1}: choices must be an array of exactly 3 strings, first one correct.`);
        }
        if (isCategorySort && round.categoryOptions) {
          const validSet = new Set(round.categoryOptions);
          if (!q.choices.every((c: string) => validSet.has(c)) || new Set(q.choices).size !== 3) {
            throw new Error(`Round ${i + 1}, Q${qi + 1}: choices must be a permutation of the round's categoryOptions (${round.categoryOptions.join(', ')}).`);
          }
        }
        if (q.mediaType !== undefined && q.mediaType !== 'song' && q.mediaType !== 'image' && q.mediaType !== 'sound') {
          throw new Error(`Round ${i + 1}, Q${qi + 1}: mediaType must be "song", "image", or "sound" if present.`);
        }
      });
      return {
        id: round.id ?? `round-${i + 1}-${uid()}`,
        roundNumber: i + 1,
        flavor: round.flavor,
        ...(isCategorySort ? { categoryOptions: round.categoryOptions } : {}),
        questions: round.questions.map((q, qi) => ({
          id: q.id ?? `q-${i + 1}-${qi + 1}-${uid()}`,
          prompt: q.prompt,
          choices: q.choices,
          ...(q.mediaType ? { mediaType: q.mediaType } : {}),
          ...(q.mediaRef ? { mediaRef: q.mediaRef } : {}),
          ...(q.hostNote ? { hostNote: q.hostNote } : {}),
        })),
      } as TToTORound;
    });
  };

  const handleParse = () => {
    setParseError('');
    try {
      const data = JSON.parse(jsonText) as unknown;
      setParseResult(validate(data));
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e));
      setParseResult(null);
    }
  };

  const handleUpload = async () => {
    if (!parseResult) return;
    setUploading(true);
    try {
      await setRounds(parseResult);
      await onRefresh();
      setParseResult(null);
      setJsonText('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: open ? undefined : '12px !important' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" onClick={() => setOpen(o => !o)} sx={{ cursor: 'pointer' }}>
          <Typography sx={{ ...sectionLabelSx, mb: 0 }}>Advanced: Bulk JSON Import (replaces all rounds)</Typography>
          <Button size="small">{open ? 'Hide' : 'Show'}</Button>
        </Stack>
        {open && (
          <Box sx={{ mt: 1.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Valid flavors: {FLAVOR_OPTIONS.join(', ')}. <code>choices</code> is an array of exactly 3 strings — the first is always correct; the game randomizes screen position. Optional <code>hostNote</code> string shows only on /host. <code>category_sort</code> rounds also need a round-level <code>categoryOptions</code> array of exactly 3 strings (fixed for the round); every question's <code>choices</code> must be a permutation of it. <code>media_id</code> ("ID Please") questions take an optional <code>mediaType</code> ("song", "image", or "sound") + <code>mediaRef</code> (Spotify Track ID for songs, filename under <code>public/ttoto/media/</code> for images/sounds).
              </Typography>
              <Button size="small" variant="outlined" onClick={() => setJsonText(JSON.stringify(EXAMPLE_ROUNDS, null, 2))}>
                Load Example
              </Button>
            </Stack>
            <TextField
              fullWidth multiline minRows={6} maxRows={20}
              placeholder="[ ... ]"
              value={jsonText}
              onChange={e => { setJsonText(e.target.value); setParseResult(null); setParseError(''); }}
              sx={{ mb: 1 }}
              inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
            />
            {parseError && <Alert severity="error" sx={{ mb: 1 }}>{parseError}</Alert>}
            {parseResult && (
              <Alert severity="success" sx={{ mb: 1 }}>
                Parsed {parseResult.length} round{parseResult.length !== 1 ? 's' : ''}, {parseResult.reduce((n, r) => n + r.questions.length, 0)} questions total. This will replace all currently loaded rounds.
              </Alert>
            )}
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={handleParse} disabled={!jsonText.trim()}>Parse</Button>
              {parseResult && (
                <Button variant="contained" color="primary" startIcon={<DownloadDoneIcon />} disabled={uploading} onClick={() => void handleUpload()}>
                  Replace with {parseResult.length} Round{parseResult.length !== 1 ? 's' : ''}
                </Button>
              )}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function ContentManager({ state, onRefresh }: { state: TToTOState; onRefresh: () => Promise<void> }) {
  return (
    <Stack spacing={2}>
      <RoundFormEditor state={state} onRefresh={onRefresh} />
      <Divider />
      <BulkJsonImport onRefresh={onRefresh} />
    </Stack>
  );
}

// ─── Players & Rosters (hardware-player mode) ──────────────────────────────────
// Mirrors Survey Says's player-pool + per-team roster pattern exactly, including the
// shared cross-mode "known players" pool modal (TToTOPlayerRosterModal) — a host who
// already typed names into NTT/Survey Says this session shouldn't have to retype them.
// Controller numbering (server buildControllerAssignments) is rebuilt automatically
// whenever a roster changes.

function PlayersSetup({ state, onRefresh }: { state: TToTOState; onRefresh: () => Promise<void> }) {
  const { teams, playerPool } = state;
  const [busy, setBusy] = useState(false);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); await onRefresh(); } finally { setBusy(false); }
  };

  const unassignedFor = (teamId: string) => {
    const taken = new Set(teams.flatMap(t => t.players));
    return playerPool.filter(p => !taken.has(p) || teams.find(t => t.id === teamId)?.players.includes(p));
  };

  const teamsPayload = () => teams.map(t => ({ id: t.id, name: t.name, players: t.players }));

  const addPlayer = (teamId: string, name: string) => {
    const next = teamsPayload().map(t => (t.id === teamId ? { ...t, players: [...t.players, name] } : t));
    void run(() => setTeamRosters(next));
  };
  const removePlayer = (teamId: string, name: string) => {
    const next = teamsPayload().map(t => (t.id === teamId ? { ...t, players: t.players.filter(p => p !== name) } : t));
    void run(() => setTeamRosters(next));
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
          <Typography sx={sectionLabelSx} style={{ marginBottom: 0 }}>Players ({playerPool.length}) — hardware-player mode</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={() => setRosterModalOpen(true)}>
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No players in the pool. Add some via "Manage players".
          </Typography>
        ) : (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {playerPool.map(p => <Chip key={p} label={p} size="small" />)}
          </Stack>
        )}
        <TToTOPlayerRosterModal
          open={rosterModalOpen}
          currentPool={playerPool}
          onClose={() => setRosterModalOpen(false)}
          onApply={pool => void run(() => setPlayerPool(pool))}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {teams.map((team, i) => {
            const options = unassignedFor(team.id).filter(p => !team.players.includes(p));
            return (
              <Box key={team.id} sx={{ flex: 1, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, p: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: TEAM_COLORS[i] }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{team.name}</Typography>
                  <Chip size="small" label={team.players.length} sx={{ color: TEAM_COLORS[i], border: `1px solid ${TEAM_COLORS[i]}55` }} variant="outlined" />
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
                <Select
                  size="small" displayEmpty value="" disabled={busy || options.length === 0}
                  onChange={e => { if (e.target.value) addPlayer(team.id, e.target.value as string); }}
                  sx={{ minWidth: 170, fontSize: '0.85rem' }}
                  renderValue={() => <em>Add player…</em>}
                >
                  {options.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </Box>
            );
          })}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Controllers are assigned positionally (Team 1's players get the first wands, Team 2's the next)
          whenever a roster changes — see Buzzer mode below to actually go live with hardware.
        </Typography>
      </CardContent>
    </Card>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function Settings({ state, onRefresh }: { state: TToTOState; onRefresh: () => Promise<void> }) {
  const { config, teams } = state;
  const [multText, setMultText] = useState(config.roundMultipliers.join(', '));

  const handleConfigChange = async (patch: Partial<TToTOConfig>) => {
    await updateConfig(patch);
    await onRefresh();
  };

  const handleMultSave = async () => {
    const parsed = multText.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    if (parsed.length === 0) return;
    await handleConfigChange({ roundMultipliers: parsed });
  };

  const handleTeamName = async (teamId: string, name: string) => {
    if (!name.trim()) return;
    await setTeamName(teamId, name);
    await onRefresh();
  };

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography sx={sectionLabelSx}>Team Names</Typography>
          <Stack spacing={1.5}>
            {teams.map((t, i) => (
              <Box key={t.id}>
                <Typography variant="caption" sx={{ color: TEAM_COLORS[i], fontWeight: 700 }}>Team {i + 1}</Typography>
                <TextField fullWidth size="small" defaultValue={t.name}
                  onBlur={e => void handleTeamName(t.id, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void handleTeamName(t.id, (e.target as HTMLInputElement).value); }}
                  sx={{ mt: 0.5 }} />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <PlayersSetup state={state} onRefresh={onRefresh} />

      <Card>
        <CardContent>
          <Typography sx={sectionLabelSx}>Scoring</Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" gutterBottom>Base Points (per question)</Typography>
              <TextField size="small" type="number" defaultValue={config.basePoints}
                onBlur={e => void handleConfigChange({ basePoints: parseInt(e.target.value, 10) })} />
            </Box>
            <Box>
              <Typography variant="body2" gutterBottom>Round Multipliers (comma-separated, index = round)</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField size="small" value={multText} onChange={e => setMultText(e.target.value)} sx={{ width: 200 }} />
                <Button size="small" variant="outlined" onClick={() => void handleMultSave()}>Save</Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">e.g. 1, 1, 2, 2, 3 → R1=×1, R2=×1, R3=×2, R4=×2, R5=×3. A steal is worth the same as a first-guess correct answer.</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography sx={sectionLabelSx}>Rules</Typography>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>Reveal timing:</Typography>
              {(['prompt_first', 'together'] as const).map(v => (
                <Button key={v} size="small" variant={config.revealTiming === v ? 'contained' : 'outlined'} color="info"
                  onClick={() => void handleConfigChange({ revealTiming: v })}>
                  {v === 'prompt_first' ? 'Prompt first' : 'Together'}
                </Button>
              ))}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>Early buzz:</Typography>
              {(['ignore', 'lockout'] as const).map(v => (
                <Button key={v} size="small" variant={config.earlyBuzzPenalty === v ? 'contained' : 'outlined'} color="warning"
                  onClick={() => void handleConfigChange({ earlyBuzzPenalty: v })}>
                  {v === 'ignore' ? 'Ignore' : 'Lockout (this window)'}
                </Button>
              ))}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>Double miss:</Typography>
              {(['no_score', 'half_points'] as const).map(v => (
                <Button key={v} size="small" variant={config.doubleMissRule === v ? 'contained' : 'outlined'} color="secondary"
                  onClick={() => void handleConfigChange({ doubleMissRule: v })}>
                  {v === 'no_score' ? 'No score' : 'Half points'}
                </Button>
              ))}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>Buzzer:</Typography>
              {(['manual', 'hardware-player'] as const).map(mode => (
                <Button key={mode} size="small" variant={config.buzzerMode === mode ? 'contained' : 'outlined'} color="info"
                  onClick={() => void handleConfigChange({ buzzerMode: mode })}>
                  {mode === 'manual' ? 'Manual' : 'Player HW (assign rosters below)'}
                </Button>
              ))}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>Steal mode:</Typography>
              <Button size="small" variant={config.stealMode === 'EXCLUSIVE' ? 'contained' : 'outlined'} color="secondary"
                onClick={() => void handleConfigChange({ stealMode: 'EXCLUSIVE' })}>
                EXCLUSIVE
              </Button>
              <Button size="small" variant={config.stealMode === 'TIMED_WINDOW' ? 'contained' : 'outlined'} color="secondary"
                disabled={config.buzzerMode !== 'hardware-player'}
                onClick={() => void handleConfigChange({ stealMode: 'TIMED_WINDOW' })}>
                TIMED_WINDOW
              </Button>
              {config.stealMode === 'TIMED_WINDOW' && (
                <TextField size="small" type="number" label="Exclusive window (s)" sx={{ width: 150 }}
                  defaultValue={config.stealWindowSecs}
                  onBlur={e => void handleConfigChange({ stealWindowSecs: parseInt(e.target.value, 10) })} />
              )}
              <Typography variant="caption" color="text.secondary">
                {config.buzzerMode !== 'hardware-player'
                  ? '— TIMED_WINDOW needs "Player HW" buzzer mode (above) to actually run an open buzz race; a human host can\'t referee a countdown on behalf of physical wands.'
                  : "— the other team's remaining players get exclusive buzz-in rights for the window above, then it opens to both teams' remaining players (whoever just missed personally stays locked out until the next question, but their teammates and the other team aren't affected)."}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

// ─── Save Manager ─────────────────────────────────────────────────────────────

interface ActiveSave { id: string; name: string }

function SaveManager({ activeSave, onActiveSaveChange, onRefreshGame }: {
  activeSave: ActiveSave | null;
  onActiveSaveChange: (save: ActiveSave | null) => void;
  onRefreshGame: () => Promise<void>;
}) {
  const [saves, setSaves] = useState<TToTOSaveMeta[]>([]);
  const [saveName, setSaveName] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try { setSaves(await listSaves()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setLoading(true);
    try {
      const created = await createSave(saveName.trim());
      setSaveName('');
      await refresh();
      onActiveSaveChange({ id: created.id, name: created.name });
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (s: TToTOSaveMeta) => {
    setLoading(true);
    try {
      await apiLoadSave(s.id);
      await onRefreshGame();
      onActiveSaveChange({ id: s.id, name: s.name });
    } finally {
      setLoading(false);
    }
  };

  // Overwrites this save with whatever rounds/config are currently live (i.e. whatever
  // you just edited in the Content/Settings tabs) — this is the "re-save my edits" step.
  const handleUpdate = async (s: TToTOSaveMeta) => {
    setUpdatingId(s.id);
    try {
      await updateSave(s.id);
      await refresh();
      onActiveSaveChange({ id: s.id, name: s.name });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteSave(id);
      await refresh();
      if (activeSave?.id === id) onActiveSaveChange(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        <strong>Workflow:</strong> Load a save below to bring it into the live game (editable in the Content/Settings
        tabs) → make your edits → come back here and click <strong>Update</strong> on that same save to write your
        edits back to it. Editing Content/Settings always changes the live game immediately; it only reaches a named
        save file once you click Update (or Save As New below).
      </Alert>

      <Card>
        <CardContent>
          <Typography sx={sectionLabelSx}>Save Current Game As New</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Creates a brand-new save from what's currently live. To update an existing save instead, use its Update button below.
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField size="small" label="Save name" value={saveName} onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleSave(); }} sx={{ flex: 1 }} />
            <Button variant="contained" startIcon={<SaveIcon />} disabled={!saveName.trim() || loading} onClick={() => void handleSave()}>
              Save As New
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
                <Stack key={s.id} direction="row" spacing={1} alignItems="center"
                  sx={activeSave?.id === s.id ? { bgcolor: 'rgba(86,215,255,0.08)', borderRadius: 1, px: 1 } : undefined}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.name}</Typography>
                      {activeSave?.id === s.id && <Chip label="Currently editing" size="small" color="info" />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">{new Date(s.savedAt).toLocaleString()}</Typography>
                  </Box>
                  <Tooltip title="Bring this save's rounds/config into the live game for editing">
                    <Button size="small" variant="outlined" disabled={loading} onClick={() => void handleLoad(s)}>Load</Button>
                  </Tooltip>
                  <Tooltip title="Overwrite this save with the currently live rounds/config">
                    <Button size="small" variant="outlined" color="warning" disabled={updatingId === s.id} onClick={() => void handleUpdate(s)}>
                      Update
                    </Button>
                  </Tooltip>
                  <Tooltip title="Delete save">
                    <span>
                      <IconButton size="small" color="error" disabled={deletingId === s.id} onClick={() => void handleDelete(s.id)}>
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

export const TToTOAdminComponent = () => {
  const [state, setState] = useState<TToTOState | null>(null);
  const [tab, setTab] = useState(0);
  const [activeSave, setActiveSave] = useState<ActiveSave | null>(null);

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

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', p: 2 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>TToTO — Admin</Typography>
        {state.rounds.length > 0
          ? <Chip label={`${state.rounds.length} round${state.rounds.length !== 1 ? 's' : ''}`} size="small" color="primary" />
          : <Chip label="No rounds" size="small" color="default" />}
        <Chip
          label={activeSave ? `📂 Loaded from: ${activeSave.name}` : 'No save loaded (live game only)'}
          size="small" color={activeSave ? 'info' : 'default'} variant={activeSave ? 'filled' : 'outlined'}
          title="Content/Settings edits change the live game immediately. This just tracks which save you last Loaded/Updated — click Update in the Saves tab to write your edits back to it."
        />
      </Stack>

      <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Content" />
        <Tab label="Settings" />
        <Tab label="Saves" />
      </Tabs>

      {tab === 0 && <ContentManager state={state} onRefresh={refresh} />}
      {tab === 1 && <Settings state={state} onRefresh={refresh} />}
      {tab === 2 && <SaveManager activeSave={activeSave} onActiveSaveChange={setActiveSave} onRefreshGame={refresh} />}
    </Box>
  );
};

export default TToTOAdminComponent;
