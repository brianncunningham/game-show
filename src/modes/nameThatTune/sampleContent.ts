import type { GameShowQuestion } from './types';

const emptySongs = () => [
  { title: '', artist: '' },
  { title: '', artist: '' },
  { title: '', artist: '' },
];

export const SAMPLE_QUESTIONS: GameShowQuestion[] = [
  { id: 'r1q1', round: 1, category: 'Warmup', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r1q2', round: 1, category: 'TV Themes', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r1q3', round: 1, category: 'One Hit Wonders', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r1q4', round: 1, category: 'Movie Soundtracks', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r1q5', round: 1, category: 'From the 80s', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r2q1', round: 2, category: 'Pop Hits', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r2q2', round: 2, category: 'Rock Anthems', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r2q3', round: 2, category: 'Country', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r2q4', round: 2, category: 'Hip Hop', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r2q5', round: 2, category: 'In the Movies', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r3q1', round: 3, category: 'Oldies', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r3q2', round: 3, category: 'Disney', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r3q3', round: 3, category: 'Dance Classics', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r3q4', round: 3, category: 'Power Ballads', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
  { id: 'r3q5', round: 3, category: 'Guilty Pleasures', songLabel: '', songs: emptySongs(), clipStart: 0, clipDuration: 0, basePoints: 100 },
];
