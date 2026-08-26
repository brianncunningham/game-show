import { useCallback, useEffect, useRef, useState } from 'react';
import { getState } from './api';
import type { TToTOState, TToTOChoiceKey, LetterStyle, TToTORound } from './types';
import { FLAVOR_LABELS } from './types';
import { buildFlapRow, cascadeFlapRow, resetFlapRow, type LetterVariant } from './letterBoard';
import { buildSegmentedRow, cascadeSegmentedRow, resetSegmentedRow } from './segmentedBoard';
import { setupDotMatrix, type DotMatrixHandle } from './dotMatrixBoard';
import { CrackOverlay } from './CrackOverlay';
import { TToTOGameIntro } from './TToTOGameIntro';
import { TToTOStage } from './TToTOStage';
import { TTOTO_COLORS, lighten, darken, rgba } from './colors';
import { useGameEventOverlay, GameEventOverlay } from './GameOverlays';
import { fitTextToWidth, fixedCharWidth } from './fitText';

// Fixed content width all 3 answer panels share (see the answer-panel flex fix below) —
// 1600 stage minus 64px outer margin minus 40px of inter-panel gap, split 3 ways, minus
// each panel's own 22px×2 padding. The three letter-display techniques size themselves to
// fit within this rather than the panel growing to fit them.
const ANSWER_PANEL_CONTENT_WIDTH = 450;

// ─── Global CSS (ported from docs/designs/reference-combo-screen.html + LetterStyles.dc.html) ──
// Gradient/glow shades below are all *derived* from TTOTO_COLORS via lighten/darken/rgba —
// changing a base hex in colors.ts is enough to re-tint the whole mode, nothing here is a
// separately hand-picked shade.

