import type { GameShowQuestion } from './types';

export const SAMPLE_QUESTIONS: GameShowQuestion[] = [
  { id: 'q1', category: 'Warmup', songLabel: 'Sample Song 1', clipStart: 0, clipDuration: 15, basePoints: 100 },
  { id: 'q2', category: 'Warmup', songLabel: 'Sample Song 2', clipStart: 15, clipDuration: 15, basePoints: 100 },
  { id: 'q3', category: 'TV Themes', songLabel: 'Sample Song 3', clipStart: 30, clipDuration: 20, basePoints: 200 },
  { id: 'q4', category: 'One Hit Wonders', songLabel: 'Sample Song 4', clipStart: 50, clipDuration: 20, basePoints: 200 },
  { id: 'q5', category: 'Movie Soundtracks', songLabel: 'Sample Song 5', clipStart: 70, clipDuration: 20, basePoints: 300 },
];
