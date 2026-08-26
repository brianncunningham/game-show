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

// ─── Global CSS (ported from docs/designs/reference-combo-screen.html + LetterStyles.dc.html) ──

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
  .ttoto-flap-cell .face-this  { background:linear-gradient(to bottom,#8a3a37 0 50%,#5c221f 50% 100%); color:#ffd8d6; }
  .ttoto-flap-cell .face-that  { background:linear-gradient(to bottom,#f0ae4e 0 50%,#d38a26 50% 100%); color:#2a1a04; }
  .ttoto-flap-cell .face-other { background:linear-gradient(to bottom,#4fb9cf 0 50%,#237e8f 50% 100%); color:#06222a; }
  .ttoto-win-gold .face { background:linear-gradient(to bottom,#ffe08a 0 50%,#ffb020 50% 100%) !important; color:#2e1c06 !important; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4), 0 0 22px 3px rgba(255,215,0,0.55) !important; }

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
  .ttoto-dotmatrix-text.won { color:#ffd76a; text-shadow: 0 0 6px rgba(255,215,100,0.95), 0 0 20px rgba(255,200,60,0.7); }

  .ttoto-segment-panel { background:#170905; border:1px solid #3a1408; padding:14px 18px; position:relative; display:inline-block; }
  .ttoto-segment-stack { position:relative; display:inline-block; }
  .ttoto-segment-ghost { font-family:'Share Tech Mono', monospace; font-size:clamp(20px, 3.2vw, 38px); letter-spacing:6px; color:#5a2818; position:absolute; inset:0; user-select:none; white-space: nowrap; }
  .ttoto-segment-lit { font-family:'Share Tech Mono', monospace; font-size:clamp(20px, 3.2vw, 38px); color:#ff6a3d; position:relative;
    text-shadow: 0 0 6px rgba(255,106,61,0.9), 0 0 20px rgba(255,106,61,0.6), 0 0 40px rgba(255,106,61,0.28);
    white-space: nowrap; display:inline-flex; gap:6px; }
  .ttoto-segment-lit.won { color:#ffd76a; text-shadow: 0 0 6px rgba(255,215,100,0.95), 0 0 20px rgba(255,200,60,0.7); }
  /* Fast per-character scramble-then-resolve (departure-board / terminal-decrypt style) —
     the segmented display's equivalent of split-flap's tile cascade. */
  .ttoto-seg-char { transition: opacity 0.05s linear, filter 0.05s linear; }
  .ttoto-seg-flicker { opacity:0.32; filter:brightness(2.4); }
`;

const CHOICE_ORDER: TToTOChoiceKey[] = ['this', 'that', 'the_other'];
const CHOICE_VARIANT: Record<TToTOChoiceKey, LetterVariant> = { this: 'this', that: 'that', the_other: 'other' };
const CHOICE_COLOR: Record<TToTOChoiceKey, string> = { this: '#e0625f', that: '#ffb020', the_other: '#3ec2d9' };
const CHOICE_TAG_BG: Record<TToTOChoiceKey, string> = { this: '#e0625f', that: '#ffb020', the_other: '#3ec2d9' };
const CHOICE_LABEL: Record<TToTOChoiceKey, string> = { this: 'THIS', that: 'THAT', the_other: 'THE OTHER' };

// ─── Split-flap row (imperative DOM cascade) ────────────────────────────────

function SplitFlapRow({ variant, word, revealed, won }: { variant: LetterVariant; word: string; revealed: boolean; won: boolean }) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const builtLenRef = useRef<number>(-1);
  const prevRevealedRef = useRef<boolean>(false);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    if (builtLenRef.current !== word.length) {
      buildFlapRow(el, word.length, variant, { width: 52, height: 86 });
      builtLenRef.current = word.length;
      prevRevealedRef.current = false;
    }
    if (revealed && !prevRevealedRef.current) {
      cascadeFlapRow(el, word.toUpperCase());
    } else if (!revealed) {
      resetFlapRow(el);
    }
    prevRevealedRef.current = revealed;
  }, [word, revealed, variant]);

  return <div ref={rowRef} className={`ttoto-flap-row${won ? ' ttoto-win-gold' : ''}`} style={{ gap: 6 }} />;
}

function DotMatrixRow({ word, revealed, won }: { word: string; revealed: boolean; won: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<DotMatrixHandle | null>(null);
  const builtLenRef = useRef<number>(-1);
  const prevRevealedRef = useRef<boolean>(false);
  const prevWonRef = useRef<boolean>(false);
  // The canvas plays the noise-then-approximate-resolve flourish; once it settles we cross-
  // fade to the crisp real-text layer underneath (see CSS) for the actual resting display.
  const [settled, setSettled] = useState(false);
  const width = Math.max(word.length, 1) * 50;
  const height = 84;

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    if (builtLenRef.current !== word.length) {
      handleRef.current = setupDotMatrix(el);
      builtLenRef.current = word.length;
      prevRevealedRef.current = false;
      prevWonRef.current = false;
    }
    const handle = handleRef.current;
    if (!handle) return;
    if (revealed && (!prevRevealedRef.current || (won && !prevWonRef.current))) {
      setSettled(false);
      handle.cascade(word.toUpperCase(), won, () => setSettled(true));
    } else if (!revealed) {
      setSettled(false);
      handle.reset();
    }
    prevRevealedRef.current = revealed;
    prevWonRef.current = won;
  }, [word, revealed, won]);

  return (
    <div className="ttoto-dotmatrix-panel">
      <div className="ttoto-dotmatrix-stack" style={{ width, height }}>
        <canvas ref={canvasRef} className={`ttoto-dotmatrix-canvas${settled ? ' settled' : ''}`} style={{ width, height }} />
        <div className={`ttoto-dotmatrix-text${settled ? ' settled' : ''}${won ? ' won' : ''}`} style={{ fontSize: Math.round(height * 0.5) }}>
          {word.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function SegmentedRow({ word, revealed, won }: { word: string; revealed: boolean; won: boolean }) {
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
      cascadeSegmentedRow(el, word.toUpperCase());
    } else if (!revealed) {
      resetSegmentedRow(el);
    }
    prevRevealedRef.current = revealed;
  }, [word, revealed]);

  return (
    <div className="ttoto-segment-panel">
      <div className="ttoto-segment-stack">
        <div className="ttoto-segment-ghost">{ghost}</div>
        <div ref={rowRef} className={`ttoto-segment-lit${won ? ' won' : ''}`} />
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

function RoundIntroScreen({ round }: { round: TToTORound | undefined }) {
  return (
    <TToTOStage>
      <div style={{
        width: 1600, height: 900,
        background: 'linear-gradient(135deg, #0a3145 0%, #12233f 32%, #1c1030 68%, #12070f 100%)',
        fontFamily: "'Barlow Condensed', system-ui, sans-serif", color: '#f2f5fb',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
      }}>
        <div className="ttoto-a-tag" style={{ background: '#ffb020', color: '#2e1c06', fontSize: 20, fontWeight: 700, letterSpacing: 4, padding: '8px 30px 8px 18px' }}>
          ROUND {round?.roundNumber ?? '—'}
        </div>
        <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 100, letterSpacing: 1, textShadow: '0 0 30px rgba(255,176,32,0.5)', textAlign: 'center' }}>
          {round ? FLAVOR_LABELS[round.flavor].toUpperCase() : ''}
        </div>
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
        <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 72, letterSpacing: 2, color: '#ffb020', textShadow: '0 0 30px rgba(255,176,32,0.5)' }}>
          GAME OVER
        </div>
        <div style={{ display: 'flex', gap: 60 }}>
          {state.teams.map((t) => (
            <div key={t.id} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, letterSpacing: 3, color: winner?.id === t.id ? '#ffd98a' : '#8ea3c4' }}>{t.name}</div>
              <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 88 }}>{t.score}</div>
            </div>
          ))}
        </div>
        {winner && (
          <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 32, color: '#fff', textShadow: '0 0 20px rgba(255,255,255,0.4)' }}>
            {winner.name} WINS!
          </div>
        )}
      </div>
    </TToTOStage>
  );
}

// ─── Main combo screen (header + question + 3 answer panels) ───────────────

function ComboScreen({ state }: { state: TToTOState }) {
  const { roundState, teams, rounds } = state;
  const round = rounds[roundState.currentRoundIndex];
  const question = round?.questions[roundState.currentQuestionIndex];
  const letterStyle: LetterStyle = round?.letterStyle ?? 'split_flap';

  const choicesRevealed = roundState.phase === 'armed' || roundState.phase === 'answering'
    || roundState.phase === 'steal' || roundState.phase === 'resolved';

  const answeringTeam = teams.find(t => t.id === roundState.answeringTeamId);

  let statusText = '';
  if (roundState.phase === 'reading') statusText = 'HOST READING…';
  else if (roundState.phase === 'armed') statusText = 'BUZZERS ARMED — WAITING FOR BUZZ';
  else if (roundState.phase === 'answering') statusText = `${answeringTeam?.name ?? ''} — ON THE CLOCK`;
  else if (roundState.phase === 'steal') statusText = `${answeringTeam?.name ?? ''} — STEALING`;
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
          'radial-gradient(circle at 12% 90%, rgba(62,194,217,0.30), transparent 46%),' +
          'radial-gradient(circle at 90% 8%, rgba(255,176,32,0.26), transparent 46%),' +
          'radial-gradient(circle at 92% 90%, rgba(224,98,95,0.20), transparent 42%),' +
          'repeating-linear-gradient(0deg, rgba(140,190,220,0.07) 0px, rgba(140,190,220,0.07) 1px, transparent 1px, transparent 64px),' +
          'repeating-linear-gradient(90deg, rgba(140,190,220,0.07) 0px, rgba(140,190,220,0.07) 1px, transparent 1px, transparent 64px)',
      }} />
      <div style={{ position: 'relative', height: 12, background: 'linear-gradient(90deg, #e0625f, #ffb020, #3ec2d9)', boxShadow: '0 0 22px rgba(255,176,32,0.35)' }} />

      {/* Header */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px 0 32px' }}>
        <div className="ttoto-score-plate" style={{ background: 'linear-gradient(160deg, #1a4a44, #0c2622)', border: '2px solid #3ec2d9', boxShadow: '0 0 30px rgba(62,194,217,0.28)' }}>
          <div style={{ fontSize: 16, letterSpacing: 3, color: '#8fe9dc' }}>{teams[0].name.toUpperCase()}</div>
          <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 92, lineHeight: 0.95, color: '#fff', textShadow: '0 0 26px rgba(62,194,217,0.6)' }}>{teams[0].score}</div>
        </div>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width={52} height={52} viewBox="0 0 64 64" style={{ flex: 'none' }}>
              <g strokeWidth={7} strokeLinecap="round" fill="none">
                <path d="M14 12 L34 32 L14 52" stroke="#e0625f" transform="rotate(0 32 32)" />
                <path d="M14 12 L34 32 L14 52" stroke="#ffb020" transform="rotate(120 32 32)" />
                <path d="M14 12 L34 32 L14 52" stroke="#3ec2d9" transform="rotate(240 32 32)" />
              </g>
            </svg>
            <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 56, letterSpacing: 1, lineHeight: 1 }}>
              <span style={{ color: '#e0625f' }}>T</span><span style={{ color: '#ffb020' }}>T</span>
              <span style={{ color: '#c7d4ea', fontSize: '0.68em' }}>o</span>
              <span style={{ color: '#f2f5fb' }}>T</span><span style={{ color: '#3ec2d9' }}>O</span>
            </div>
          </div>
          <div className="ttoto-a-tag" style={{ background: '#ffb020', color: '#2e1c06', fontSize: 13, fontWeight: 700, letterSpacing: 3, padding: '5px 20px 5px 12px', marginTop: 2 }}>
            ROUND {round?.roundNumber ?? '—'}
          </div>
          <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 32, letterSpacing: 1, color: '#fff', textShadow: '0 0 24px rgba(255,176,32,0.5)' }}>
            {round ? FLAVOR_LABELS[round.flavor].toUpperCase() : ''}
          </div>
        </div>

        <div className="ttoto-score-plate" style={{ background: 'linear-gradient(160deg, #4a3410, #26190a)', border: '2px solid #ffb020', boxShadow: '0 0 30px rgba(255,176,32,0.28)', textAlign: 'right' }}>
          <div style={{ fontSize: 16, letterSpacing: 3, color: '#ffd98a' }}>{teams[1].name.toUpperCase()}</div>
          <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 92, lineHeight: 0.95, color: '#fff', textShadow: '0 0 26px rgba(255,176,32,0.6)' }}>{teams[1].score}</div>
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
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 15, letterSpacing: 2, color: '#ffd98a', minHeight: 20 }}>
          {statusText}
        </div>
      </div>

      {/* Answer panels */}
      <div style={{ position: 'relative', display: 'flex', gap: 20, margin: '18px 32px 0 32px', height: 460 }}>
        {CHOICE_ORDER.map((choice) => {
          const missed = roundState.eliminatedChoices.includes(choice);
          const correct = roundState.phase === 'resolved' && roundState.correctChoice === choice;
          const crack = roundState.choiceCracks[choice];
          const color = CHOICE_COLOR[choice];
          const word = roundState.displayChoices?.[choice] ?? '';

          return (
            <div key={choice} className="ttoto-a-panel" style={{
              flex: 1, position: 'relative', padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              background: missed
                ? 'linear-gradient(125deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 36%), linear-gradient(160deg, #4a1418, #2a0c10)'
                : `linear-gradient(125deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 36%), linear-gradient(160deg, ${color}22, #0a1c28)`,
              border: `2px solid ${missed ? '#e0625f' : color}`,
              boxShadow: correct ? '0 0 46px rgba(255,215,0,0.45)' : undefined,
              filter: `drop-shadow(0 12px 0 rgba(0,0,0,0.4)) drop-shadow(0 0 24px ${color}33)`,
            }}>
              <div className="ttoto-a-bracket-tr" style={{ borderTop: `3px solid ${color}`, borderRight: `3px solid ${color}` }} />
              <div className="ttoto-a-bracket-bl" style={{ borderBottom: `3px solid ${color}`, borderLeft: `3px solid ${color}` }} />
              <div className="ttoto-a-tag" style={{ background: CHOICE_TAG_BG[choice], color: '#141414', fontSize: 16, fontWeight: 700, letterSpacing: 3, padding: '9px 24px 9px 16px', alignSelf: 'flex-start' }}>
                {CHOICE_LABEL[choice]}
              </div>
              <div style={{ position: 'absolute', top: 16, right: 20, fontSize: 13, letterSpacing: 2, color: missed ? '#ffd0ce' : correct ? '#ffe9b0' : '#bdeef7' }}>
                {missed ? 'SIGNAL LOST' : correct ? 'CORRECT' : 'AVAILABLE'}
              </div>

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
        if (state.roundState.phase === 'round_intro') return <RoundIntroScreen round={state.rounds[state.roundState.currentRoundIndex]} />;
        if (state.roundState.phase === 'game_over') return <GameOverScreen state={state} />;
        return <ComboScreen state={state} />;
      })()}
    </>
  );
};

export default TToTOShowComponent;