const GLOBAL_CSS = `
  .ttoto-a-panel { clip-path: polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px); }
  .ttoto-a-tag { clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 100%, 0 100%); }
  .ttoto-a-bracket-tr { position:absolute; top:16px; right:16px; width:26px; height:26px; }
  .ttoto-a-bracket-bl { position:absolute; bottom:16px; left:16px; width:26px; height:26px; }
  .ttoto-score-plate { clip-path: polygon(14px 0, 100% 0, 100% 100%, 0 100%, 0 14px); position:relative; padding:14px 26px 12px 26px; min-width:190px; }

  .ttoto-flap-row { display:flex; justify-content:center; }
  .ttoto-flap-cell { position:relative; border-radius:3px; filter: drop-shadow(0 4px 3px rgba(0,0,0,0.45)); perspective:340px; }
  .ttoto-flap-cell::after { content:""; position:absolute; left:0; right:0; top:50%; height:2px; background:rgba(0,0,0,0.5); transform:translateY(-1px); z-index:5; pointer-events:none; }
  .ttoto-flap-card { position:absolute; inset:0; transform-style:preserve-3d; transform:rotateX(0deg); }
  .ttoto-flap-cell .face { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-family:'Barlow Condensed', sans-serif; font-weight:700; font-size:32px; border-radius:3px; backface-visibility:hidden; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4); }
  .ttoto-flap-cell .face.front { transform:rotateX(0deg); }
  .ttoto-flap-cell .face.back  { transform:rotateX(180deg); }
  .ttoto-flap-cell .face-this  { background:linear-gradient(to bottom,${lighten(TTOTO_COLORS.this, 0.35)} 0 50%,${darken(TTOTO_COLORS.this, 0.25)} 50% 100%); color:#f2f5fb; }
  .ttoto-flap-cell .face-that  { background:linear-gradient(to bottom,${lighten(TTOTO_COLORS.that, 0.35)} 0 50%,${darken(TTOTO_COLORS.that, 0.15)} 50% 100%); color:#2a0a00; }
  .ttoto-flap-cell .face-other { background:linear-gradient(to bottom,${lighten(TTOTO_COLORS.the_other, 0.35)} 0 50%,${darken(TTOTO_COLORS.the_other, 0.25)} 50% 100%); color:#f2f5fb; }
  /* Win state: green (reserved for "correct") replaces the panel's own identity color. */
  .ttoto-win-correct .face { background:linear-gradient(to bottom,${lighten(TTOTO_COLORS.correct, 0.4)} 0 50%,${darken(TTOTO_COLORS.correct, 0.35)} 50% 100%) !important; color:#052e16 !important; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4), 0 0 22px 3px ${rgba(TTOTO_COLORS.correct, 0.55)} !important; }

  .ttoto-dotmatrix-panel { background:#04100e; border:1px solid #123028; padding:14px 18px; position:relative; display:inline-block;
    background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1.4px); background-size: 6px 6px;
    filter: drop-shadow(0 0 8px rgba(77,255,240,0.35)); }
  .ttoto-dotmatrix-stack { position:relative; display:block; }
  /* The canvas plays the noise-then-approximate-resolve flourish; once settled, it fades
     out and the crisp always-legible real-text layer (CSS mask trick) fades in on top of
     it — the canvas's thresholded glyph sampling is great for the animated build-up but
     isn't reliably legible as a resting state, so we hand off to real font rendering. */
  .ttoto-dotmatrix-canvas { display: block; transition: opacity 0.18s ease; }
  .ttoto-dotmatrix-canvas.settled { opacity: 0; }
  .ttoto-dotmatrix-text { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
    font-family:'Share Tech Mono', monospace; font-weight:700; letter-spacing:6px; color:#4dfff0;
    text-shadow: 0 0 5px rgba(77,255,240,0.95), 0 0 16px rgba(77,255,240,0.7), 0 0 34px rgba(77,255,240,0.4);
    -webkit-mask-image: radial-gradient(circle, #000 42%, transparent 46%); mask-image: radial-gradient(circle, #000 42%, transparent 46%);
    -webkit-mask-size: 5px 5px; mask-size: 5px 5px; -webkit-mask-repeat: repeat; mask-repeat: repeat;
    opacity: 0; transition: opacity 0.18s ease; white-space: nowrap; }
  .ttoto-dotmatrix-text.settled { opacity: 1; }
  .ttoto-dotmatrix-text.won { color:${TTOTO_COLORS.correct}; text-shadow: 0 0 6px ${rgba(TTOTO_COLORS.correct, 0.95)}, 0 0 20px ${rgba(TTOTO_COLORS.correct, 0.7)}; }

  .ttoto-segment-panel { background:#170905; border:1px solid #3a1408; padding:14px 18px; position:relative; display:inline-block; }
  .ttoto-segment-stack { position:relative; display:inline-block; }
  .ttoto-segment-ghost { font-family:'Share Tech Mono', monospace; font-size:clamp(20px, 3.2vw, 38px); letter-spacing:6px; color:#5a2818; position:absolute; inset:0; user-select:none; white-space: nowrap; }
  .ttoto-segment-lit { font-family:'Share Tech Mono', monospace; font-size:clamp(20px, 3.2vw, 38px); color:#ff6a3d; position:relative;
    text-shadow: 0 0 6px rgba(255,106,61,0.9), 0 0 20px rgba(255,106,61,0.6), 0 0 40px rgba(255,106,61,0.28);
    white-space: nowrap; display:inline-flex; gap:6px; }
  .ttoto-segment-lit.won { color:${TTOTO_COLORS.correct}; text-shadow: 0 0 6px ${rgba(TTOTO_COLORS.correct, 0.95)}, 0 0 20px ${rgba(TTOTO_COLORS.correct, 0.7)}; }
  /* Fast per-character scramble-then-resolve (departure-board / terminal-decrypt style) —
     the segmented display's equivalent of split-flap's tile cascade. */
  .ttoto-seg-char { transition: opacity 0.05s linear, filter 0.05s linear; }
  .ttoto-seg-flicker { opacity:0.32; filter:brightness(2.4); }
`;

const multiplierForRound = (roundMultipliers: number[], roundIndex: number): number =>
  roundMultipliers[roundIndex] ?? roundMultipliers[roundMultipliers.length - 1] ?? 1;

const CHOICE_ORDER: TToTOChoiceKey[] = ['this', 'that', 'the_other'];
const CHOICE_VARIANT: Record<TToTOChoiceKey, LetterVariant> = { this: 'this', that: 'that', the_other: 'other' };
const CHOICE_COLOR: Record<TToTOChoiceKey, string> = { this: TTOTO_COLORS.this, that: TTOTO_COLORS.that, the_other: TTOTO_COLORS.the_other };
const CHOICE_TAG_BG = CHOICE_COLOR;
const CHOICE_LABEL: Record<TToTOChoiceKey, string> = { this: 'THIS', that: 'THAT', the_other: 'THE OTHER' };

// ─── Split-flap row (imperative DOM cascade) ────────────────────────────────

