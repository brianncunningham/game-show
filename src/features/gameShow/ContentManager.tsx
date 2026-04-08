import { useMemo, useState } from 'react';
import { Button, Card, CardContent, Divider, Stack, TextField, Typography } from '@mui/material';
import { SAMPLE_QUESTIONS } from './sampleContent';
import type { GameShowQuestion } from './types';

interface ContentManagerProps {
  questions: GameShowQuestion[];
  onChange: (questions: GameShowQuestion[]) => void;
}

const createEmptyQuestion = (index: number): GameShowQuestion => ({
  id: `q${index + 1}`,
  category: '',
  songLabel: '',
  clipStart: 0,
  clipDuration: 15,
  basePoints: 100,
});

export const ContentManager = ({ questions, onChange }: ContentManagerProps) => {
  const [csvText, setCsvText] = useState('');

  const rows = useMemo(() => {
    return questions.length ? questions : [createEmptyQuestion(0), createEmptyQuestion(1)];
  }, [questions]);

  const updateQuestion = (questionId: string, patch: Partial<GameShowQuestion>) => {
    onChange(rows.map((question) => (question.id === questionId ? { ...question, ...patch } : question)));
  };

  const addQuestion = () => {
    onChange([...rows, createEmptyQuestion(rows.length)]);
  };

  const importCsv = () => {
    const parsed = csvText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [category = '', songLabel = '', clipStart = '0', clipDuration = '15', basePoints = '100'] = line.split(',');
        return {
          id: `q${index + 1}`,
          category: category.trim(),
          songLabel: songLabel.trim(),
          clipStart: Number(clipStart.trim()) || 0,
          clipDuration: Number(clipDuration.trim()) || 15,
          basePoints: Number(basePoints.trim()) || 100,
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
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => onChange(SAMPLE_QUESTIONS)}>
                Load sample pack
              </Button>
              <Button variant="contained" onClick={addQuestion}>
                Add question
              </Button>
            </Stack>
          </Stack>

          {rows.map((question) => (
            <Stack key={question.id} direction="row" spacing={2} flexWrap="wrap">
              <TextField
                label="Category"
                size="small"
                value={question.category}
                onChange={(event) => updateQuestion(question.id, { category: event.target.value })}
              />
              <TextField
                label="Song"
                size="small"
                value={question.songLabel}
                onChange={(event) => updateQuestion(question.id, { songLabel: event.target.value })}
              />
              <TextField
                label="Clip start"
                size="small"
                type="number"
                value={question.clipStart}
                onChange={(event) => updateQuestion(question.id, { clipStart: Number(event.target.value) || 0 })}
              />
              <TextField
                label="Duration"
                size="small"
                type="number"
                value={question.clipDuration}
                onChange={(event) => updateQuestion(question.id, { clipDuration: Number(event.target.value) || 15 })}
              />
              <TextField
                label="Base points"
                size="small"
                type="number"
                value={question.basePoints}
                onChange={(event) => updateQuestion(question.id, { basePoints: Number(event.target.value) || 100 })}
              />
            </Stack>
          ))}

          <Divider />

          <Typography variant="subtitle1">Quick CSV import</Typography>
          <Typography color="text.secondary">
            Format: category, song label, clipStart, clipDuration, basePoints
          </Typography>
          <TextField
            multiline
            minRows={4}
            placeholder="Warmup, Never Gonna Give You Up, 0, 15, 100"
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
          />
          <Button variant="outlined" onClick={importCsv}>Import CSV text</Button>
        </Stack>
      </CardContent>
    </Card>
  );
};
