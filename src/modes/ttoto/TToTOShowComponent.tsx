import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { getState } from './api';
import type { TToTOState, TToTOChoiceKey, LetterStyle, TToTORound, TToTOTeam, ControllerAssignment } from './types';
import { FLAVOR_LABELS } from './types';
import { buildFlapRow, cascadeFlapRow, resetFlapRow, type LetterVariant } from './letterBoard';
import { buildSegmentedRow, cascadeSegmentedRow, resetSegmentedRow } from './segmentedBoard';
import { setupDotMatrix, type DotMatrixHandle } from './dotMatrixBoard';
import { CrackOverlay } from './CrackOverlay';
import { TToTOGameIntro } from './TToTOGameIntro';
import { TToTOTeamRandomizer } from './TToTOTeamRandomizer';
import { TToTOStage } from './TToTOStage';
import { TTOTO_COLORS, lighten, darken, rgba } from './colors';
import { useGameEventOverlay, GameEventOverlay } from './GameOverlays';
import { fitTextToWidth, fixedCharWidth } from './fitText';
import { playMissSound, playRevealSound, playCorrectSound, playVictorySound, playBuzzSound, playStealWindowOpenSound, playTriageAlertSound, playMediaRevealSound, playMediaFile } from './sounds';
import { useAutoReloadOnNewBuild } from '../../shared/hooks/useAutoReloadOnNewBuild';

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
  /* Gunmetal/silver, not tied to a choice color — used for the round-intro's flavor reveal. */
  .ttoto-flap-cell .face-neutral { background:linear-gradient(to bottom,${lighten('#8a939e', 0.35)} 0 50%,${darken('#8a939e', 0.3)} 50% 100%); color:#0d1013; }
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

  /* CRT glass treatment for the 3 answer panels (Phase A of the retro-mechanical pass —
     see visual-notes). Baseline stays calm/subtle: a soft off-center sheen + edge vignette
     fake convex glass without an actual 3D transform, plus a faint scanline texture. These
     sit at z-index:-1 within the panel's own stacking context, which (given the panel's
     other children are plain non-positioned flow elements) paints them above the panel's
     own background but below the tag/text/letter-display content — no z-index needed on
     the content itself. */
  .ttoto-crt-vignette { position:absolute; inset:0; z-index:-1; pointer-events:none;
    background: radial-gradient(ellipse 75% 70% at 50% 45%, transparent 55%, rgba(0,0,0,0.5) 100%); }
  .ttoto-crt-scanlines { position:absolute; inset:0; z-index:-1; pointer-events:none; opacity:0.5; mix-blend-mode:multiply;
    background-image: repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px); }
  .ttoto-crt-sheen { position:absolute; inset:0; z-index:-1; pointer-events:none;
    background: radial-gradient(ellipse 55% 40% at 28% 20%, rgba(255,255,255,0.18), transparent 62%); }

  /* Wrong-answer transition: a brief static/glitch burst plays once (React mounts this div
     exactly when a panel first flips to "missed") before settling into the crack — the
     crack reads as "the screen glitched and broke," not "a decal appeared." Positive
     z-index so it briefly covers the panel's content, then fades to nothing and stays out
     of the way (animation fill-mode: forwards). */
  @keyframes ttotoCrtStatic { 0% { opacity:0.95; } 60% { opacity:0.55; } 100% { opacity:0; } }
  .ttoto-crt-static-burst { position:absolute; inset:0; z-index:5; pointer-events:none; mix-blend-mode:screen;
    animation: ttotoCrtStatic 380ms steps(5) forwards;
    background-image:
      repeating-linear-gradient(0deg, rgba(255,255,255,0.55) 0px, rgba(255,255,255,0.55) 1px, transparent 1px, transparent 2px),
      repeating-linear-gradient(90deg, rgba(120,220,255,0.12) 0px, transparent 2px, transparent 7px); }

  /* ID Please ("media_id") only — plays once whenever the media element mounts: the
     initial reveal, and every host Replay tap (which remounts it via a key bump on
     roundState.mediaReplaySeq — see ComboScreen). A quick scale/glow pulse rather than a
     static appearance, so a replay reads as "look again" even though the image itself
     hasn't changed. */
  @keyframes ttotoMediaPulse {
    0%   { transform: scale(0.94); opacity: 0; filter: brightness(1.6); }
    40%  { transform: scale(1.02); opacity: 1; filter: brightness(1.3); }
    100% { transform: scale(1); opacity: 1; filter: brightness(1); }
  }
  .ttoto-media-pulse { animation: ttotoMediaPulse 500ms cubic-bezier(.2,.8,.3,1) both; }

  /* Phase B: gunmetal chassis for the header/score-plates/question-panel — the cabinet the
     CRT screens (Phase A) are mounted into. Blackened metal fill + an inset shadow (reads as
     recessed into the housing rather than a floating glass card) + a faint brushed-metal
     texture, with a few restrained rivets rather than covering every seam. Team/choice
     colors stay expressed via borders/accents, unchanged — only the fill material changes. */
  .ttoto-gunmetal { background: linear-gradient(160deg, #3a4048 0%, #23272d 45%, #14171b 100%);
    box-shadow: inset 0 2px 3px rgba(255,255,255,0.07), inset 0 -4px 8px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(0,0,0,0.5); }
  .ttoto-metal-brushed { position:absolute; inset:0; z-index:0; pointer-events:none; opacity:0.6;
    background-image: repeating-linear-gradient(100deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px); }
  .ttoto-rivet { position:absolute; width:7px; height:7px; border-radius:50%; z-index:1;
    background: radial-gradient(circle at 35% 30%, #dfe4e8, #767c83 55%, #202225 100%);
    box-shadow: 0 1px 2px rgba(0,0,0,0.7); }

  /* Phase C: the filament-bulb celebration fixture (victory screen only) — a normally-
     dormant warm theatrical subsystem, distinct from the cool electromechanical rig that
     runs during play. Illumination is layered on top of the real edison-tube-base.png
     artwork as 3 independently-timed pieces (ember, filament, environmental spill), never
     baked into or replacing the photo. Each bulb: unlit -> faint ember -> hesitate/flicker
     -> rapid tungsten warm-up -> steady ~2200K glow, then holds — no looping chase/twinkle
     once lit. All 4 layers below share one timeline/duration so they read as one bulb
     igniting rather than unrelated effects. */
  .ttoto-bulb-spill, .ttoto-bulb-glass, .ttoto-bulb-ember, .ttoto-bulb-filament { position:absolute; pointer-events:none; }

  @keyframes ttotoEmberFlicker {
    0%   { opacity: 0; }
    10%  { opacity: 0.5; }
    18%  { opacity: 0.25; }
    27%  { opacity: 0.45; }
    42%  { opacity: 0.1; }
    58%  { opacity: 0; }
    100% { opacity: 0; }
  }
  .ttoto-bulb-ember {
    border-radius: 50%; filter: blur(3px);
    background: radial-gradient(ellipse 60% 100% at 50% 50%, rgba(210,75,20,0.95), rgba(150,45,10,0.45) 55%, transparent 76%);
    animation: ttotoEmberFlicker 2200ms ease-out both;
  }

  @keyframes ttotoFilamentIgnite {
    0%   { opacity: 0; }
    20%  { opacity: 0; }
    26%  { opacity: 0.4; }
    32%  { opacity: 0.15; }
    44%  { opacity: 0.8; }
    52%  { opacity: 0.55; }
    64%  { opacity: 0.97; }
    76%  { opacity: 1; }
    100% { opacity: 1; }
  }
  .ttoto-bulb-filament {
    /* The brightest element of the bulb, by design — a hot near-white core (2200K reads
       warm but is still the brightest point in the scene) falling off into amber. */
    border-radius: 50%; filter: blur(1.6px);
    background: radial-gradient(ellipse 60% 100% at 50% 50%, rgba(255,248,232,1) 0%, rgba(255,214,150,0.95) 30%, rgba(255,171,82,0.6) 55%, rgba(255,141,52,0.2) 75%, transparent 88%);
    animation: ttotoFilamentIgnite 2200ms ease-out both;
  }

  @keyframes ttotoGlassWarm {
    0%   { opacity: 0; }
    62%  { opacity: 0; }
    80%  { opacity: 0.32; }
    100% { opacity: 0.32; }
  }
  .ttoto-bulb-glass {
    /* Secondary to the filament — a restrained warm sheen on the glass, not a second
       light source competing with it. */
    border-radius: 50%;
    background: radial-gradient(ellipse 55% 40% at 35% 24%, rgba(255,226,192,0.4), transparent 65%);
    animation: ttotoGlassWarm 2200ms ease-out both;
  }

  @keyframes ttotoSpillBloom {
    0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
    62%  { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
    78%  { opacity: 0.5; transform: translate(-50%, -50%) scale(0.92); }
    100% { opacity: 0.85; transform: translate(-50%, -50%) scale(1); }
  }
  .ttoto-bulb-spill {
    /* Broad/strong — restored to the first version's values. This is the "near the bulb"
       halo; still tertiary to the filament/glass since it's a soft low-density gradient. */
    border-radius: 50%; filter: blur(9px); z-index: 0;
    background: radial-gradient(circle, rgba(255,171,82,0.4) 0%, rgba(255,141,62,0.16) 40%, transparent 72%);
    animation: ttotoSpillBloom 2200ms ease-out both;
  }

  /* The "reach toward the center" layer — deliberately NOT one gradient centered behind the
     winner. Each bulb gets one of these, centered on that bulb's own (offscreen/edge)
     position with a large radius and a very low individual peak opacity. mix-blend-mode:
     screen means overlapping fields brighten each other where they overlap — so any single
     field is barely perceptible on its own, but where several overlap (naturally, toward
     the middle of the canvas, since bulbs surround it) the cumulative warmth becomes
     noticeable. That's what keeps the effect reading as "light cast from multiple fixtures"
     rather than a single orange source, while still visibly warming the center. */
  @keyframes ttotoReachBloom {
    0%   { opacity: 0; }
    58%  { opacity: 0; }
    100% { opacity: 1; }
  }
  .ttoto-bulb-reach {
    /* Tight falloff on purpose — "warm islands within a cool dark room," not a wash. Most
       of the canvas between bulbs should show clearly visible cool navy/teal/purple; only
       the handful of bulbs nearest the center should leave any (faint) trace there. */
    position: absolute; border-radius: 50%; pointer-events: none; mix-blend-mode: screen;
    background: radial-gradient(circle, rgba(255,158,74,0.15) 0%, rgba(255,140,66,0.06) 22%, rgba(255,130,60,0.02) 42%, rgba(255,120,55,0.006) 62%, transparent 85%);
    animation: ttotoReachBloom 2400ms ease-out both;
  }
`;

const multiplierForRound = (roundMultipliers: number[], roundIndex: number): number =>
  roundMultipliers[roundIndex] ?? roundMultipliers[roundMultipliers.length - 1] ?? 1;

const CHOICE_ORDER: TToTOChoiceKey[] = ['this', 'that', 'the_other'];
const CHOICE_VARIANT: Record<TToTOChoiceKey, LetterVariant> = { this: 'this', that: 'that', the_other: 'other' };
const CHOICE_COLOR: Record<TToTOChoiceKey, string> = { this: TTOTO_COLORS.this, that: TTOTO_COLORS.that, the_other: TTOTO_COLORS.the_other };
// Reverse of CHOICE_VARIANT, for PlainTextRow's fallback tile tint — split-flap is the
// one style that's colored per-choice rather than a fixed signature color (dot-matrix's
// teal, segmented's orange), so it needs the mapping the other two don't.
const VARIANT_COLOR: Record<LetterVariant, string> = { this: TTOTO_COLORS.this, that: TTOTO_COLORS.that, other: TTOTO_COLORS.the_other, neutral: '#8a939e' };
const CHOICE_TAG_BG = CHOICE_COLOR;
const CHOICE_LABEL: Record<TToTOChoiceKey, string> = { this: 'THIS', that: 'THAT', the_other: 'THE OTHER' };

/**
 * Fallback for answers too long to read well in any of the three mechanical letter
 * displays. fitTextToWidth() only wraps onto a 2nd line once shrinking alone can't fit a
 * single line anymore (see fitText.ts's MIN_SCALE floor), and by that point none of
 * split-flap/dot-matrix/segmented render it well: dot-matrix/segmented's thin glowing
 * dots/segments lose their shape well before split-flap's thicker tiles do, and even
 * split-flap's own mid-phrase 2-line wrap reads as an awkward flip-board glitch rather
 * than a deliberate line break. Plain, normally-reflowing text in the same font as the
 * question prompt (not a fixed-width grid) handles a long phrase far better. Revealed
 * with a quick fade/pop (reusing ID Please's ttoto-media-pulse keyframe) since there's no
 * flap/dot/segment mechanism here to cascade.
 *
 * Only the specific answer(s) that actually need it fall back — a round's other, shorter
 * answers keep the mechanical display, since the decision is per-answer (see each Row
 * component's own fit.lines.length check), not a round-wide or flavor-wide switch.
 *
 * Pre-reveal, this can't just render nothing — every mechanical style shows some kind of
 * "blank card, not yet flipped" placeholder before reveal (split-flap's dashed tile
 * backs, dot-matrix/segmented's dim ghost glyphs), and a bare empty box next to two
 * panels that still look alive reads as broken, not as "nothing to see yet" (caught from
 * a live screenshot: one empty panel next to two showing tile placeholders). So this
 * shows its own placeholder instead: a row of blank tiles sized to roughly match the
 * answer's length, tinted with the same accentColor the real (this/that/the_other) panel
 * border/tag already uses — visually closer to "an unflipped row of cards in this
 * panel's color" than a generic grey box.
 */
function PlainTextRow({ word, revealed, won, maxWidth = ANSWER_PANEL_CONTENT_WIDTH, accentColor }: {
  word: string; revealed: boolean; won: boolean; maxWidth?: number; accentColor: string;
}) {
  if (!revealed) {
    const tileCount = Math.min(Math.max(Math.ceil(word.length / 2), 4), 16);
    return (
      <div style={{ width: maxWidth, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flexWrap: 'wrap' }}>
        {Array.from({ length: tileCount }).map((_, i) => (
          <div key={i} style={{
            width: 20, height: 30, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(to bottom, ${rgba(accentColor, 0.22)} 0 50%, ${rgba(accentColor, 0.12)} 50% 100%)`,
            boxShadow: `inset 0 0 0 1px ${rgba(accentColor, 0.35)}`,
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: rgba(accentColor, 0.6),
          }}>
            {'\u2013'}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="ttoto-media-pulse" style={{
      width: maxWidth, textAlign: 'center', fontFamily: "'Big Shoulders Display', sans-serif",
      fontWeight: 800, fontSize: 30, lineHeight: 1.15, overflowWrap: 'break-word',
      color: won ? TTOTO_COLORS.correct : '#f2f5fb',
      textShadow: won ? `0 0 16px ${rgba(TTOTO_COLORS.correct, 0.8)}` : '0 0 10px rgba(255,255,255,0.25)',
    }}>
      {word}
    </div>
  );
}

