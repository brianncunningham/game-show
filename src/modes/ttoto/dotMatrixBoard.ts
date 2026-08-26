// Digital dot-matrix letter-display reveal effect (visual-notes §4b).
// The static CSS mask trick used for the *settled* glyph (mask-image over solid text)
// can't be randomized per-dot from JS, so the "warming up" reveal — the dot-matrix
// equivalent of split-flap's tile cascade / segmented's character scramble — is a small
// canvas: several frames of random on/off pixel noise across the grid, then the canvas
// locks onto the actual glyph's dot pattern (sampled from real rendered text), exactly
// reproducing the same 6px dot pitch look as the CSS version.

const DOT_PITCH = 5;      // px per cell — close to the CSS version's mask-size (visual-notes §4b)
const DOT_RADIUS = 1.7;
const OFF_ALPHA = 0.07;
const NOISE_DENSITY = 0.24; // fraction of cells "lit" per random noise frame

interface TargetGrid { cols: number; rows: number; lit: boolean[] }

/**
 * Renders `word` off-screen (supersampled 3x to smooth anti-aliasing) and downsamples it
 * to a boolean dot-lit grid at DOT_PITCH resolution by averaging each cell's block of
 * pixels — point-sampling a single pixel per cell is extremely sensitive to exactly where
 * a glyph's anti-aliased edge happens to fall, which produced illegible/noisy patterns.
 */
function computeTargetGrid(word: string, width: number, height: number): TargetGrid {
  const SS = 3; // supersample factor
  const sw = width * SS;
  const sh = height * SS;
  const off = document.createElement('canvas');
  off.width = sw;
  off.height = sh;
  const octx = off.getContext('2d')!;
  octx.fillStyle = '#000';
  octx.fillRect(0, 0, sw, sh);
  octx.font = `700 ${Math.floor(height * 0.62) * SS}px 'Share Tech Mono', monospace`;
  octx.fillStyle = '#fff';
  octx.textAlign = 'center';
  octx.textBaseline = 'middle';
  octx.fillText(word, sw / 2, sh / 2 + SS);

  const cols = Math.floor(width / DOT_PITCH);
  const rows = Math.floor(height / DOT_PITCH);
  const cellPx = DOT_PITCH * SS;
  const { data } = octx.getImageData(0, 0, sw, sh);
  const lit: boolean[] = new Array(cols * rows).fill(false);
  for (let ry = 0; ry < rows; ry++) {
    for (let rx = 0; rx < cols; rx++) {
      const x0 = rx * cellPx;
      const y0 = ry * cellPx;
      const x1 = Math.min(sw, x0 + cellPx);
      const y1 = Math.min(sh, y0 + cellPx);
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          sum += data[(y * sw + x) * 4]; // red channel — white text on black
          count++;
        }
      }
      lit[ry * cols + rx] = count > 0 && sum / count > 150;
    }
  }
  return { cols, rows, lit };
}

function drawGrid(
  ctx: CanvasRenderingContext2D, width: number, height: number,
  grid: TargetGrid | null, onColor: string, randomize: boolean,
): void {
  ctx.clearRect(0, 0, width, height);
  const cols = grid?.cols ?? Math.floor(width / DOT_PITCH);
  const rows = grid?.rows ?? Math.floor(height / DOT_PITCH);
  for (let ry = 0; ry < rows; ry++) {
    for (let rx = 0; rx < cols; rx++) {
      const lit = randomize ? Math.random() < NOISE_DENSITY : (grid?.lit[ry * cols + rx] ?? false);
      ctx.fillStyle = lit ? onColor : `rgba(77,255,240,${OFF_ALPHA})`;
      const cx = rx * DOT_PITCH + DOT_PITCH / 2;
      const cy = ry * DOT_PITCH + DOT_PITCH / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export interface DotMatrixHandle {
  /**
   * Runs the noise-then-resolve cascade, landing on `word`. `onSettled` fires right after
   * the canvas draws its own (approximate, thresholded) resolved glyph — callers use this
   * as the cue to hand off to the crisp, always-legible real-text rendering underneath,
   * since the canvas's sampled dot pattern is a flourish, not the resting display.
   */
  cascade(word: string, won?: boolean, onSettled?: () => void): void;
  /** Blanks the grid back to all-off, no animation. */
  reset(): void;
}

/** Sizes the canvas's backing store to its CSS pixel size and returns cascade/reset controls. */
export function setupDotMatrix(canvas: HTMLCanvasElement): DotMatrixHandle {
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  let timers: ReturnType<typeof setTimeout>[] = [];
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  return {
    cascade(word, won = false, onSettled) {
      clearTimers();
      const grid = computeTargetGrid(word, width, height);
      const color = won ? 'rgba(255,215,100,0.95)' : 'rgba(77,255,240,0.95)';
      const noiseFrames = 8 + Math.floor(Math.random() * 5); // 8-12, similar duration to the other two styles
      const frameMs = 60;
      for (let f = 0; f < noiseFrames; f++) {
        timers.push(setTimeout(() => drawGrid(ctx, width, height, grid, color, true), f * frameMs));
      }
      timers.push(setTimeout(() => {
        drawGrid(ctx, width, height, grid, color, false);
        onSettled?.();
      }, noiseFrames * frameMs));
    },
    reset() {
      clearTimers();
      ctx.clearRect(0, 0, width, height);
    },
  };
}