const FLAP_FULL_TILE = { width: 52, height: 86 }; // historical default = scale 1
const FLAP_FULL_CHAR_WIDTH = FLAP_FULL_TILE.width + 6; // + the row's tile gap

function SplitFlapRow({ variant, word, revealed, won }: { variant: LetterVariant; word: string; revealed: boolean; won: boolean }) {
  const line1Ref = useRef<HTMLDivElement | null>(null);
  const line2Ref = useRef<HTMLDivElement | null>(null);
  const builtKeyRef = useRef<string>('');
  const prevRevealedRef = useRef<boolean>(false);

  const upper = word.toUpperCase();
  const fit = fitTextToWidth(upper, ANSWER_PANEL_CONTENT_WIDTH, fixedCharWidth(FLAP_FULL_CHAR_WIDTH));
  const tileSize = { width: Math.round(FLAP_FULL_TILE.width * fit.scale), height: Math.round(FLAP_FULL_TILE.height * fit.scale) };
  const buildKey = fit.lines.join('|');

  useEffect(() => {
    const el1 = line1Ref.current;
    if (!el1) return;
    if (builtKeyRef.current !== buildKey) {
      buildFlapRow(el1, fit.lines[0].length, variant, tileSize);
      if (fit.lines[1] !== undefined && line2Ref.current) buildFlapRow(line2Ref.current, fit.lines[1].length, variant, tileSize);
      builtKeyRef.current = buildKey;
      prevRevealedRef.current = false;
    }
    if (revealed && !prevRevealedRef.current) {
      cascadeFlapRow(el1, fit.lines[0]);
      if (fit.lines[1] !== undefined && line2Ref.current) cascadeFlapRow(line2Ref.current, fit.lines[1]);
    } else if (!revealed) {
      resetFlapRow(el1);
      if (line2Ref.current) resetFlapRow(line2Ref.current);
    }
    prevRevealedRef.current = revealed;
    // fit/tileSize are derived deterministically from buildKey (same word -> same lines ->
    // same scale), so gating the rebuild on buildKey alone is sufficient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildKey, revealed, variant]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <div ref={line1Ref} className={`ttoto-flap-row${won ? ' ttoto-win-correct' : ''}`} style={{ gap: 6 }} />
      {fit.lines[1] !== undefined && (
        <div ref={line2Ref} className={`ttoto-flap-row${won ? ' ttoto-win-correct' : ''}`} style={{ gap: 6 }} />
      )}
    </div>
  );
}

const DOT_FULL_CHAR_WIDTH = 50; // historical default = scale 1

/** One line of dot-matrix (own canvas + settled-text overlay). DotMatrixRow renders 1 or 2. */
function DotMatrixLine({ word, width, height, revealed, won }: {
  word: string; width: number; height: number; revealed: boolean; won: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<DotMatrixHandle | null>(null);
  const builtKeyRef = useRef<string>('');
  const prevRevealedRef = useRef<boolean>(false);
  const prevWonRef = useRef<boolean>(false);
  // The canvas plays the noise-then-approximate-resolve flourish; once it settles we cross-
  // fade to the crisp real-text layer underneath (see CSS) for the actual resting display.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const buildKey = `${width}x${height}`;
    if (builtKeyRef.current !== buildKey) {
      handleRef.current = setupDotMatrix(el);
      builtKeyRef.current = buildKey;
      prevRevealedRef.current = false;
      prevWonRef.current = false;
    }
    const handle = handleRef.current;
    if (!handle) return;
    if (revealed && (!prevRevealedRef.current || (won && !prevWonRef.current))) {
      setSettled(false);
      handle.cascade(word, won, () => setSettled(true));
    } else if (!revealed) {
      setSettled(false);
      handle.reset();
    }
    prevRevealedRef.current = revealed;
    prevWonRef.current = won;
  }, [word, width, height, revealed, won]);

  return (
    <div className="ttoto-dotmatrix-stack" style={{ width, height }}>
      <canvas ref={canvasRef} className={`ttoto-dotmatrix-canvas${settled ? ' settled' : ''}`} style={{ width, height }} />
      <div className={`ttoto-dotmatrix-text${settled ? ' settled' : ''}${won ? ' won' : ''}`} style={{ fontSize: Math.round(height * 0.5) }}>
        {word}
      </div>
    </div>
  );
}