// ─── Split-flap row (imperative DOM cascade) ────────────────────────────────

const FLAP_FULL_TILE = { width: 52, height: 86 }; // historical default = scale 1
const FLAP_FULL_CHAR_WIDTH = FLAP_FULL_TILE.width + 6; // + the row's tile gap

function SplitFlapRow({ variant, word, revealed, won, maxWidth = ANSWER_PANEL_CONTENT_WIDTH }: {
  variant: LetterVariant; word: string; revealed: boolean; won: boolean; maxWidth?: number;
}) {
  const line1Ref = useRef<HTMLDivElement | null>(null);
  const line2Ref = useRef<HTMLDivElement | null>(null);
  const builtKeyRef = useRef<string>('');
  const prevRevealedRef = useRef<boolean>(false);

  const upper = word.toUpperCase();
  const fit = fitTextToWidth(upper, maxWidth, fixedCharWidth(FLAP_FULL_CHAR_WIDTH));
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

  // Too long to fit on one line even at the shrink floor — plain text reads better than
  // an awkward mid-phrase flap wrap (see PlainTextRow's doc comment). The effect above
  // still runs harmlessly every render (line1Ref/line2Ref are simply never attached to
  // anything in this branch, so its `if (!el1) return` guard just no-ops).
  if (fit.lines.length > 1) return <PlainTextRow word={upper} revealed={revealed} won={won} maxWidth={maxWidth} accentColor={VARIANT_COLOR[variant]} />;

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

function DotMatrixRow({ word, revealed, won, maxWidth = ANSWER_PANEL_CONTENT_WIDTH }: {
  word: string; revealed: boolean; won: boolean; maxWidth?: number;
}) {
  const upper = word.toUpperCase();
  const fit = fitTextToWidth(upper, maxWidth, fixedCharWidth(DOT_FULL_CHAR_WIDTH));
  const height = Math.round(84 * fit.scale);

  // See SplitFlapRow's identical check — too long to fit on one line even at the shrink
  // floor, so fall back to plain text rather than illegible tiny dots. Tinted with
  // dot-matrix's own signature teal (see .ttoto-dotmatrix-text) rather than a per-choice
  // color — this style is monochrome regardless of choice already.
  if (fit.lines.length > 1) return <PlainTextRow word={upper} revealed={revealed} won={won} maxWidth={maxWidth} accentColor="#4dfff0" />;

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

function SegmentedRow({ word, revealed, won, maxWidth = ANSWER_PANEL_CONTENT_WIDTH }: {
  word: string; revealed: boolean; won: boolean; maxWidth?: number;
}) {
  const upper = word.toUpperCase();
  const fit = fitTextToWidth(upper, maxWidth, measureSegmentedWidth);
  const fontSize = Math.round(SEGMENTED_FULL_FONT_SIZE * fit.scale);
  const letterSpacing = Math.round(SEGMENTED_FULL_LETTER_SPACING * fit.scale);

  // See SplitFlapRow's identical check — this is the style that actually motivated
  // PlainTextRow: thin glowing segments become illegible well before split-flap's
  // thicker tiles do at the same shrink amount. Tinted with segmented's own signature
  // orange (see .ttoto-segment-lit) rather than a per-choice color, same reasoning as
  // DotMatrixRow above.
  if (fit.lines.length > 1) return <PlainTextRow word={upper} revealed={revealed} won={won} maxWidth={maxWidth} accentColor="#ff6a3d" />;

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

/** A single restrained bit of "visible hardware" on the gunmetal chassis (Phase B) — used
 * sparingly (a few per panel, not every corner) so it reads as real construction. */
function Rivet({ top, left, right, bottom }: { top?: number; left?: number; right?: number; bottom?: number }) {
  return <div className="ttoto-rivet" style={{ top, left, right, bottom }} />;
}

/**
 * ID Please (media_id) image reveal — a full-stage overlay rather than crammed into the
 * small question panel. That panel is only ~100px tall in practice (tag + one line of
 * prompt), nowhere near enough for a meaningful image, and there's no layout slack to let
 * it grow into: the header, question panel, and answer-panel row all sit at hardcoded
 * pixel heights/margins within the fixed 1600x900 stage (not a scrolling page) — a panel
 * that suddenly grew 300px would shove the answer panels down and off the bottom edge.
 *
 * Shown full (no auto-dismiss) for the whole `media_shown` phase — the answer panels are
 * inert then anyway, so covering them costs nothing. Once the host advances to `armed`,
 * ComboScreen swaps this out for a small persistent thumbnail inline in the question
 * panel instead, so gameplay isn't obstructed; a host Replay tap after that re-opens this
 * big version temporarily (ComboScreen's `imageReplayFlash`), auto-dismissing itself.
 */
function MediaImageOverlay({ mediaRef }: { mediaRef: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,8,14,0.72)' }} />
      <div className="ttoto-gunmetal ttoto-media-pulse" style={{
        position: 'relative', padding: '20px 26px 24px 26px', borderRadius: 10,
        border: '2px solid #4a5058', boxShadow: '0 0 60px rgba(0,0,0,0.6), 0 0 40px rgba(120,170,230,0.18)',
        maxWidth: '78%', maxHeight: '78%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div className="ttoto-metal-brushed" style={{ borderRadius: 10 }} />
        <Rivet top={10} left={12} /><Rivet top={10} right={12} /><Rivet bottom={10} left={12} /><Rivet bottom={10} right={12} />
        <div className="ttoto-a-tag" style={{ position: 'relative', background: '#c7d4ea', color: '#0d1b2e', fontSize: 13, fontWeight: 800, letterSpacing: 3, padding: '5px 18px 5px 12px', marginBottom: 14 }}>
          IMAGE
        </div>
        <img src={`/ttoto/media/${mediaRef}`} alt="" style={{ position: 'relative', maxWidth: '100%', maxHeight: '58vh', borderRadius: 6, display: 'block' }} />
      </div>
    </div>
  );
}

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

// Deliberately *not* the victory treatment: cool palette (no warm light), compact and
// centered (not room-filling), a quick beat rather than a multi-second sequence, and no CRT
// (this is a sign being displayed, not a screen surface). The one thing it does borrow is
// the actual reveal *mechanism* — the round's own randomized letterStyle previews itself a
// beat early on the flavor name, tying this screen into the same machine rather than just
// reusing its materials.
function RoundIntroScreen({ round, multiplier }: { round: TToTORound | undefined; multiplier: number }) {
  const [revealed, setRevealed] = useState(false);
  const letterStyle = round?.letterStyle;
  useEffect(() => {
    setRevealed(false);
    const t = setTimeout(() => {
      setRevealed(true);
      if (letterStyle) playRevealSound(letterStyle);
    }, 250);
    return () => clearTimeout(t);
  }, [round?.id, letterStyle]);

  const word = round ? FLAVOR_LABELS[round.flavor].toUpperCase() : '';

  return (
    <TToTOStage>
      <div style={{
        width: 1600, height: 900,
        background: 'linear-gradient(135deg, #0a3145 0%, #12233f 32%, #1c1030 68%, #12070f 100%)',
        fontFamily: "'Barlow Condensed', system-ui, sans-serif", color: '#f2f5fb',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
      }}>
        {/* Gunmetal plate — same chassis material as the header/score-plates/question panel
            (Phase B), so this reads as "a sign bolted onto the machine," not a new material. */}
        <div className="ttoto-gunmetal" style={{
          position: 'relative', padding: '44px 72px', border: '1px solid #4a5058',
          boxShadow: '0 0 34px rgba(0,0,0,0.45), inset 0 2px 3px rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, minWidth: 640,
        }}>
          <div className="ttoto-metal-brushed" />
          <Rivet top={12} left={16} /><Rivet top={12} right={16} /><Rivet bottom={12} left={16} /><Rivet bottom={12} right={16} />
          <div className="ttoto-a-tag" style={{ position: 'relative', background: '#c7d4ea', color: '#0d1b2e', fontSize: 20, fontWeight: 700, letterSpacing: 4, padding: '8px 30px 8px 18px' }}>
            ROUND {round?.roundNumber ?? '—'}
          </div>
          <div style={{ position: 'relative' }}>
            {letterStyle === 'dot_matrix' && <DotMatrixRow word={word} revealed={revealed} won={false} maxWidth={1100} />}
            {letterStyle === 'segmented' && <SegmentedRow word={word} revealed={revealed} won={false} maxWidth={1100} />}
            {(letterStyle === 'split_flap' || !letterStyle) && <SplitFlapRow variant="neutral" word={word} revealed={revealed} won={false} maxWidth={1100} />}
          </div>
          {multiplier !== 1 && <div style={{ position: 'relative' }}><MultiplierBadge multiplier={multiplier} fontSize={22} /></div>}
        </div>
      </div>
    </TToTOStage>
  );
}

// ─── Game-over / victory screen ─────────────────────────────────────────────

// Filament-bulb celebration fixture (replaces confetti) — a normally-dormant warm
// theatrical subsystem, dormant during play, that only wakes up for the victory screen.
// Uses the provided edison-tube-base.png artwork (real photographed bulb — glass envelope,
// visible internal filament structure, blackened-metal/brass socket) rather than a drawn
// icon; every instance below is the same image, just rotated/scaled/positioned. Illumination
// is layered on top via separate CSS elements (never baked into or replacing the artwork).
const BULB_ASSET_SRC = '/ttoto/decorations/edison-tube-base.png';
const BULB_ASSET_ASPECT = 941 / 1672; // width/height of the source art

// Fractional bounding boxes measured directly from the artwork's pixels (see the analysis
// in the commit that added this), so the illumination overlays land on the actual glass/
// filament regions of this specific image rather than a guessed position.
const BULB_GLASS_BOX = { x0: 0.36, y0: 0.01, x1: 0.64, y1: 0.80 };
const BULB_FILAMENT_BOX = { x0: 0.40, y0: 0.16, x1: 0.60, y1: 0.72 };
// Where the bulb "plugs into" its mounting arm — partway down the socket body.
const BULB_SOCKET_ANCHOR = { x: 0.5, y: 0.87 };

function boxStyle(box: { x0: number; y0: number; x1: number; y1: number }): CSSProperties {
  return {
    position: 'absolute',
    left: `${box.x0 * 100}%`, top: `${box.y0 * 100}%`,
    width: `${(box.x1 - box.x0) * 100}%`, height: `${(box.y1 - box.y0) * 100}%`,
  };
}

/** One physical bulb — independent, not connected to any other bulb or to a shared visible
 * structure. Only a short stub of mounting hardware (past the artwork's own socket) implies
 * it's actually mounted to something, then fades to nothing — it does not reach toward a
 * center point. Pointed generally toward the victory content at `rotationDeg`, with its own
 * staggered ignition. Illumination is 3 independently-timed layers over the same artwork: a
 * small early "ember", the main filament glow (brightest), and a broad soft environmental
 * spill (secondary/tertiary) — see the ttotoEmberFlicker/FilamentIgnite/SpillBloom
 * keyframes. */
function MountedFilamentBulb({ x, y, width, rotationDeg, delayMs }: {
  x: number; y: number; width: number; rotationDeg: number; delayMs: number;
}) {
  const height = width / BULB_ASSET_ASPECT;
  const stemLength = height * 0.22;
  return (
    <div style={{
      position: 'absolute',
      left: x - width * BULB_SOCKET_ANCHOR.x, top: y - height * BULB_SOCKET_ANCHOR.y,
      width, height,
      transformOrigin: `${BULB_SOCKET_ANCHOR.x * 100}% ${BULB_SOCKET_ANCHOR.y * 100}%`,
      transform: `rotate(${rotationDeg}deg)`,
    }}>
      {/* Environmental spill — restored to the first version's broad/strong values; bulbs
          now live at the edges, so this is what actually reaches the center. */}
      <div className="ttoto-bulb-spill" style={{
        position: 'absolute', left: '50%', top: `${(BULB_FILAMENT_BOX.y0 + BULB_FILAMENT_BOX.y1) / 2 * 100}%`,
        width: width * 3.4, height: width * 3.4, transform: 'translate(-50%, -50%)',
        animationDelay: `${delayMs}ms`,
      }} />
      {/* A short stub of blackened-metal/brass hardware past the socket, fading to nothing —
          just enough to read as "mounted to something," not a rod reaching toward a center. */}
      <div style={{
        position: 'absolute', left: '50%', top: `${BULB_SOCKET_ANCHOR.y * 100}%`, width: width * 0.14, height: stemLength,
        transform: 'translateX(-50%)',
        background: 'linear-gradient(to bottom, #2a2b2d 0%, #1a1b1c 55%, transparent 100%)',
      }} />
      <img src={BULB_ASSET_SRC} alt="" draggable={false} style={{ position: 'relative', width: '100%', height: '100%', display: 'block' }} />
      {/* Glass response — secondary to the filament, above the artwork. */}
      <div className="ttoto-bulb-glass" style={{ ...boxStyle(BULB_GLASS_BOX), animationDelay: `${delayMs}ms` }} />
      {/* Ember (early, fades out) + main filament emission (takes over, holds steady, and is
          the brightest element of the bulb) — both confined to the artwork's actual
          filament geometry. */}
      <div className="ttoto-bulb-ember" style={{ ...boxStyle(BULB_FILAMENT_BOX), animationDelay: `${delayMs}ms` }} />
      <div className="ttoto-bulb-filament" style={{ ...boxStyle(BULB_FILAMENT_BOX), animationDelay: `${delayMs}ms` }} />
    </div>
  );
}

// No shared visible structure at all this time (no hub, no ring, no spokes) — each bulb is
// independent, living in the outer 30-40% of the 1600x900 canvas, oriented generally toward
// CONTENT_CENTER (used only for aiming the bulbs and centering the ambient wash — nothing is
// drawn there). Positions are hand-placed and deliberately irregular (varied distance/size/
// angle) rather than derived from one angle+radius formula, so the arrangement doesn't read
// as symmetric/clock-like. Several bulbs sit partly off-canvas for cropping/depth.
const CONTENT_CENTER = { x: 800, y: 420 };
const BULB_FIXTURE: Array<{ x: number; y: number; width: number; delay: number }> = [
  { x: 40, y: -50, width: 145 },
  { x: 1120, y: -70, width: 110 },
  { x: 1660, y: 160, width: 135 },
  { x: -60, y: 470, width: 190 },
  { x: 1640, y: 560, width: 120 },
  { x: 130, y: 970, width: 155 },
  { x: 780, y: 1010, width: 100 },
  { x: 1480, y: 950, width: 140 },
  { x: 330, y: 60, width: 90 },
].map((b, i) => ({ ...b, delay: [0, 220, 90, 380, 150, 300, 60, 260, 430][i] }));

// Radius for each bulb's "reach toward center" field (see .ttoto-bulb-reach) — deliberately
// small relative to the canvas: most bulb-to-bulb gaps (900+ px) stay clearly cool, only the
// 2-3 bulbs nearest the content center (~590px away) leave any trace there, and even that is
// deep in the gradient's faint tail. Nearby bulb pairs (e.g. the two top-left ones, ~310px
// apart) still overlap into one richer corner glow, which is fine — "somewhat" overlapping,
// not a full-screen merge.
const REACH_RADIUS = 620;

function FilamentBulbFixture() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* One "reach" field per bulb, anchored at that bulb's own position — overlapping
          light cast from multiple edge fixtures, not a single gradient behind the winner. */}
      {BULB_FIXTURE.map((b, i) => (
        <div key={i} className="ttoto-bulb-reach" style={{
          left: b.x, top: b.y, width: REACH_RADIUS * 2, height: REACH_RADIUS * 2,
          transform: 'translate(-50%, -50%)', animationDelay: `${b.delay}ms`,
        }} />
      ))}
      {BULB_FIXTURE.map((b, i) => {
        const angleToCenter = Math.atan2(CONTENT_CENTER.y - b.y, CONTENT_CENTER.x - b.x) * (180 / Math.PI);
        return <MountedFilamentBulb key={i} x={b.x} y={b.y} width={b.width} rotationDeg={angleToCenter + 90} delayMs={b.delay} />;
      })}
    </div>
  );
}

function TToTOLogoMark({ size = 64 }: { size?: number }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
      <svg width={size} height={size} viewBox="0 0 64 64">
        <g strokeWidth={7} strokeLinecap="round" fill="none">
          <path d="M14 12 L34 32 L14 52" stroke={TTOTO_COLORS.this} transform="rotate(0 32 32)" />
          <path d="M14 12 L34 32 L14 52" stroke={TTOTO_COLORS.that} transform="rotate(120 32 32)" />
          <path d="M14 12 L34 32 L14 52" stroke={TTOTO_COLORS.the_other} transform="rotate(240 32 32)" />
        </g>
      </svg>
      <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: size * 0.8, letterSpacing: 1, lineHeight: 1 }}>
        <span style={{ color: TTOTO_COLORS.this }}>T</span><span style={{ color: TTOTO_COLORS.that }}>T</span>
        <span style={{ color: '#c7d4ea', fontSize: '0.68em' }}>o</span>
        <span style={{ color: '#f2f5fb' }}>T</span><span style={{ color: TTOTO_COLORS.the_other }}>O</span>
      </div>
    </div>
  );
}

