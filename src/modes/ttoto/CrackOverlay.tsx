import type { CrackVariant } from './types';
import { TTOTO_COLORS, rgba } from './colors';

// Glow color derives from the reserved "incorrect" red (colors.ts) rather than an
// arbitrary pink, so a miss's crack visually ties back to the same red used everywhere
// else "wrong answer" is signaled. The crisp core stays near-white for an "electrical
// fault flash" look.
const CRACK_GLOW = rgba(TTOTO_COLORS.incorrect, 0.32);
const CRACK_CORE = '#fff3f2';

// Path data lifted directly from docs/designs/CrackVariants.dc.html (visual-notes §5) —
// don't redraw, copy. Each variant renders a blurred glow stroke behind a crisp core
// stroke; B and D also carry short branch paths.
const SINGLE_PATH: Record<'A' | 'B' | 'D', { main: string; branches: string[] }> = {
  A: { main: 'M155,15 L185,65 L135,115 L175,175 L125,235 L165,295 L120,355 L150,440', branches: [] },
  B: {
    main: 'M30,15 L90,55 L55,100 L120,135 L80,180 L150,210 L110,255 L170,285 L130,320 L200,345',
    branches: ['M120,135 L160,110 L190,95', 'M80,180 L40,195 L15,225'],
  },
  D: {
    main: 'M300,0 L240,45 L265,90 L200,130 L230,180 L160,220 L195,270 L120,310 L150,360 L80,400',
    branches: ['M200,130 L150,110 L110,125', 'M160,220 L110,205 L70,225', 'M120,310 L70,290 L30,305'],
  },
};

const SPIDER_RAYS = [
  'M150,220 L140,170 L155,130 L145,80',
  'M150,220 L190,180 L210,140 L235,100',
  'M150,220 L210,225 L260,215 L300,230',
  'M150,220 L195,260 L220,300 L245,350',
  'M150,220 L155,270 L140,320 L160,380',
  'M150,220 L100,255 L75,300 L50,345',
  'M150,220 L95,215 L50,225 L15,210',
  'M150,220 L110,180 L85,140 L60,100',
];

export function CrackOverlay({ variant, rotationDeg }: { variant: CrackVariant; rotationDeg: number }) {
  return (
    <div style={{
      position: 'absolute', top: 56, left: '6%', width: '88%', height: '80%', zIndex: 3,
      transform: `rotate(${rotationDeg}deg)`, transformOrigin: '50% 50%', pointerEvents: 'none',
    }}>
      <svg viewBox="0 0 300 460" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }}>
        {variant === 'C' ? (
          <>
            <g fill="none" stroke={CRACK_GLOW} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'blur(3px)' }}>
              {SPIDER_RAYS.map((d, i) => <path key={i} d={d} />)}
            </g>
            <g fill="none" stroke={CRACK_CORE} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}>
              {SPIDER_RAYS.map((d, i) => <path key={i} d={d} />)}
            </g>
            <circle cx={150} cy={220} r={5} fill={CRACK_CORE} opacity={0.9} />
          </>
        ) : (
          <>
            <path d={SINGLE_PATH[variant].main} fill="none" stroke={CRACK_GLOW} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'blur(3px)' }} />
            <path d={SINGLE_PATH[variant].main} fill="none" stroke={CRACK_CORE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
            {SINGLE_PATH[variant].branches.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={CRACK_GLOW} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
            ))}
          </>
        )}
      </svg>
    </div>
  );
}
