// TToTO color system — single source of truth. Change a value here and it propagates
// everywhere: panel borders/tags/tiles, header/score plates, the logo/wordmark, the crack
// overlay, and the win-state flash all derive from these hexes (directly, or via the
// lighten/darken/rgba helpers below for gradients and glows) rather than hardcoding their
// own shades.
//
// Green/red/yellow are reserved for semantic meaning (correct / incorrect / warning) and
// must not be reused for team or choice identity, so a flash of one of those never gets
// misread as "this is Team 2's color" or "this panel is just orange, not actually a miss".
//
// This/That/TheOther are the mechanic players see on every single question, so they're
// optimized for maximum spread across genuinely different color families (cyan / orange /
// purple) rather than for matching another mode's team colors — an earlier version tried to
// exactly match Survey Says/Name That Tune's team hues, which used up the two widest-spread
// wheel positions and left This/That/TheOther crammed into a 30-50°-apart violet/magenta
// cluster that read as "not that different" in practice. Team colors are shown once in a
// header and matter less, so they're the ones that flex here instead.
export const TTOTO_COLORS = {
  // Reserved — semantic meaning only, never a team or choice identity color.
  correct: '#00ff88',    // matches Survey Says's existing active/success green
  incorrect: '#ff2020',  // matches Survey Says's and Name That Tune's existing wrong-answer red
  warning: '#ffe047',    // matches Name That Tune's existing yellow accent

  // Teams — not tied to matching other modes; picked to stay clear of the choice colors.
  team1: '#3b82f6',       // blue
  team2: '#ec4899',       // magenta/pink

  // Answer choices (fixed per slot, independent of which team is answering) — spread across
  // cyan/orange/purple for maximum at-a-glance distinction.
  this: '#22d3ee',        // cyan
  that: '#f97316',        // orange
  the_other: '#a855f7',   // purple
} as const;

export type TToTOChoiceColorKey = 'this' | 'that' | 'the_other';

// ─── Derivation helpers ──────────────────────────────────────────────────────
// Every gradient/glow shade used across the mode should go through these rather than
// hand-picking a "looks about right" hex, so the whole palette actually is a single source
// of truth in practice, not just in the base hues.

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const toHex = (n: number): string => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

/** rgba(...) string for a hex color at the given alpha — for glows/ambient backgrounds. */
export const rgba = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

/** Blends toward white by `amt` (0-1) — for gradient top-stops / lit faces. */
export const lighten = (hex: string, amt: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => c + (255 - c) * amt;
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
};

/** Blends toward black by `amt` (0-1) — for gradient bottom-stops / shadowed faces. */
export const darken = (hex: string, amt: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => c * (1 - amt);
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
};