function GameOverScreen({ state }: { state: TToTOState }) {
  const [t1, t2] = state.teams;
  const winner = t1.score === t2.score ? null : (t1.score > t2.score ? t1 : t2);
  const loser = winner ? state.teams.find(t => t.id !== winner.id) : null;

  // GameOverScreen stays mounted for as long as phase === 'game_over' (across every poll
  // until newGame()/endGame() moves on), so an empty-deps effect fires exactly once —
  // right when the game actually ends, not on every 800ms poll.
  useEffect(() => {
    if (winner) playVictorySound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TToTOStage>
      <div style={{
        width: 1600, height: 900, position: 'relative', overflow: 'hidden',
        background: `radial-gradient(ellipse 70% 60% at 50% 42%, ${rgba(TTOTO_COLORS.correct, 0.22)} 0%, transparent 70%), linear-gradient(135deg, #0a3145 0%, #12233f 32%, #1c1030 68%, #12070f 100%)`,
        fontFamily: "'Barlow Condensed', system-ui, sans-serif", color: '#f2f5fb',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
      }}>
        {winner && <FilamentBulbFixture />}

        <div style={{ position: 'relative' }}><TToTOLogoMark size={56} /></div>

        <div style={{ position: 'relative', fontSize: 20, fontWeight: 700, letterSpacing: 8, color: '#8ea3c4' }}>
          GAME OVER
        </div>

        {winner ? (
          <>
            {/* "WINNER" showcased in dot-matrix — same technique used to reveal answers,
                repurposed here as one last flourish for the letter-display tech. */}
            <div style={{ position: 'relative', marginTop: 4 }}>
              <DotMatrixRow word="WINNER" revealed won />
            </div>

            {/* Winning team's name in split-flap */}
            <div style={{ position: 'relative' }}>
              <SplitFlapRow variant="this" word={winner.name.toUpperCase()} revealed won />
            </div>

            {/* Score in segmented */}
            <div style={{ position: 'relative', marginTop: 2 }}>
              <SegmentedRow word={String(winner.score)} revealed won />
            </div>

            {loser && (
              <div style={{ position: 'relative', marginTop: 10, fontSize: 16, letterSpacing: 2, color: '#8ea3c4' }}>
                {winner.name.toUpperCase()} {winner.score} &mdash; {loser.name.toUpperCase()} {loser.score}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ position: 'relative', fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 72, letterSpacing: 2, marginTop: 8 }}>
              IT'S A TIE!
            </div>
            <div style={{ position: 'relative', display: 'flex', gap: 60, marginTop: 8 }}>
              {state.teams.map((t) => (
                <div key={t.id} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, letterSpacing: 3, color: '#8ea3c4' }}>{t.name.toUpperCase()}</div>
                  <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 80 }}>{t.score}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </TToTOStage>
  );
}

// TIMED_WINDOW steal only — ticks down the exclusive-stage display from the server-provided
// deadline. Purely cosmetic (the actual hardware window transition is timed server-side in
// routes.ts); a little client/server clock drift here just means the displayed number and
// the real cutoff might be off by a fraction of a second, which is fine for a countdown.
function useCountdownSeconds(deadlineMs: number | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadlineMs) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [deadlineMs]);
  if (!deadlineMs) return null;
  return Math.max(0, Math.ceil((deadlineMs - now) / 1000));
}

