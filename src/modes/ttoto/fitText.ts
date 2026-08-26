// Shared answer-fitting logic for the three letter-display techniques (split-flap,
// dot-matrix, segmented). All three previously sized tiles/characters at a fixed "full
// size" and let the row grow with word length — which, combined with the answer panels
// being flex:1 with no min-width override, let a long word (e.g. "VEGETABLE") force its
// own panel wider than its siblings instead of the text fitting a fixed panel. This
// inverts that: given a fixed available width and a word (or short phrase), decide how
// much to shrink from full size, and — only if shrinking alone still wouldn't fit — wrap
// onto a second line at a word boundary (never mid-word).

export interface FitResult {
  /** 1 or 2 lines to render. */
  lines: string[];
  /** 0-1 multiplier off the technique's own "full size" character metrics. */
  scale: number;
}

const MIN_SCALE = 0.55;

/** Best 2-line word-boundary split, minimizing the longer of the two resulting lines. */
function bestTwoLineSplit(words: string[]): [string, string] | null {
  if (words.length < 2) return null;
  let best: [string, string] | null = null;
  let bestMax = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const max = Math.max(a.length, b.length);
    if (max < bestMax) { bestMax = max; best = [a, b]; }
  }
  return best;
}

/**
 * @param word Already the exact text to display (callers upper-case first if needed).
 * @param availableWidth The fixed content width to fit within (px).
 * @param measureWidth Returns a line's rendered width at scale=1. For genuinely fixed-width
 *   grids (split-flap tiles, dot-matrix cells) this can just be `text.length * charWidth`,
 *   since that's exact by construction. For real font rendering (segmented's Share Tech
 *   Mono) use actual canvas text measurement instead of an assumed per-character ratio —
 *   an earlier version guessed a font-width-to-em ratio for segmented and undershot badly
 *   enough that long answers overflowed instead of ever triggering the wrap path.
 */
export function fitTextToWidth(word: string, availableWidth: number, measureWidth: (text: string) => number): FitResult {
  if (word.length === 0) return { lines: [word], scale: 1 };

  const oneLineScale = availableWidth / measureWidth(word);
  if (oneLineScale >= 1) return { lines: [word], scale: 1 };
  if (oneLineScale >= MIN_SCALE) return { lines: [word], scale: oneLineScale };

  // Single line would need to shrink past the legibility floor — try wrapping at a word
  // boundary instead.
  const split = bestTwoLineSplit(word.split(' '));
  if (!split) return { lines: [word], scale: MIN_SCALE }; // no space to wrap on; best effort

  const longerWidth = Math.max(measureWidth(split[0]), measureWidth(split[1]));
  const twoLineScale = Math.min(1, availableWidth / longerWidth);
  return { lines: [split[0], split[1]], scale: Math.max(twoLineScale, MIN_SCALE) };
}

/** measureWidth for genuinely fixed-width grids (split-flap tiles, dot-matrix cells). */
export const fixedCharWidth = (charWidth: number) => (text: string): number => text.length * charWidth;
