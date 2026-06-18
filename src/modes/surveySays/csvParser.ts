import type { SurveyBoard, SurveyAnswer } from './types';

export function parseSurveyCSV(raw: string): SurveyBoard[] {
  const boards: SurveyBoard[] = [];
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

  for (const line of lines) {
    const fields = splitCSVLine(line);
    if (fields.length < 4) continue;

    const round = parseInt(fields[0] ?? '', 10);
    const question = fields[1]?.trim() ?? '';
    if (isNaN(round) || !question) continue;

    const answers: SurveyAnswer[] = [];
    let rank = 1;
    for (let i = 2; i + 1 < fields.length; i += 2) {
      const text = fields[i]?.trim() ?? '';
      const points = parseInt(fields[i + 1] ?? '', 10);
      if (!text || isNaN(points)) break;
      answers.push({ rank, text, points });
      rank++;
      if (rank > 8) break;
    }

    if (answers.length === 0) continue;

    boards.push({
      id: `board-${round}-${boards.length + 1}-${Date.now()}`,
      round,
      question,
      answers,
    });
  }

  return boards;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
