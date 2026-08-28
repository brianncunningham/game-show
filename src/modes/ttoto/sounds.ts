// TToTO sound effects — mirrors Survey Says's preload-cache + cloneNode-on-play pattern
// (SSShowComponent.tsx's SOUND_NAMES/soundCache/playSound): preloading avoids a
// perceptible pause between a visual cue and its sound on first trigger, and cloning the
// cached element lets overlapping triggers of the same sound play independently instead
// of cutting each other off.
//
// Every name below is a real /public/ttoto/sounds/<name>.mp3 this app expects to exist.
// Missing files are harmless no-ops (play() rejects, caught and ignored) — safe to wire
// up triggers before the actual audio assets are in place.
const SOUND_NAMES = [
  'miss-1', 'miss-2', 'miss-3', 'miss-4',   // wrong-answer glass crack/shatter — one pooled at random
  'reveal-splitflap', 'reveal-dotmatrix', 'reveal-segmented', // letter-display cascade, per display tech
  'correct',   // right answer given
  'victory',   // game-over winner fanfare
  'steal-window-open',   // TIMED_WINDOW's exclusive stage expires, opens to both teams
] as const;

const soundCache = new Map<string, HTMLAudioElement>();
for (const name of SOUND_NAMES) {
  const audio = new Audio(`/ttoto/sounds/${name}.mp3`);
  audio.preload = 'auto';
  audio.load();
  soundCache.set(name, audio);
}

const playSound = (name: string): void => {
  const cached = soundCache.get(name);
  const audio = cached ? (cached.cloneNode(true) as HTMLAudioElement) : new Audio(`/ttoto/sounds/${name}.mp3`);
  audio.play().catch(() => { /* file not dropped in yet, or autoplay-blocked — fine either way */ });
};

const MISS_SOUND_NAMES = ['miss-1', 'miss-2', 'miss-3', 'miss-4'] as const;

/** Wrong-answer crack sound — one of the 4 glass sounds, chosen independently from
 * whichever visual crack variant CrackOverlay/pickCrack() rolled (see store.ts's
 * pickCrack). Deliberately not paired 1:1 with the visual variant. */
export const playMissSound = (): void => {
  const name = MISS_SOUND_NAMES[Math.floor(Math.random() * MISS_SOUND_NAMES.length)];
  playSound(name);
};

const REVEAL_SOUND_BY_STYLE: Record<'split_flap' | 'dot_matrix' | 'segmented', string> = {
  split_flap: 'reveal-splitflap',
  dot_matrix: 'reveal-dotmatrix',
  segmented: 'reveal-segmented',
};

/** Letter-display cascade sound — matches whichever display technology the round rolled
 * (round.letterStyle), used both for answer-choice reveals and the round-intro flavor
 * reveal (same mechanism, see TToTOShowComponent.tsx). */
export const playRevealSound = (letterStyle: 'split_flap' | 'dot_matrix' | 'segmented'): void => {
  playSound(REVEAL_SOUND_BY_STYLE[letterStyle]);
};

export const playCorrectSound = (): void => playSound('correct');
export const playVictorySound = (): void => playSound('victory');

/** TIMED_WINDOW's exclusive stage just expired and opened to both teams. Deliberately no
 * sound on the exclusive stage starting — the miss/crack sound that triggers it already
 * covers that moment (see playMissSound) — and deliberately a gentler cue here than a
 * NTT-style "time's up" alarm: this is inviting both teams in, not a hard cutoff. */
export const playStealWindowOpenSound = (): void => playSound('steal-window-open');

/** Buzz-in confirmation — reuses the shared root /buzz.mp3 (already used by NTT/Survey
 * Says and TToTO's own wand-test overlay) rather than a new TToTO-specific file. */
export const playBuzzSound = (): void => {
  const audio = new Audio('/buzz.mp3');
  audio.play().catch(() => {});
};
