import { useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Divider, Stack, TextField, Typography } from '@mui/material';
import { SAMPLE_QUESTIONS } from './sampleContent';
import type { GameShowQuestion, GameShowSong } from './types';

interface ContentManagerProps {
  questions: GameShowQuestion[];
  onChange: (questions: GameShowQuestion[]) => void;
}

const ROUNDS = [1, 2, 3];
const SONG_COUNT = 3;

const emptySongs = (): GameShowSong[] =>
  Array.from({ length: SONG_COUNT }, () => ({ title: '', artist: '' }));

const createEmptyQuestion = (round: number, index: number): GameShowQuestion => ({
  id: `r${round}q${index + 1}-${Date.now()}`,
  round,
  category: '',
  songLabel: '',
  songs: emptySongs(),
  clipStart: 0,
  clipDuration: 0,
  basePoints: 100,
});

export const ContentManager = ({ questions, onChange }: ContentManagerProps) => {
  const [csvText, setCsvText] = useState('');

  const rows = useMemo(() => {
    if (questions.length) return questions;
    return ROUNDS.flatMap((r) => Array.from({ length: 5 }, (_, i) => createEmptyQuestion(r, i)));
  }, [questions]);

  const updateQuestion = (questionId: string, patch: Partial<GameShowQuestion>) => {
    onChange(rows.map((q) => (q.id === questionId ? { ...q, ...patch } : q)));
  };

  const addQuestionToRound = (round: number) => {
    const countInRound = rows.filter((q) => q.round === round).length;
    onChange([...rows, createEmptyQuestion(round, countInRound)]);
  };

  const removeQuestion = (questionId: string) => {
    onChange(rows.filter((q) => q.id !== questionId));
  };

  const importCsv = () => {
    const parsed = csvText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [roundStr = '1', category = '', basePoints = '100', t1 = '', a1 = '', t2 = '', a2 = '', t3 = '', a3 = ''] = line.split(',').map(s => s.trim());
        const round = Number(roundStr) || 1;
        return {
          id: `csv-r${round}q${index + 1}`,
          round,
          category,
          songLabel: '',
          songs: [
            { title: t1, artist: a1 },
            { title: t2, artist: a2 },
            { title: t3, artist: a3 },
          ],
          clipStart: 0,
          clipDuration: 0,
          basePoints: Number(basePoints) || 100,
        } satisfies GameShowQuestion;
      });

    if (parsed.length) {
      onChange(parsed);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" flexWrap="wrap">
            <Typography variant="h6">Content manager</Typography>
            <Button variant="outlined" onClick={() => onChange(SAMPLE_QUESTIONS)}>
              Load sample pack
            </Button>
          </Stack>

          {ROUNDS.map((round) => {
            const roundRows = rows.filter((q) => q.round === round);
            const accentColor = round === 1 ? '#4fc3f7' : round === 2 ? '#81c784' : '#ffb74d';
            return (
              <Box
                key={round}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderLeft: `4px solid ${accentColor}`,
                  borderRadius: 2,
                  p: 2,
                  backgroundColor: 'rgba(255,255,255,0.02)',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: accentColor }}>
                    Round {round}
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => addQuestionToRound(round)}>
                    + Add theme
                  </Button>
                </Stack>
                <Stack spacing={2}>
                  {roundRows.map((question) => (
                    <Box key={question.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
                        <TextField
                          label="Theme / Category"
                          size="small"
                          sx={{ minWidth: 160 }}
                          value={question.category}
                          onChange={(event) => updateQuestion(question.id, { category: event.target.value })}
                        />
                        <TextField
                          label="Base points"
                          size="small"
                          type="number"
                          sx={{ width: 110 }}
                          value={question.basePoints}
                          onChange={(event) => updateQuestion(question.id, { basePoints: Number(event.target.value) || 100 })}
                        />
                        <Button size="small" color="error" variant="text" onClick={() => removeQuestion(question.id)} sx={{ ml: 'auto' }}>
                          Remove
                        </Button>
                      </Stack>
                      <Stack spacing={1}>
                        {(question.songs ?? emptySongs()).map((song, si) => (
                          <Stack key={si} direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" sx={{ width: 52, flexShrink: 0, color: 'text.secondary' }}>Song {si + 1}</Typography>
                            <TextField
                              label="Title"
                              size="small"
                              sx={{ flex: 1 }}
                              value={song.title}
                              onChange={(event) => {
                                const updated = [...(question.songs ?? emptySongs())];
                                updated[si] = { ...updated[si], title: event.target.value };
                                updateQuestion(question.id, { songs: updated });
                              }}
                            />
                            <TextField
                              label="Artist"
                              size="small"
                              sx={{ flex: 1 }}
                              value={song.artist}
                              onChange={(event) => {
                                const updated = [...(question.songs ?? emptySongs())];
                                updated[si] = { ...updated[si], artist: event.target.value };
                                updateQuestion(question.id, { songs: updated });
                              }}
                            />
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  ))}
                  {roundRows.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No themes for this round yet.</Typography>
                  )}
                </Stack>
              </Box>
            );
          })}

          <Divider />

          <Typography variant="subtitle1">Quick CSV import</Typography>
          <Typography variant="body2" color="text.secondary">
            Format per line: round, category, basePoints, song1 title, song1 artist, song2 title, song2 artist, song3 title, song3 artist
          </Typography>
          <TextField
            multiline
            minRows={4}
            placeholder={'1, Warmup, 100, Never Gonna Give You Up, Rick Astley, Bohemian Rhapsody, Queen, Sweet Child O Mine, Guns N Roses\n1, TV Themes, 100, ...'}
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
          />
          <Button variant="outlined" onClick={importCsv}>Import CSV text</Button>
        </Stack>
      </CardContent>
    </Card>
  );
};
