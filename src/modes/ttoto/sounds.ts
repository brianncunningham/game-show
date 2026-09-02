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
  'triage-alert',   // Triage only — a new item's prompt just appeared and buzzers are live
  'media-reveal',   // ID Please only — media (song/image) reveals, and every host replay
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

/** Triage only — fires every time a new item's prompt appears and buzzers go live in the
 * same instant (categories_shown -> armed for the first item, or resolved -> armed for
 * every one after). Deliberately distinct from playRevealSound: nothing is visually
 * re-cascading here (the category answers stay on screen the whole round), so the normal
 * letter-display reveal sound would be misleading — this is purely a "go" cue. */
export const playTriageAlertSound = (): void => playSound('triage-alert');

/** ID Please only — plays when media first reveals (reading -> media_shown) and again on
 * every host Replay tap (mediaReplaySeq bump), for both media types. Deliberately one
 * shared cue rather than per-type: it's announcing "look/listen now", not identifying
 * what kind of media it is (the host's on-screen badge already does that). */
export const playMediaRevealSound = (): void => playSound('media-reveal');

/** ID Please only, mediaType 'sound' — plays a question's own local sound-effect file
 * from public/ttoto/media/ (dropped in manually, same convention as image mediaRef).
 * Unlike the fixed cues above, this isn't a small preloadable set (it's arbitrary
 * per-question content), so no preload cache — just play it fresh each call. Used both
 * for the initial reveal and every host Replay, in place of playMediaRevealSound (the
 * sound effect itself IS the reveal — a generic chime first would just be noise). */
export const playMediaFile = (filename: string): void => {
  const audio = new Audio(`/ttoto/media/${filename}`);
  audio.play().catch(() => { /* file not dropped in yet, or autoplay-blocked — fine either way */ });
};

/** Buzz-in confirmation — reuses the shared root /buzz.mp3 (already used by NTT/Survey
 * Says and TToTO's own wand-test overlay) rather than a new TToTO-specific file. */
export const playBuzzSound = (): void => {
  const audio = new Audio('/buzz.mp3');
  audio.play().catch(() => {});
};