function DotMatrixRow({ word, revealed, won }: { word: string; revealed: boolean; won: boolean }) {
  const upper = word.toUpperCase();
  const fit = fitTextToWidth(upper, ANSWER_PANEL_CONTENT_WIDTH, fixedCharWidth(DOT_FULL_CHAR_WIDTH));
  const height = Math.round(84 * fit.scale);

  return (
    <div className="ttoto-dotmatrix-panel">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
        <DotMatrixLine
          word={fit.lines[0]} width={Math.round(Math.max(fit.lines[0].length, 1) * DOT_FULL_CHAR_WIDTH * fit.scale)}
          height={height} revealed={revealed} won={won}
        />
        {fit.lines[1] !== undefined && (
          <DotMatrixLine
            word={fit.lines[1]} width={Math.round(Math.max(fit.lines[1].length, 1) * DOT_FULL_CHAR_WIDTH * fit.scale)}
            height={height} revealed={revealed} won={won}
          />
        )}
      </div>
    </div>
  );
}

// The clamp()-based CSS font-size (see .ttoto-segment-ghost/.ttoto-segment-lit) is a
// viewport-relative fallback; these constants are that same max size (38px font, 6px
// letter-spacing), and the computed fontSize/letterSpacing below are passed inline (which
// wins over the CSS clamp).
const SEGMENTED_FULL_FONT_SIZE = 38;
const SEGMENTED_FULL_LETTER_SPACING = 6;

// Real text measurement rather than an assumed font-width-to-em ratio — Share Tech Mono
// turned out to render noticeably wider than a guessed ratio accounted for, which silently
// undershot the needed shrink/wrap and let long answers overflow instead.
let segmentMeasureCanvas: HTMLCanvasElement | null = null;
function measureSegmentedWidth(text: string): number {
  if (!segmentMeasureCanvas) segmentMeasureCanvas = document.createElement('canvas');
  const ctx = segmentMeasureCanvas.getContext('2d')!;
  ctx.font = `${SEGMENTED_FULL_FONT_SIZE}px 'Share Tech Mono', monospace`;
  // The lit row (segmentedBoard.ts) renders one <span> per character inside a flex
  // container with `gap`, not plain text with letter-spacing — N-1 gaps between N
  // characters, not N. Getting this wrong (treating it as letter-spacing / N gaps) was
  // the actual bug: that fixed CSS `gap` doesn't shrink with our scale unless we override
  // it inline too (done below in SegmentedLine), and mismodeling it here made long answers
  // silently under-shrink/never wrap instead of just looking slightly off.
  return ctx.measureText(text).width + SEGMENTED_FULL_LETTER_SPACING * Math.max(text.length - 1, 0);
}

/** One line of segmented display. SegmentedRow renders 1 or 2. */
function SegmentedLine({ word, fontSize, letterSpacing, revealed, won }: {
  word: string; fontSize: number; letterSpacing: number; revealed: boolean; won: boolean;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const builtLenRef = useRef<number>(-1);
  const prevRevealedRef = useRef<boolean>(false);
  const ghost = '8'.repeat(Math.max(word.length, 1));

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    if (builtLenRef.current !== word.length) {
      buildSegmentedRow(el, word.length);
      builtLenRef.current = word.length;
      prevRevealedRef.current = false;
    }
    if (revealed && !prevRevealedRef.current) {
      cascadeSegmentedRow(el, word);
    } else if (!revealed) {
      resetSegmentedRow(el);
    }
    prevRevealedRef.current = revealed;
  }, [word, revealed]);

  return (
    <div className="ttoto-segment-stack">
      <div className="ttoto-segment-ghost" style={{ fontSize, letterSpacing }}>{ghost}</div>
      {/* .ttoto-segment-lit is display:inline-flex with a per-character `gap` (one <span>
          per char, for the scramble animation) — that's the property that actually needs
          to scale, not letter-spacing (which has no effect between separate flex children). */}
      <div ref={rowRef} className={`ttoto-segment-lit${won ? ' won' : ''}`} style={{ fontSize, gap: letterSpacing }} />
    </div>
  );
}

