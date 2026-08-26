import { TToTOStage } from './TToTOStage';
import { TTOTO_COLORS, rgba } from './colors';

// Ported from docs/designs/ttoto-game-intro.html (user-supplied mockup, 2026-08-25).
// Kept as a raw <style> block + matching markup rather than sx-prop-per-element,
// since the exact keyframe timings/delays are the whole point of this screen and are
// easiest to keep faithful by copying the CSS verbatim. Pixel values are copied as-is
// (not converted to vw/vh) — see TToTOStage.tsx for why: the whole 1600x900 canvas is
// scaled as one unit, so literal px here always keeps its designed proportions.

const INTRO_CSS = `
  /* Per-letter mapping follows the choice colors (colors.ts): This=indigo, That=purple,
     TheOther=pink; o/T stay neutral connective type. */
  .ttoto-intro-bracket-tl { position:absolute; top:28px; left:28px; width:40px; height:40px; border-top:3px solid rgba(242,245,251,0.5); border-left:3px solid rgba(242,245,251,0.5); }
  .ttoto-intro-bracket-tr { position:absolute; top:28px; right:28px; width:40px; height:40px; border-top:3px solid rgba(242,245,251,0.5); border-right:3px solid rgba(242,245,251,0.5); }
  .ttoto-intro-bracket-bl { position:absolute; bottom:28px; left:28px; width:40px; height:40px; border-bottom:3px solid rgba(242,245,251,0.5); border-left:3px solid rgba(242,245,251,0.5); }
  .ttoto-intro-bracket-br { position:absolute; bottom:28px; right:28px; width:40px; height:40px; border-bottom:3px solid rgba(242,245,251,0.5); border-right:3px solid rgba(242,245,251,0.5); }

  .ttoto-intro-stage { position:absolute; top:150px; left:0; right:0; height:150px; text-align:center; font-family:'Big Shoulders Display', sans-serif; font-weight:900; color:#f2f5fb; }
  .ttoto-intro-stage .word { position:absolute; inset:0; opacity:0; }

  @keyframes ttotoWordFadeInOut {
    0%   { opacity:0; transform:translateY(12px); }
    10%  { opacity:1; transform:translateY(0); }
    88%  { opacity:1; }
    100% { opacity:0; }
  }
  .ttoto-w-this  { font-size:108px; letter-spacing:2px; animation: ttotoWordFadeInOut 1550ms linear 100ms both; }
  .ttoto-w-that  { font-size:108px; letter-spacing:2px; animation: ttotoWordFadeInOut 1550ms linear 1700ms both; }
  .ttoto-w-p3    { font-size:66px;  letter-spacing:4px; color:#c7d4ea; animation: ttotoWordFadeInOut 2500ms linear 3300ms both; }

  @keyframes ttotoKeyPulse { 0% { transform:scale(1); } 45% { transform:scale(1.2); } 100% { transform:scale(1); } }
  @keyframes ttotoDimRest   { 0% { opacity:1; } 100% { opacity:0.32; } }

  .ttoto-w-this .key { display:inline-block; color:${TTOTO_COLORS.this}; animation: ttotoKeyPulse 260ms ease-out 750ms both; }
  .ttoto-w-this .rest { display:inline-block; animation: ttotoDimRest 260ms ease-out 750ms forwards; }
  .ttoto-w-that .key { display:inline-block; color:${TTOTO_COLORS.that}; animation: ttotoKeyPulse 260ms ease-out 750ms both; }
  .ttoto-w-that .rest { display:inline-block; animation: ttotoDimRest 260ms ease-out 750ms forwards; }

  .ttoto-w-p3 .sub { display:inline-block; }
  .ttoto-w-p3 .key { display:inline-block; }
  .ttoto-k-or   { animation: ttotoKeyPulse 220ms ease-out 600ms both; color:#c7d4ea; }
  .ttoto-r-or   { animation: ttotoDimRest 220ms ease-out 600ms forwards; }
  .ttoto-k-the  { animation: ttotoKeyPulse 220ms ease-out 1100ms both; color:#f2f5fb; }
  .ttoto-r-the  { animation: ttotoDimRest 220ms ease-out 1100ms forwards; }
  .ttoto-k-other{ animation: ttotoKeyPulse 220ms ease-out 1600ms both; color:${TTOTO_COLORS.the_other}; }
  .ttoto-r-other{ animation: ttotoDimRest 220ms ease-out 1600ms forwards; }

  .ttoto-intro-icon-wrap { position:absolute; top:340px; left:50%; transform:translateX(-50%); width:130px; height:130px; }
  .ttoto-intro-icon-wrap.settled { animation: ttotoIconGlow 3400ms ease-in-out 6100ms infinite; }
  @keyframes ttotoIconGlow {
    0%, 100% { filter: drop-shadow(0 0 10px rgba(255,255,255,0.15)); }
    50% { filter: drop-shadow(0 0 26px rgba(255,255,255,0.38)); }
  }
  .ttoto-blade { transform-box: view-box; opacity:0; }
  @keyframes ttotoDropIn { from { transform: translateY(-190px) scale(0.35); opacity:0; } 30% { opacity:1; } to { transform: translateY(0) scale(1); opacity:1; } }
  .ttoto-blade-1 { animation: ttotoDropIn 480ms cubic-bezier(.22,1.1,.3,1) 950ms forwards; }
  .ttoto-blade-2 { animation: ttotoDropIn 480ms cubic-bezier(.22,1.1,.3,1) 2550ms forwards; }
  .ttoto-blade-3 { animation: ttotoDropIn 480ms cubic-bezier(.22,1.1,.3,1) 4550ms forwards; }

  .ttoto-intro-wordmark { position:absolute; top:520px; left:0; right:0; text-align:center; font-family:'Big Shoulders Display', sans-serif; font-weight:900; font-size:118px; letter-spacing:2px; line-height:1; }
  .ttoto-wm-letter { display:inline-block; opacity:0; }
  @keyframes ttotoWmDropIn { from { transform: translateY(-330px) scale(0.6); opacity:0; } 35% { opacity:1; } to { transform: translateY(0) scale(1); opacity:1; } }
  .ttoto-wm-1 { color:${TTOTO_COLORS.this}; animation: ttotoWmDropIn 500ms cubic-bezier(.22,1.05,.3,1) 950ms forwards; }
  .ttoto-wm-2 { color:${TTOTO_COLORS.that}; animation: ttotoWmDropIn 500ms cubic-bezier(.22,1.05,.3,1) 2550ms forwards; }
  .ttoto-wm-3 { color:#c7d4ea; font-size:0.68em; animation: ttotoWmDropIn 500ms cubic-bezier(.22,1.05,.3,1) 3900ms forwards; }
  .ttoto-wm-4 { color:#f2f5fb; animation: ttotoWmDropIn 500ms cubic-bezier(.22,1.05,.3,1) 4400ms forwards; }
  .ttoto-wm-5 { color:${TTOTO_COLORS.the_other}; animation: ttotoWmDropIn 500ms cubic-bezier(.22,1.05,.3,1) 4900ms forwards; }

  .ttoto-intro-tagline { position:absolute; top:690px; left:0; right:0; text-align:center; font-family:'Barlow Condensed', sans-serif; font-size:26px; letter-spacing:9px; color:#8ea3c4; opacity:0; animation: ttotoFadeUp 600ms cubic-bezier(.2,.8,.3,1) 5900ms forwards; }
  .ttoto-intro-divider { position:absolute; top:740px; left:50%; transform:translateX(-50%) scaleX(0); width:340px; height:4px; background:linear-gradient(90deg, ${TTOTO_COLORS.this}, ${TTOTO_COLORS.that}, ${TTOTO_COLORS.the_other}); border-radius:2px; opacity:0; animation: ttotoWipeIn 600ms cubic-bezier(.3,.8,.3,1) 6050ms forwards; }
  @keyframes ttotoFadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes ttotoWipeIn { to { transform:translateX(-50%) scaleX(1); opacity:1; } }
`;

