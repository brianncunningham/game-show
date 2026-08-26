// Ported from docs/designs/reference-combo-screen.html's `window.TToTOFlipBoard` module
// (visual-notes §4d). Same mechanism: each tile is a 2-sided rotating card, one physical
// flip hands off front→back with no fade/gap. Kept as plain DOM manipulation (not
// React-driven per-frame state) because the "real Solari board" effect needs precise,
// independently-timed transitionend callbacks per tile — trying to model that as React
// state would fight the reconciler for no benefit.

export type LetterVariant = 'this' | 'that' | 'other';

export const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const randLetter = (exclude: string): string => {
  let c: string;
  do { c = CHARS[Math.floor(Math.random() * CHARS.length)]; } while (c === exclude);
  return c;
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export interface TileSize { width: number; height: number }

/** (Re)builds a row's tile markup for a given word length + color variant, all blank. */
export function buildFlapRow(
  rowEl: HTMLElement,
  wordLength: number,
  variant: LetterVariant,
  tileSize: TileSize = { width: 56, height: 94 },
): void {
  let html = '';
  for (let i = 0; i < wordLength; i++) {
    html += `<div class="ttoto-flap-cell" style="width:${tileSize.width}px; height:${tileSize.height}px;">` +
              '<div class="ttoto-flap-card">' +
                `<div class="face front face-${variant}">&ndash;</div>` +
                `<div class="face back face-${variant}">&ndash;</div>` +
              '</div>' +
            '</div>';
  }
  rowEl.innerHTML = html;
}

function flipTileTo(cell: Element, letter: string, durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    const card = cell.querySelector('.ttoto-flap-card') as HTMLElement;
    const front = cell.querySelector('.face.front') as HTMLElement;
    const back = cell.querySelector('.face.back') as HTMLElement;
    back.textContent = letter;
    card.style.transition = `transform ${durationMs}ms cubic-bezier(.36,.1,.2,1)`;
    void card.offsetWidth;
    card.style.transform = 'rotateX(-180deg)';

    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'transform') return;
      card.removeEventListener('transitionend', onEnd);
      card.style.transition = 'none';
      card.style.transform = 'rotateX(0deg)';
      void card.offsetWidth;
      front.textContent = letter;
      resolve();
    };
    card.addEventListener('transitionend', onEnd);
  });
}

async function runTile(
  cell: Element, target: string, stepMs: number, minSteps: number, maxSteps: number, startDelay: number,
): Promise<void> {
  await sleep(startDelay);
  const steps = minSteps + Math.floor(Math.random() * (maxSteps - minSteps + 1));
  let current = cell.querySelector('.face.front')?.textContent ?? '';
  for (let i = 0; i < steps; i++) {
    const letter = i === steps - 1 ? target : randLetter(current);
    await flipTileTo(cell, letter, stepMs);
    current = letter;
  }
}

export function resetFlapRow(rowEl: HTMLElement): void {
  rowEl.querySelectorAll('.ttoto-flap-cell').forEach((cell) => {
    const card = cell.querySelector('.ttoto-flap-card') as HTMLElement;
    card.style.transition = 'none';
    card.style.transform = 'rotateX(0deg)';
    (cell.querySelector('.face.front') as HTMLElement).textContent = '\u2013';
    (cell.querySelector('.face.back') as HTMLElement).textContent = '\u2013';
  });
}

export interface CascadeOpts {
  stepMs?: number;
  minSteps?: number;
  maxSteps?: number;
  maxStartDelay?: number;
}

/** Triggers the flip cascade to land on `word`. Call buildFlapRow() first if the tile count needs to change. */
export function cascadeFlapRow(rowEl: HTMLElement, word: string, opts: CascadeOpts = {}): void {
  const stepMs = opts.stepMs ?? 150;
  const minSteps = opts.minSteps ?? 5;
  const maxSteps = opts.maxSteps ?? 11;
  const maxStartDelay = opts.maxStartDelay ?? 260;
  const cells = rowEl.querySelectorAll('.ttoto-flap-cell');
  word.split('').forEach((ch, idx) => {
    if (!cells[idx]) return;
    const startDelay = Math.random() * maxStartDelay;
    void runTile(cells[idx], ch, stepMs, minSteps, maxSteps, startDelay);
  });
}