function SegmentedRow({ word, revealed, won }: { word: string; revealed: boolean; won: boolean }) {
  const upper = word.toUpperCase();
  const fit = fitTextToWidth(upper, ANSWER_PANEL_CONTENT_WIDTH, measureSegmentedWidth);
  const fontSize = Math.round(SEGMENTED_FULL_FONT_SIZE * fit.scale);
  const letterSpacing = Math.round(SEGMENTED_FULL_LETTER_SPACING * fit.scale);

  return (
    <div className="ttoto-segment-panel">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        <SegmentedLine word={fit.lines[0]} fontSize={fontSize} letterSpacing={letterSpacing} revealed={revealed} won={won} />
        {fit.lines[1] !== undefined && (
          <SegmentedLine word={fit.lines[1]} fontSize={fontSize} letterSpacing={letterSpacing} revealed={revealed} won={won} />
        )}
      </div>
    </div>
  );
}

function LetterRow({ letterStyle, choice, word, revealed, won }: {
  letterStyle: LetterStyle; choice: TToTOChoiceKey; word: string; revealed: boolean; won: boolean;
}) {
  if (letterStyle === 'dot_matrix') return <DotMatrixRow word={word} revealed={revealed} won={won} />;
  if (letterStyle === 'segmented') return <SegmentedRow word={word} revealed={revealed} won={won} />;
  return <SplitFlapRow variant={CHOICE_VARIANT[choice]} word={word} revealed={revealed} won={won} />;
}

// ─── Round-intro card ────────────────────────────────────────────────────────

/** Only rendered when a round is worth more (or less) than the default ×1 — see multiplierForRound(). */
function MultiplierBadge({ multiplier, fontSize = 16 }: { multiplier: number; fontSize?: number }) {
  return (
    <div className="ttoto-a-tag" style={{
      background: TTOTO_COLORS.warning, color: '#2e2200', fontSize, fontWeight: 800, letterSpacing: 3,
      padding: `${Math.round(fontSize * 0.4)}px ${Math.round(fontSize * 1.4)}px ${Math.round(fontSize * 0.4)}px ${Math.round(fontSize * 0.9)}px`,
      boxShadow: `0 0 18px ${rgba(TTOTO_COLORS.warning, 0.5)}`,
    }}>
      ×{multiplier} POINTS
    </div>
  );
}

function RoundIntroScreen({ round, multiplier }: { round: TToTORound | undefined; multiplier: number }) {
  return (
    <TToTOStage>
      <div style={{
        width: 1600, height: 900,
        background: 'linear-gradient(135deg, #0a3145 0%, #12233f 32%, #1c1030 68%, #12070f 100%)',
        fontFamily: "'Barlow Condensed', system-ui, sans-serif", color: '#f2f5fb',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
      }}>
        <div className="ttoto-a-tag" style={{ background: '#c7d4ea', color: '#0d1b2e', fontSize: 20, fontWeight: 700, letterSpacing: 4, padding: '8px 30px 8px 18px' }}>
          ROUND {round?.roundNumber ?? '—'}
        </div>
        <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 100, letterSpacing: 1, textShadow: '0 0 30px rgba(199,212,234,0.5)', textAlign: 'center' }}>
          {round ? FLAVOR_LABELS[round.flavor].toUpperCase() : ''}
        </div>
        {multiplier !== 1 && <MultiplierBadge multiplier={multiplier} fontSize={22} />}
      </div>
    </TToTOStage>
  );
}

// ─── Game-over screen ────────────────────────────────────────────────────────

function GameOverScreen({ state }: { state: TToTOState }) {
  const [t1, t2] = state.teams;
  const winner = t1.score === t2.score ? null : (t1.score > t2.score ? t1 : t2);
  return (
    <TToTOStage>
      <div style={{
        width: 1600, height: 900,
        background: 'linear-gradient(135deg, #0a3145 0%, #12233f 32%, #1c1030 68%, #12070f 100%)',
        fontFamily: "'Barlow Condensed', system-ui, sans-serif", color: '#f2f5fb',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
      }}>
        <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 72, letterSpacing: 2, color: '#f2f5fb', textShadow: '0 0 30px rgba(242,245,251,0.4)' }}>
          GAME OVER
        </div>
        <div style={{ display: 'flex', gap: 60 }}>
          {state.teams.map((t) => (
            <div key={t.id} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, letterSpacing: 3, color: winner?.id === t.id ? TTOTO_COLORS.correct : '#8ea3c4' }}>{t.name}</div>
              <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 88 }}>{t.score}</div>
            </div>
          ))}
        </div>
        {winner && (
          <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 32, color: TTOTO_COLORS.correct, textShadow: `0 0 20px ${rgba(TTOTO_COLORS.correct, 0.5)}` }}>
            {winner.name} WINS!
          </div>
        )}
      </div>
    </TToTOStage>
  );
}