export function TToTOGameIntro() {
  return (
    <TToTOStage>
      <div style={{
        width: 1600, height: 900,
        background: 'linear-gradient(135deg, #0a3145 0%, #12233f 32%, #1c1030 68%, #12070f 100%)',
        fontFamily: "'Barlow Condensed', system-ui, sans-serif", color: '#f2f5fb',
        position: 'relative', overflow: 'hidden',
      }}>
        <style>{INTRO_CSS}</style>

        <div style={{
          position: 'absolute', inset: 0, backgroundImage:
            `radial-gradient(circle at 10% 90%, ${rgba(TTOTO_COLORS.this, 0.25)}, transparent 46%),` +
            `radial-gradient(circle at 90% 10%, ${rgba(TTOTO_COLORS.that, 0.22)}, transparent 46%),` +
            `radial-gradient(circle at 92% 90%, ${rgba(TTOTO_COLORS.the_other, 0.20)}, transparent 42%),` +
            'repeating-linear-gradient(0deg, rgba(140,190,220,0.05) 0px, rgba(140,190,220,0.05) 1px, transparent 1px, transparent 64px),' +
            'repeating-linear-gradient(90deg, rgba(140,190,220,0.05) 0px, rgba(140,190,220,0.05) 1px, transparent 1px, transparent 64px)',
        }} />

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: `linear-gradient(90deg, ${TTOTO_COLORS.this}, ${TTOTO_COLORS.that}, ${TTOTO_COLORS.the_other})`, boxShadow: `0 0 22px ${rgba(TTOTO_COLORS.that, 0.3)}` }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: `linear-gradient(90deg, ${TTOTO_COLORS.the_other}, ${TTOTO_COLORS.that}, ${TTOTO_COLORS.this})`, boxShadow: `0 0 22px ${rgba(TTOTO_COLORS.that, 0.3)}` }} />

        <div className="ttoto-intro-bracket-tl" />
        <div className="ttoto-intro-bracket-tr" />
        <div className="ttoto-intro-bracket-bl" />
        <div className="ttoto-intro-bracket-br" />

        <div className="ttoto-intro-stage">
          <div className="word ttoto-w-this"><span className="key">T</span><span className="rest">HIS</span></div>
          <div className="word ttoto-w-that"><span className="key">T</span><span className="rest">HAT</span></div>
          <div className="word ttoto-w-p3">
            <span className="sub"><span className="key ttoto-k-or">O</span><span className="rest ttoto-r-or">R</span></span>&nbsp;
            <span className="sub"><span className="key ttoto-k-the">T</span><span className="rest ttoto-r-the">HE</span></span>&nbsp;
            <span className="sub"><span className="key ttoto-k-other">O</span><span className="rest ttoto-r-other">THER</span></span>
          </div>
        </div>

        <div className="ttoto-intro-icon-wrap settled">
          <svg width="130" height="130" viewBox="0 0 64 64">
            <g strokeWidth={7} strokeLinecap="round" fill="none">
              <g className="ttoto-blade ttoto-blade-1"><path d="M14 12 L34 32 L14 52" stroke={TTOTO_COLORS.this} transform="rotate(0 32 32)" /></g>
              <g className="ttoto-blade ttoto-blade-2"><path d="M14 12 L34 32 L14 52" stroke={TTOTO_COLORS.that} transform="rotate(120 32 32)" /></g>
              <g className="ttoto-blade ttoto-blade-3"><path d="M14 12 L34 32 L14 52" stroke={TTOTO_COLORS.the_other} transform="rotate(240 32 32)" /></g>
            </g>
          </svg>
        </div>

        <div className="ttoto-intro-wordmark">
          <span className="ttoto-wm-letter ttoto-wm-1">T</span>
          <span className="ttoto-wm-letter ttoto-wm-2">T</span>
          <span className="ttoto-wm-letter ttoto-wm-3">o</span>
          <span className="ttoto-wm-letter ttoto-wm-4">T</span>
          <span className="ttoto-wm-letter ttoto-wm-5">O</span>
        </div>

        <div className="ttoto-intro-tagline">THIS &middot; THAT &middot; OR THE OTHER</div>
        <div className="ttoto-intro-divider" />
      </div>
    </TToTOStage>
  );
}