// ─── Main combo screen (header + question + 3 answer panels) ───────────────

function ComboScreen({ state }: { state: TToTOState }) {
  const { roundState, teams, rounds, config } = state;
  const round = rounds[roundState.currentRoundIndex];
  const question = round?.questions[roundState.currentQuestionIndex];
  const letterStyle: LetterStyle = round?.letterStyle ?? 'split_flap';
  const multiplier = multiplierForRound(config.roundMultipliers, roundState.currentRoundIndex);

  // categories_shown (Triage only) reveals the answer panels same as armed onward — it's
  // specifically the phase where the category answers are up but the prompt isn't yet.
  const choicesRevealed = roundState.phase === 'categories_shown' || roundState.phase === 'armed' || roundState.phase === 'answering'
    || roundState.phase === 'steal' || roundState.phase === 'steal_armed' || roundState.phase === 'resolved';

  // ID Please (media_id) only — media stays up from the moment it's revealed all the way
  // through resolved (same "whole question" window as the host's Replay control), one
  // phase earlier than choicesRevealed since the media reveal comes first.
  const mediaRevealed = round?.flavor === 'media_id' && roundState.phase !== 'round_intro' && roundState.phase !== 'reading';

  const answeringTeam = teams.find(t => t.id === roundState.answeringTeamId);
  const stealEligibleTeam = teams.find(t => t.id === roundState.stealEligibleTeamId);
  const stealCountdown = useCountdownSeconds(
    roundState.phase === 'steal_armed' && !roundState.stealWindowOpen ? roundState.stealWindowExpiresAt : null,
  );
  const [overlayEvent, clearOverlayEvent] = useGameEventOverlay(
    roundState.phase, roundState.resolvedCorrectly, roundState.answeringTeamId, teams,
  );

  // ── Sound effects ── transition-detected against refs (state arrives via 800ms poll,
  // not events — see Survey Says's SSShowComponent.tsx for the same pattern) so each
  // trigger fires exactly once per real transition, not once per poll.
  const prevPhaseForSoundRef = useRef<string | null>(null);
  const prevEliminatedLenRef = useRef<number>(0);
  useEffect(() => {
    const prevPhase = prevPhaseForSoundRef.current;
    const phase = roundState.phase;
    if (phase === 'armed' && prevPhase === 'reading') playRevealSound(letterStyle);
    // Triage: the category answers cascade in once, at round start, instead of per
    // question — same reveal sound, just a different (one-time) trigger point.
    if (phase === 'categories_shown' && prevPhase === 'round_intro') playRevealSound(letterStyle);
    // Triage: every item's prompt+arm happens in one step, from either categories_shown
    // (the first item) or resolved (every one after, skipping 'reading' — see store.ts's
    // next()). Neither of those prevPhase values is reachable for any other flavor, so
    // this doesn't need its own flavor check.
    if (phase === 'armed' && (prevPhase === 'categories_shown' || prevPhase === 'resolved')) playTriageAlertSound();
    // ID Please only — media just revealed (reading -> media_shown). Sound-effect
    // questions play the actual clip instead of the generic chime (it IS the reveal).
    // Songs skip the chime too — the real audio is a separate Spotify Connect call from
    // the host, playing through a different physical device than this browser tab, so a
    // local chime here would either be silent (show-screen device has no speakers wired
    // up, on purpose — the real audio comes from elsewhere) or just an odd double-up
    // against the song fading in. Only image (silent otherwise) gets the chime.
    if (phase === 'media_shown' && prevPhase === 'reading') {
      if (question?.mediaType === 'sound' && question.mediaRef) playMediaFile(question.mediaRef);
      else if (question?.mediaType === 'image') playMediaRevealSound();
    }
    // Only real buzz-ins play the buzz sound — 'answering' -> 'steal' (EXCLUSIVE's
    // automatic handoff after a miss) is not a buzz, nobody pressed anything for it.
    if (phase === 'answering' && prevPhase === 'armed') playBuzzSound();
    if (phase === 'steal' && prevPhase === 'steal_armed') playBuzzSound();
    if (phase === 'resolved' && roundState.resolvedCorrectly) playCorrectSound();
    prevPhaseForSoundRef.current = phase;
  }, [roundState.phase, roundState.resolvedCorrectly, letterStyle]);
  useEffect(() => {
    if (roundState.eliminatedChoices.length > prevEliminatedLenRef.current) playMissSound();
    prevEliminatedLenRef.current = roundState.eliminatedChoices.length;
  }, [roundState.eliminatedChoices.length]);
  const prevStealWindowOpenRef = useRef(false);
  useEffect(() => {
    if (roundState.stealWindowOpen && !prevStealWindowOpenRef.current) playStealWindowOpenSound();
    prevStealWindowOpenRef.current = roundState.stealWindowOpen ?? false;
  }, [roundState.stealWindowOpen]);
  // ID Please, image only — a host Replay tap after media_shown (i.e. once the big
  // overlay below has already receded to the small in-panel thumbnail) briefly re-opens
  // the big overlay as a "look again" beat, then auto-dismisses so it doesn't block
  // gameplay indefinitely. No flash needed while still in media_shown — the overlay's
  // already up, its own key-remount (see MediaImageOverlay usage below) handles replay.
  const IMAGE_REPLAY_FLASH_MS = 4000;
  const [imageReplayFlash, setImageReplayFlash] = useState(false);
  const prevImageReplaySeqRef = useRef(roundState.mediaReplaySeq ?? 0);
  useEffect(() => {
    const seq = roundState.mediaReplaySeq ?? 0;
    const bumped = seq > prevImageReplaySeqRef.current;
    prevImageReplaySeqRef.current = seq;
    if (bumped && question?.mediaType === 'image' && roundState.phase !== 'media_shown') {
      setImageReplayFlash(true);
      const t = setTimeout(() => setImageReplayFlash(false), IMAGE_REPLAY_FLASH_MS);
      return () => clearTimeout(t);
    }
  }, [roundState.mediaReplaySeq]);
  // media_shown: up continuously, no timer, until the host advances to armed. After that,
  // only shown as a temporary Replay-triggered flash (see above) — see MediaImageOverlay's
  // own doc comment for why this needs to be a full-stage overlay rather than inline.
  const showBigImageOverlay = mediaRevealed && question?.mediaType === 'image' && !!question.mediaRef
    && (roundState.phase === 'media_shown' || imageReplayFlash);
  // ID Please only — host tapped Replay. Skips the very first render (ref starts at the
  // current value, not 0) so loading into an already-bumped seq via undo/refresh doesn't
  // spuriously replay the sound.
  const prevMediaReplaySeqRef = useRef(roundState.mediaReplaySeq ?? 0);
  useEffect(() => {
    const seq = roundState.mediaReplaySeq ?? 0;
    if (seq > prevMediaReplaySeqRef.current) {
      if (question?.mediaType === 'sound' && question.mediaRef) playMediaFile(question.mediaRef);
      else if (question?.mediaType === 'image') playMediaRevealSound();
    }
    prevMediaReplaySeqRef.current = seq;
  }, [roundState.mediaReplaySeq]);

  // 'reading' and 'armed' show no status text — the prompt/choices alone are the whole cue.
  // 'answering' also shows nothing: there's no clock/countdown for the initial answer (only
  // TIMED_WINDOW's steal has a real time-pressure concept), so avoid implying one with copy
  // like "on the clock" — the buzz-in overlay already announced who's up.
  let statusText = '';
  if (roundState.phase === 'steal') statusText = `${answeringTeam?.name ?? ''} — STEALING`;
  else if (roundState.phase === 'steal_armed') {
    statusText = roundState.stealWindowOpen
      ? 'STEAL OPEN TO BOTH TEAMS'
      : `${stealEligibleTeam?.name ?? ''} HAS ${stealCountdown ?? 0}s TO STEAL`;
  } else if (roundState.phase === 'resolved') {
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
        <div className="ttoto-score-plate ttoto-gunmetal" style={{ position: 'relative', border: `2px solid ${TTOTO_COLORS.team1}`, boxShadow: `0 0 30px ${rgba(TTOTO_COLORS.team1, 0.28)}` }}>
          <div className="ttoto-metal-brushed" />
          {/* .ttoto-score-plate's clip-path cuts only the top-left corner — rivets avoid it. */}
          <Rivet top={8} right={10} /><Rivet bottom={8} right={10} />
          <div style={{ position: 'relative', fontSize: 16, letterSpacing: 3, color: lighten(TTOTO_COLORS.team1, 0.55) }}>{teams[0].name.toUpperCase()}</div>
          <div style={{ position: 'relative', fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 92, lineHeight: 0.95, color: '#fff', textShadow: `0 0 26px ${rgba(TTOTO_COLORS.team1, 0.6)}` }}>{teams[0].score}</div>
        </div>

        <div className="ttoto-score-plate ttoto-gunmetal" style={{ position: 'relative', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, border: '1px solid #4a5058', padding: '18px 40px 16px 40px' }}>
          <div className="ttoto-metal-brushed" />
          <Rivet top={8} right={10} /><Rivet bottom={8} left={10} /><Rivet bottom={8} right={10} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
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
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <div className="ttoto-a-tag" style={{ background: '#c7d4ea', color: '#0d1b2e', fontSize: 13, fontWeight: 700, letterSpacing: 3, padding: '5px 20px 5px 12px' }}>
              ROUND {round?.roundNumber ?? '—'}
            </div>
            {multiplier !== 1 && <MultiplierBadge multiplier={multiplier} fontSize={13} />}
          </div>
          <div style={{ position: 'relative', fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 32, letterSpacing: 1, color: '#fff', textShadow: '0 0 24px rgba(199,212,234,0.5)' }}>
            {round ? FLAVOR_LABELS[round.flavor].toUpperCase() : ''}
          </div>
        </div>

        <div className="ttoto-score-plate ttoto-gunmetal" style={{ position: 'relative', border: `2px solid ${TTOTO_COLORS.team2}`, boxShadow: `0 0 30px ${rgba(TTOTO_COLORS.team2, 0.28)}`, textAlign: 'right' }}>
          <div className="ttoto-metal-brushed" />
          <Rivet top={8} right={10} /><Rivet bottom={8} right={10} />
          <div style={{ position: 'relative', fontSize: 16, letterSpacing: 3, color: lighten(TTOTO_COLORS.team2, 0.45) }}>{teams[1].name.toUpperCase()}</div>
          <div style={{ position: 'relative', fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 92, lineHeight: 0.95, color: '#fff', textShadow: `0 0 26px ${rgba(TTOTO_COLORS.team2, 0.6)}` }}>{teams[1].score}</div>
        </div>
      </div>

      {/* Question panel */}
      <div className="ttoto-a-panel ttoto-gunmetal" style={{
        position: 'relative', margin: '20px 32px 0 32px',
        border: '1px solid #4a5058', boxShadow: '0 0 26px rgba(120,170,230,0.12)', padding: '16px 28px 20px 28px',
      }}>
        <div className="ttoto-metal-brushed" />
        {/* .ttoto-a-panel's clip-path cuts the top-left/bottom-right corners (same reason
            the existing corner brackets only use tr/bl) — rivets go on the two intact corners. */}
        <Rivet top={9} right={12} /><Rivet bottom={9} left={12} />
        <div className="ttoto-a-tag" style={{ position: 'relative', background: '#c7d4ea', color: '#0d1b2e', fontSize: 13, fontWeight: 800, letterSpacing: 3, padding: '5px 18px 5px 12px', display: 'inline-block', marginBottom: 10 }}>
          {roundState.phase === 'categories_shown' ? 'CATEGORIES' : 'QUESTION'}
        </div>
        <div style={{ position: 'relative', fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 32, letterSpacing: 0.5, textAlign: 'center', color: '#fff' }}>
          {roundState.phase === 'categories_shown' ? 'GET READY…' : question ? question.prompt.toUpperCase() : ''}
        </div>
        {/* ID Please (media_id) only — a corner badge, deliberately `position: absolute`
            so it can NEVER add to this panel's height. Even the earlier "small" 64px
            in-flow thumbnail was enough to push the fixed 1600x900 stage past its budget
            and shove the answer panels off the bottom edge (there's essentially zero
            vertical slack — see MediaImageOverlay's doc comment) — this panel and every
            neighboring block sit at hardcoded pixel heights, no layout resize is safe
            here. Keyed on mediaReplaySeq so a host Replay tap remounts it (song/sound:
            the actual audio replay is driven elsewhere — the host's Spotify call, or the
            sound-effect useEffect above — but the key stays uniform across all three
            types for one simple code path; the pulse is a harmless bonus visual cue for
            the audio types too). Image is hidden while the big MediaImageOverlay (below)
            is up, to avoid showing the same picture twice at once. */}
        {mediaRevealed && question?.mediaType === 'image' && question.mediaRef && !showBigImageOverlay && (
          // Much bigger than the original 52x40 — being position:absolute, it doesn't
          // contribute to this panel's own height at all (that's still driven purely by
          // the prompt text), so it can grow freely without the panel growing with it.
          // The only real constraint is the panel's clip-path, which only notches the
          // top-left and bottom-right corners (see .ttoto-a-panel) — staying 40px clear
          // of the right edge keeps this well outside the bottom-right notch even at
          // this height, so nothing gets clipped.
          <div key={`media-thumb-${roundState.mediaReplaySeq ?? 0}`} className="ttoto-media-pulse"
            style={{ position: 'absolute', top: 10, right: 40, width: 150, height: 105, borderRadius: 5, overflow: 'hidden', boxShadow: '0 0 18px rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <img src={`/ttoto/media/${question.mediaRef}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        {mediaRevealed && (question?.mediaType === 'song' || question?.mediaType === 'sound') && (
          <div key={`media-${roundState.mediaReplaySeq ?? 0}`} className="ttoto-media-pulse"
            style={{ position: 'absolute', top: 12, right: 20, fontSize: 13, letterSpacing: 2, color: TTOTO_COLORS.this, whiteSpace: 'nowrap' }}>
            {question.mediaType === 'song' ? '🎵 PLAYING' : '🔊 PLAYING'}
          </div>
        )}
        <div style={{ position: 'relative', textAlign: 'center', marginTop: 8, fontSize: 15, letterSpacing: 2, color: '#c7d4ea', minHeight: 20 }}>
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
              // "Glowing correct screen, dimmer wrong screen": correct panels get a
              // brightness lift on top of the green recolor; every other panel dims via
              // `recede` once resolved (unchanged from before).
              filter: `drop-shadow(0 12px 0 rgba(0,0,0,0.4)) drop-shadow(0 0 24px ${borderColor}33)${recede ? ' brightness(0.55) saturate(0.6)' : ''}${correct ? ' brightness(1.18)' : ''}`,
              opacity: recede ? 0.7 : 1,
              transition: 'filter 0.4s ease, opacity 0.4s ease, background 0.4s ease, border-color 0.4s ease',
            }}>
              <div className="ttoto-crt-sheen" />
              <div className="ttoto-crt-scanlines" />
              <div className="ttoto-crt-vignette" />
              {missed && <div className="ttoto-crt-static-burst" />}
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

      {showBigImageOverlay && question?.mediaRef && (
        <MediaImageOverlay key={`media-overlay-${roundState.mediaReplaySeq ?? 0}`} mediaRef={question.mediaRef} />
      )}
      {overlayEvent && <GameEventOverlay key={overlayEvent.key} event={overlayEvent} onDone={clearOverlayEvent} />}
    </div>
    </TToTOStage>
  );
}

