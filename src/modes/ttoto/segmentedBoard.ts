// Hybrid-segmented letter-display reveal effect (visual-notes §4c).
// A segmented/LED display doesn't physically move like split-flap's rotating tiles —
// the analogous "reveal" mechanism recognizable from departure boards / terminal-decrypt
// displays is a fast per-character scramble: each character independently cycles through
// random glyphs, flickering, before locking onto its target letter at its own pace, so the
// row resolves character-by-character rather than all at once.

import { randLetter } from './letterBoard';

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** (Re)builds a row's per-character span markup for a given word length, all blank. */
export function buildSegmentedRow(rowEl: HTMLElement, wordLength: number): void {
  let html = '';
  for (let i = 0; i < wordLength; i++) {
    html += '<span class="ttoto-seg-char">\u2013</span>';
  }
  rowEl.innerHTML = html;
}

async function runChar(
  span: Element, target: string, stepMs: number, minSteps: number, maxSteps: number, startDelay: number,
): Promise<void> {
  await sleep(startDelay);
  const steps = minSteps + Math.floor(Math.random() * (maxSteps - minSteps + 1));
  let current = span.textContent ?? '';
  for (let i = 0; i < steps; i++) {
    const isLast = i === steps - 1;
    const letter = isLast ? target : randLetter(current);
    span.textContent = letter;
    if (!isLast) span.classList.add('ttoto-seg-flicker');
    await sleep(stepMs);
    span.classList.remove('ttoto-seg-flicker');
    current = letter;
  }
}

export function resetSegmentedRow(rowEl: HTMLElement): void {
  rowEl.querySelectorAll('.ttoto-seg-char').forEach((span) => {
    span.textContent = '\u2013';
    span.classList.remove('ttoto-seg-flicker');
  });
}

export interface SegmentedCascadeOpts {
  stepMs?: number;
  minSteps?: number;
  maxSteps?: number;
  maxStartDelay?: number;
}

/** Triggers the scramble cascade to land on `word`. Call buildSegmentedRow() first if the character count needs to change. */
export function cascadeSegmentedRow(rowEl: HTMLElement, word: string, opts: SegmentedCascadeOpts = {}): void {
  const stepMs = opts.stepMs ?? 55;       // faster than split-flap's 150ms — LED swaps are instant, not a physical flip
  const minSteps = opts.minSteps ?? 6;
  const maxSteps = opts.maxSteps ?? 14;
  const maxStartDelay = opts.maxStartDelay ?? 220;
  const spans = rowEl.querySelectorAll('.ttoto-seg-char');
  word.split('').forEach((ch, idx) => {
    if (!spans[idx]) return;
    const startDelay = Math.random() * maxStartDelay;
    void runChar(spans[idx], ch, stepMs, minSteps, maxSteps, startDelay);
  });
}
