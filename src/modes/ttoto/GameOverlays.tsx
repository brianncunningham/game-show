import { useEffect, useRef, useState } from 'react';
import { TTOTO_COLORS, rgba } from './colors';
import type { TToTOPhase, TToTOTeam } from './types';

// Transient full-screen event overlays for the show screen — buzzing in, a steal handoff,
// and the correct/miss resolution. Loosely modeled on Survey Says's transient overlays
// (StealResultOverlay, the strike "X" flash) but not copied 1:1: TToTO's three-choice panels
// already carry a lot of the "what happened" information (crack/glow/label), so these are
// kept as a quick punchy beat rather than a large blocking banner — a jolt of feedback for
// the room's attention, not new information the panels don't already show.

export type OverlayKind = 'buzz' | 'steal' | 'correct' | 'miss';

interface OverlayEvent {
  kind: OverlayKind;
  teamName?: string;
  key: number;
}

const OVERLAY_DURATIONS: Record<OverlayKind, number> = {
  buzz: 1100,
  steal: 1300,
  correct: 1800,
  miss: 1500,
};

const OVERLAY_CSS = `
  @keyframes ttotoOverlayIn {
    0%   { opacity: 0; transform: scale(0.8); }
    18%  { opacity: 1; transform: scale(1.06); }
    30%  { transform: scale(1); }
    78%  { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.02); }
  }
  @keyframes ttotoOverlayBgIn {
    0%   { opacity: 0; }
    18%  { opacity: 1; }
    78%  { opacity: 1; }
    100% { opacity: 0; }
  }
`;

function overlayContent(kind: OverlayKind, teamName?: string): { color: string; icon: string; title: string; subtitle?: string } {
  switch (kind) {
    case 'buzz':
      return { color: TTOTO_COLORS.warning, icon: '⚡', title: `${(teamName ?? 'TEAM').toUpperCase()} BUZZED IN!` };
    case 'steal':
      return { color: TTOTO_COLORS.warning, icon: '⟳', title: `${(teamName ?? 'TEAM').toUpperCase()} — STEAL!`, subtitle: 'ONE CHANCE TO TAKE IT' };
    case 'correct':
      return { color: TTOTO_COLORS.correct, icon: '✓', title: 'CORRECT!', subtitle: teamName ? `${teamName.toUpperCase()} SCORES` : undefined };
    case 'miss':
      return { color: TTOTO_COLORS.incorrect, icon: '✕', title: 'MISSED' };
  }
}

/**
 * Watches round-state phase transitions and produces a one-shot overlay event for each of:
 * first buzz-in, entering a steal, and the final resolution (correct or double-miss).
 * Returns [event, clear] — the caller renders <GameEventOverlay> while event is non-null and
 * calls clear() when its animation finishes.
 */
export function useGameEventOverlay(
  phase: TToTOPhase,
  resolvedCorrectly: boolean | null,
  answeringTeamId: string | null,
  teams: [TToTOTeam, TToTOTeam],
): [OverlayEvent | null, () => void] {
  const [event, setEvent] = useState<OverlayEvent | null>(null);
  const prevPhaseRef = useRef<TToTOPhase | null>(null);
  const keyRef = useRef(0);

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    if (phase !== prevPhase) {
      const teamName = teams.find(t => t.id === answeringTeamId)?.name;
      if (phase === 'answering' && prevPhase === 'armed') {
        keyRef.current += 1;
        setEvent({ kind: 'buzz', teamName, key: keyRef.current });
      } else if (phase === 'steal') {
        keyRef.current += 1;
        setEvent({ kind: 'steal', teamName, key: keyRef.current });
      } else if (phase === 'resolved') {
        keyRef.current += 1;
        setEvent({ kind: resolvedCorrectly ? 'correct' : 'miss', teamName, key: keyRef.current });
      }
    }
    prevPhaseRef.current = phase;
  }, [phase, resolvedCorrectly, answeringTeamId, teams]);

  return [event, () => setEvent(null)];
}

export function GameEventOverlay({ event, onDone }: { event: OverlayEvent; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, OVERLAY_DURATIONS[event.kind]);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.key]);

  const { color, icon, title, subtitle } = overlayContent(event.kind, event.teamName);
  const durationMs = OVERLAY_DURATIONS[event.kind];

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <style>{OVERLAY_CSS}</style>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 50%, ${rgba(color, 0.35)}, transparent 65%)`,
        animation: `ttotoOverlayBgIn ${durationMs}ms ease-out both`,
      }} />
      <div style={{ position: 'relative', textAlign: 'center', animation: `ttotoOverlayIn ${durationMs}ms cubic-bezier(.2,.8,.3,1) both` }}>
        <div style={{ fontSize: 90, lineHeight: 1, color, textShadow: `0 0 40px ${rgba(color, 0.9)}, 0 0 80px ${rgba(color, 0.5)}` }}>
          {icon}
        </div>
        <div style={{
          fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 64, letterSpacing: 2, color: '#fff',
          textShadow: `0 0 30px ${rgba(color, 0.8)}`, marginTop: 8,
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, letterSpacing: 6, color, marginTop: 6 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