// ─── Main combo screen (header + question + 3 answer panels) ───────────────

function ComboScreen({ state }: { state: TToTOState }) {
  const { roundState, teams, rounds, config } = state;
  const round = rounds[roundState.currentRoundIndex];
  const question = round?.questions[roundState.currentQuestionIndex];
  const letterStyle: LetterStyle = round?.letterStyle ?? 'split_flap';
  const multiplier = multiplierForRound(config.roundMultipliers, roundState.currentRoundIndex);

  const choicesRevealed = roundState.phase === 'armed' || roundState.phase === 'answering'
    || roundState.phase === 'steal' || roundState.phase === 'resolved';

  const answeringTeam = teams.find(t => t.id === roundState.answeringTeamId);
  const [overlayEvent, clearOverlayEvent] = useGameEventOverlay(
    roundState.phase, roundState.resolvedCorrectly, roundState.answeringTeamId, teams,
  );

  // 'reading' and 'armed' show no status text — the prompt/choices alone are the whole cue.
  // 'answering' also shows nothing: there's no clock/countdown for the initial answer (only
  // the exclusive steal has a time-pressure concept), so avoid implying one with copy like
  // "on the clock" — the buzz-in overlay already announced who's up.
  let statusText = '';
  if (roundState.phase === 'steal') statusText = `${answeringTeam?.name ?? ''} — STEALING`;
  else if (roundState.phase === 'resolved') {
    statusText = roundState.resolvedCorrectly
      ? `${answeringTeam?.name ?? ''} GOT IT!`
      : `NOBODY GOT IT — it was ${roundState.correctChoice ? CHOICE_LABEL[roundState.correctChoice] : ''}`;
  }

  return (
    <TToTOStage>
    <div style={{
      width: 1600, height: 900,
      background: 'linear-gradient(135deg, #0a3145 0%, #12233f 32%, #1c1030 68%, #12070f 100%)',
      fontFamily: "'Barlow Condensed', system-ui, sans-serif", color: '#f2f5fb', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, backgroundImage:
          `radial-gradient(circle at 12% 90%, ${rgba(TTOTO_COLORS.this, 0.28)}, transparent 46%),` +
          `radial-gradient(circle at 90% 8%, ${rgba(TTOTO_COLORS.that, 0.24)}, transparent 46%),` +
          `radial-gradient(circle at 92% 90%, ${rgba(TTOTO_COLORS.the_other, 0.22)}, transparent 42%),` +
          'repeating-linear-gradient(0deg, rgba(140,190,220,0.07) 0px, rgba(140,190,220,0.07) 1px, transparent 1px, transparent 64px),' +
          'repeating-linear-gradient(90deg, rgba(140,190,220,0.07) 0px, rgba(140,190,220,0.07) 1px, transparent 1px, transparent 64px)',
      }} />
      <div style={{ position: 'relative', height: 12, background: `linear-gradient(90deg, ${TTOTO_COLORS.this}, ${TTOTO_COLORS.that}, ${TTOTO_COLORS.the_other})`, boxShadow: `0 0 22px ${rgba(TTOTO_COLORS.that, 0.3)}` }} />

      {/* Header */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px 0 32px' }}>
        <div className="ttoto-score-plate" style={{ background: `linear-gradient(160deg, ${darken(TTOTO_COLORS.team1, 0.75)}, ${darken(TTOTO_COLORS.team1, 0.88)})`, border: `2px solid ${TTOTO_COLORS.team1}`, boxShadow: `0 0 30px ${rgba(TTOTO_COLORS.team1, 0.28)}` }}>
          <div style={{ fontSize: 16, letterSpacing: 3, color: lighten(TTOTO_COLORS.team1, 0.55) }}>{teams[0].name.toUpperCase()}</div>
          <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 92, lineHeight: 0.95, color: '#fff', textShadow: `0 0 26px ${rgba(TTOTO_COLORS.team1, 0.6)}` }}>{teams[0].score}</div>
        </div>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width={52} height={52} viewBox="0 0 64 64" style={{ flex: 'none' }}>
              <g strokeWidth={7} strokeLinecap="round" fill="none">
                <path d="M14 12 L34 32 L14 52" stroke={TTOTO_COLORS.this} transform="rotate(0 32 32)" />
                <path d="M14 12 L34 32 L14 52" stroke={TTOTO_COLORS.that} transform="rotate(120 32 32)" />
                <path d="M14 12 L34 32 L14 52" stroke={TTOTO_COLORS.the_other} transform="rotate(240 32 32)" />
              </g>
            </svg>
            <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 56, letterSpacing: 1, lineHeight: 1 }}>
              <span style={{ color: TTOTO_COLORS.this }}>T</span><span style={{ color: TTOTO_COLORS.that }}>T</span>
              <span style={{ color: '#c7d4ea', fontSize: '0.68em' }}>o</span>
              <span style={{ color: '#f2f5fb' }}>T</span><span style={{ color: TTOTO_COLORS.the_other }}>O</span>
            </div>
          </div>
          {/* Multiplier sits inline with the round tag rather than as its own stacked row —
              this card's height feeds directly into where the question/answer panels land
              in the fixed 1600x900 stage below, so an extra row here pushes them past the
              bottom edge instead of just growing the (non-existent) available space. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <div className="ttoto-a-tag" style={{ background: '#c7d4ea', color: '#0d1b2e', fontSize: 13, fontWeight: 700, letterSpacing: 3, padding: '5px 20px 5px 12px' }}>
              ROUND {round?.roundNumber ?? '—'}
            </div>
            {multiplier !== 1 && <MultiplierBadge multiplier={multiplier} fontSize={13} />}
          </div>
          <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 32, letterSpacing: 1, color: '#fff', textShadow: '0 0 24px rgba(199,212,234,0.5)' }}>
            {round ? FLAVOR_LABELS[round.flavor].toUpperCase() : ''}
          </div>
        </div>

        <div className="ttoto-score-plate" style={{ background: `linear-gradient(160deg, ${darken(TTOTO_COLORS.team2, 0.72)}, ${darken(TTOTO_COLORS.team2, 0.86)})`, border: `2px solid ${TTOTO_COLORS.team2}`, boxShadow: `0 0 30px ${rgba(TTOTO_COLORS.team2, 0.28)}`, textAlign: 'right' }}>
          <div style={{ fontSize: 16, letterSpacing: 3, color: lighten(TTOTO_COLORS.team2, 0.45) }}>{teams[1].name.toUpperCase()}</div>
          <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 92, lineHeight: 0.95, color: '#fff', textShadow: `0 0 26px ${rgba(TTOTO_COLORS.team2, 0.6)}` }}>{teams[1].score}</div>
        </div>
      </div>

      {/* Question panel */}
      <div className="ttoto-a-panel" style={{
        position: 'relative', margin: '20px 32px 0 32px',
        background: 'linear-gradient(125deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 32%), linear-gradient(90deg, #16324a, #1c2540)',
        border: '1px solid #4a6a95', boxShadow: '0 0 26px rgba(120,170,230,0.2)', padding: '16px 28px 20px 28px',
      }}>
        <div className="ttoto-a-tag" style={{ background: '#c7d4ea', color: '#0d1b2e', fontSize: 13, fontWeight: 800, letterSpacing: 3, padding: '5px 18px 5px 12px', display: 'inline-block', marginBottom: 10 }}>
          QUESTION
        </div>
        <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 32, letterSpacing: 0.5, textAlign: 'center', color: '#fff' }}>
          {question ? question.prompt.toUpperCase() : ''}
        </div>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 15, letterSpacing: 2, color: '#c7d4ea', minHeight: 20 }}>
          {statusText}
        </div>
      </div>

      {/* Answer panels */}
      <div style={{ position: 'relative', display: 'flex', gap: 20, margin: '18px 32px 0 32px', height: 460 }}>
        {CHOICE_ORDER.map((choice) => {
          const missed = roundState.eliminatedChoices.includes(choice);
          const resolved = roundState.phase === 'resolved';
          const correct = resolved && roundState.correctChoice === choice;
          // Once resolved, every panel that isn't the correct one recedes — whether it was
          // actively missed or simply never chosen — so the winner reads unambiguously at a
          // glance instead of competing for attention with two still-bright panels.
          const recede = resolved && !correct;
          const crack = roundState.choiceCracks[choice];
          const color = CHOICE_COLOR[choice];
          const word = roundState.displayChoices?.[choice] ?? '';
          const borderColor = correct ? TTOTO_COLORS.correct : missed ? TTOTO_COLORS.incorrect : color;

          return (
            <div key={choice} className="ttoto-a-panel" style={{
              // flex-basis:0 + minWidth:0 makes all 3 panels genuinely equal width — without
              // minWidth:0, a flex item's default min-width is its content's intrinsic
              // min-content size, so a long word (e.g. "VEGETABLE") would force its own
              // panel wider than its siblings instead of the content fitting the panel (see
              // ANSWER_PANEL_CONTENT_WIDTH / fitTextToWidth, which size the content the
              // other way around).
              flex: '1 1 0', minWidth: 0,
              position: 'relative', padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              background: correct
                ? `linear-gradient(125deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 36%), linear-gradient(160deg, ${rgba(TTOTO_COLORS.correct, 0.22)}, #0a1c28)`
                : missed
                  ? 'linear-gradient(125deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 36%), linear-gradient(160deg, #4a1418, #2a0c10)'
                  : `linear-gradient(125deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 36%), linear-gradient(160deg, ${color}22, #0a1c28)`,
              border: `2px solid ${borderColor}`,
              boxShadow: correct ? `0 0 46px ${rgba(TTOTO_COLORS.correct, 0.45)}` : undefined,
              filter: `drop-shadow(0 12px 0 rgba(0,0,0,0.4)) drop-shadow(0 0 24px ${borderColor}33)${recede ? ' brightness(0.55) saturate(0.6)' : ''}`,
              opacity: recede ? 0.7 : 1,
              transition: 'filter 0.4s ease, opacity 0.4s ease, background 0.4s ease, border-color 0.4s ease',
            }}>
              <div className="ttoto-a-bracket-tr" style={{ borderTop: `3px solid ${borderColor}`, borderRight: `3px solid ${borderColor}` }} />
              <div className="ttoto-a-bracket-bl" style={{ borderBottom: `3px solid ${borderColor}`, borderLeft: `3px solid ${borderColor}` }} />
              <div className="ttoto-a-tag" style={{
                background: correct ? TTOTO_COLORS.correct : CHOICE_TAG_BG[choice], color: correct ? '#052e16' : '#f2f5fb',
                fontSize: 22, fontWeight: 700, letterSpacing: 3, padding: '10px 26px 10px 18px', alignSelf: 'flex-start',
              }}>
                {CHOICE_LABEL[choice]}
              </div>
              {(missed || correct) && (
                <div style={{
                  position: 'absolute', top: 16, right: 20, display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 15, fontWeight: 700, letterSpacing: 2, color: missed ? lighten(TTOTO_COLORS.incorrect, 0.3) : TTOTO_COLORS.correct,
                }}>
                  {correct && <span style={{ fontSize: 18 }}>✓</span>}
                  {missed ? 'SIGNAL LOST' : 'CORRECT'}
                </div>
              )}

              {missed && crack && <CrackOverlay variant={crack.variant} rotationDeg={crack.rotationDeg} />}

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
                <LetterRow letterStyle={letterStyle} choice={choice} word={word} revealed={choicesRevealed} won={correct} />
                {missed && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <div style={{ fontSize: 17, letterSpacing: 2, color: '#ffd8d6' }}>
                      {teams.find(t => t.id === roundState.missedBy.find(m => m.choice === choice)?.teamId)?.name.toUpperCase() ?? ''} &mdash; MISSED
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {overlayEvent && <GameEventOverlay key={overlayEvent.key} event={overlayEvent} onDone={clearOverlayEvent} />}
    </div>
    </TToTOStage>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export const TToTOShowComponent = () => {
  const [state, setState] = useState<TToTOState | null>(null);

  const refresh = useCallback(async () => {
    try { setState(await getState()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => { void refresh(); }, 800);
    return () => clearInterval(id);
  }, [refresh]);

  if (!state) {
    return (
      <div style={{ height: '100vh', width: '100vw', background: '#0a1420', color: '#8ea3c4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Connecting…
      </div>
    );
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {(() => {
        if (state.showIntro) return <TToTOGameIntro />;
        if (state.roundState.phase === 'idle') return <TToTOGameIntro />;
        if (state.roundState.phase === 'round_intro') {
          return (
            <RoundIntroScreen
              round={state.rounds[state.roundState.currentRoundIndex]}
              multiplier={multiplierForRound(state.config.roundMultipliers, state.roundState.currentRoundIndex)}
            />
          );
        }
        if (state.roundState.phase === 'game_over') return <GameOverScreen state={state} />;
        return <ComboScreen state={state} />;
      })()}
    </>
  );
};

export default TToTOShowComponent;