// ─── Wand Test Overlay ───────────────────────────────────────────────────────
// Straight port of Survey Says's SSWandTestOverlay: listens to the buzzer WebSocket
// directly (not the 800ms state poll — a wand press needs to flash immediately, not up
// to 800ms late) and lights up whichever player pressed. Without this, "Wand Test" opens
// a real judge window server-side (and would flash real hardware LEDs) but gives zero
// on-screen confirmation that anything happened — which is why it looked broken. TToTO
// only ever has 'hardware-player' mode (no SS-style 'hardware-team' fixed 2-wand case),
// so this drops that branch entirely and always renders per-player.

const WAND_FLASH_MS = 1200;

const getBuzzerWsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.port === '4174'
    ? `${window.location.hostname}:3001`
    : window.location.host;
  return `${protocol}//${host}/ws/buzzer`;
};

function TToTOWandTestOverlay({ teams, controllerAssignments }: {
  teams: [TToTOTeam, TToTOTeam]; controllerAssignments: ControllerAssignment[];
}) {
  const [activeWands, setActiveWands] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const soundDebounceRef = useRef<Map<string, number>>(new Map());

  const eligibleIds = useMemo(() => new Set(controllerAssignments.map(a => a.controllerId)), [controllerAssignments]);
  // Ref so the stable WS effect always reads the latest set without re-opening the socket
  // (parent polls state every 800ms -> new array reference -> new Set identity -> would
  // cancel active timers if eligibleIds were in the effect deps).
  const eligibleIdsRef = useRef(eligibleIds);
  eligibleIdsRef.current = eligibleIds;

  useEffect(() => {
    const ws = new WebSocket(getBuzzerWsUrl());
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { type: string; payload: Record<string, unknown> };
        if (msg.type === 'BUZZ_RECEIVED') {
          const cid = String(msg.payload.controllerId ?? '');
          if (!cid || !eligibleIdsRef.current.has(cid)) return;
          // Debounce: ignore repeated events within 400ms (Pico GPIO bounce)
          const now = Date.now();
          if (now - (soundDebounceRef.current.get(cid) ?? 0) < 400) return;
          soundDebounceRef.current.set(cid, now);
          const audio = new Audio('/buzz.mp3');
          void audio.play().catch(() => {});
          setActiveWands(prev => { const s = new Set(prev); s.add(cid); return s; });
          const existing = timersRef.current.get(cid);
          if (existing) clearTimeout(existing);
          const t = setTimeout(() => {
            setActiveWands(prev => { const s = new Set(prev); s.delete(cid); return s; });
            timersRef.current.delete(cid);
          }, WAND_FLASH_MS);
          timersRef.current.set(cid, t);
        }
      } catch { /* ignore */ }
    };
    return () => {
      ws.close();
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: 'radial-gradient(ellipse at 50% 15%, #1a1030 0%, #05070f 60%)',
      fontFamily: "'Barlow Condensed', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{ paddingTop: '3vh', paddingBottom: '2vh', textAlign: 'center' }}>
        <div style={{
          fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 3rem)',
          color: TTOTO_COLORS.warning, letterSpacing: '0.2em', textTransform: 'uppercase',
          textShadow: `0 0 20px ${rgba(TTOTO_COLORS.warning, 0.55)}`,
        }}>
          Teams &amp; Controllers
        </div>
        <div style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1rem)', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>
          Press your wand to test it
        </div>
      </div>

      <div style={{ flex: 1, width: '100%', display: 'flex', gap: '3vw', padding: '0 4vw 4vh 4vw' }}>
        {teams.map((team, ti) => {
          const color = ti === 0 ? TTOTO_COLORS.team1 : TTOTO_COLORS.team2;
          const teamAssignments = controllerAssignments
            .filter(a => a.teamId === team.id)
            .sort((a, b) => Number(a.controllerId) - Number(b.controllerId));

          return (
            <div key={team.id} style={{
              flex: 1, borderRadius: 16,
              background: `radial-gradient(ellipse at 50% 0%, ${rgba(color, 0.13)} 0%, rgba(5,10,25,0.97) 60%)`,
              border: `3px solid ${color}`, boxShadow: `0 0 30px ${rgba(color, 0.27)}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              paddingTop: '3vh', paddingBottom: '3vh',
            }}>
              <div style={{
                fontWeight: 900, fontSize: 'clamp(1.4rem, 2.8vw, 3.5rem)',
                textTransform: 'uppercase', letterSpacing: '0.1em', color,
                textShadow: `0 0 16px ${rgba(color, 0.53)}`, marginBottom: '2vh',
              }}>
                {team.name}
              </div>

              {teamAssignments.length === 0 ? (
                <div style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', textAlign: 'center' }}>
                  No players assigned — set rosters in /gameadmin.
                </div>
              ) : (
                // CSS multi-column (not flex/grid): fills the first column top-to-bottom
                // before starting the second, matching controller numbering order, unlike
                // a row-major grid which would interleave 1,3,5.. / 2,4,6.. across columns.
                // Needed once rosters approach the full 20-wand ceiling — a single column
                // ran off the bottom of the screen (see MAX_POOL).
                <div style={{ columns: teamAssignments.length > 6 ? 2 : 1, columnGap: '1.4vw', width: '100%', padding: '0 4%' }}>
                  {teamAssignments.map(a => {
                    const isActive = activeWands.has(a.controllerId);
                    return (
                      <div key={a.controllerId} style={{
                        display: 'flex', alignItems: 'center', gap: 16, breakInside: 'avoid',
                        borderRadius: 10, border: `2px solid ${isActive ? TTOTO_COLORS.correct : rgba(color, 0.27)}`,
                        background: isActive ? rgba(TTOTO_COLORS.correct, 0.1) : rgba(color, 0.04),
                        boxShadow: isActive ? `0 0 20px ${rgba(TTOTO_COLORS.correct, 0.5)}` : 'none',
                        padding: '8px 14px', marginBottom: '1vh', transition: 'all 0.08s ease',
                      }}>
                        <div style={{
                          minWidth: 38, height: 38, borderRadius: '50%',
                          border: `2px solid ${isActive ? TTOTO_COLORS.correct : color}`,
                          background: isActive ? rgba(TTOTO_COLORS.correct, 0.2) : rgba(color, 0.13),
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <div style={{ fontWeight: 900, fontSize: 'clamp(0.85rem, 1.5vw, 1.5rem)', color: isActive ? TTOTO_COLORS.correct : color, lineHeight: 1 }}>
                            {a.controllerId}
                          </div>
                        </div>
                        <div style={{
                          fontWeight: 700, fontSize: 'clamp(0.9rem, 1.7vw, 1.8rem)',
                          color: isActive ? '#fff' : 'rgba(255,255,255,0.85)', letterSpacing: '0.04em', flex: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {a.playerName}
                        </div>
                        {isActive && (
                          <div style={{ fontWeight: 900, fontSize: 'clamp(0.7rem, 1.2vw, 1.2rem)', color: TTOTO_COLORS.correct, letterSpacing: '0.1em', flexShrink: 0 }}>
                            BUZZ!
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export const TToTOShowComponent = () => {
  const [state, setState] = useState<TToTOState | null>(null);
  useAutoReloadOnNewBuild();

  const refresh = useCallback(async () => {
    try { setState(await getState()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => { void refresh(); }, 800);
    return () => clearInterval(id);
  }, [refresh]);

  // Team-sorting animation: plays whenever randomAssignPlayers() bumps randomizerSeq,
  // and stays up until the host explicitly moves on (any of setShowIntro/beginRound/
  // next/newGame/endGame/etc. catches randomizerDismissSeq up to the current
  // randomizerSeq — see store.ts's dismissRandomizer()). A plain derived comparison,
  // not client-side snapshot/ref bookkeeping — an earlier version snapshotted
  // {showIntro, phase} when the randomizer started and dismissed only once those
  // specific values changed, which got stuck forever if the host's next navigation
  // click happened not to change either one (e.g. clicking "Game Screen" when
  // showIntro was already false from an earlier click) — indistinguishable, from
  // polled state alone, from nothing having happened at all.
  const randomizing = (state?.randomizerSeq ?? 0) > (state?.randomizerDismissSeq ?? 0);

  // Wand test overlay — see TToTOWandTestOverlay above for why this exists at all.
  const [showingWandTest, setShowingWandTest] = useState(false);
  useEffect(() => {
    if (!state) return;
    setShowingWandTest((state.wandTestSeq ?? 0) > 0);
  }, [state?.wandTestSeq]);

  if (!state) {
    return (
      <div style={{ height: '100vh', width: '100vw', background: '#0a1420', color: '#8ea3c4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Connecting…
      </div>
    );
  }

  if (showingWandTest) {
    return <TToTOWandTestOverlay teams={state.teams} controllerAssignments={state.controllerAssignments} />;
  }

  if (randomizing) {
    return (
      <TToTOTeamRandomizer
        teams={state.teams}
        playerPool={state.playerPool}
        controllerAssignments={state.controllerAssignments}
        buzzerMode={state.config.buzzerMode}
        onDone={() => { /* stays until host navigates away */ }}
      />
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
