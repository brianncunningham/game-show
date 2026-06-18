import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { SurveySaysState, SurveyTeam } from './types';
import { getState } from './api';
import { SSTeamRandomizer } from './SSTeamRandomizer';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAM_COLORS = ['#00e5ff', '#ff6a00'] as const;
const GOLD = '#f5c518';
const BG = '#05071a';
const HALFTONE_DOT = 'radial-gradient(circle, #ffffff0a 1px, transparent 1.5px)';

const MULTIPLIER_LABELS: Record<number, string> = {
  2: 'DOUBLE POINTS',
  3: 'TRIPLE POINTS',
  4: 'QUADRUPLE POINTS',
};

const fontSx = { fontFamily: '"Barlow Condensed", Impact, sans-serif' };

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScorePanel({ team, active, colorHex, player }: { team: SurveyTeam; active: boolean; colorHex: string; player?: string | null }) {
  return (
    <Box sx={{
      width: 'clamp(160px, 18vw, 240px)',
      flexShrink: 0,
      border: active ? `4px solid ${colorHex}` : `2px solid ${colorHex}55`,
      borderRadius: 2,
      px: 2,
      py: 1.5,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: active
        ? `${HALFTONE_DOT}, radial-gradient(ellipse at 50% 30%, ${colorHex}55 0%, #080a1a 70%)`
        : `${HALFTONE_DOT}, #080a1acc`,
      backgroundSize: '6px 6px, 100%',
      transition: 'all 0.4s ease',
      animation: active ? `ssActiveGlow_${colorHex.replace('#', '')} 1.4s ease-in-out infinite` : 'none',
      [`@keyframes ssActiveGlow_${colorHex.replace('#', '')}`]: {
        '0%, 100%': { boxShadow: `0 0 20px ${colorHex}dd, 0 0 45px ${colorHex}88, 0 0 80px ${colorHex}44, inset 0 0 18px ${colorHex}33` },
        '50%': { boxShadow: `0 0 35px ${colorHex}ff, 0 0 70px ${colorHex}cc, 0 0 120px ${colorHex}66, inset 0 0 28px ${colorHex}55` },
      },
      boxShadow: active ? undefined : `0 0 15px ${colorHex}33, 0 0 30px ${colorHex}11`,
    }}>
      <Typography sx={{
        ...fontSx,
        fontSize: 'clamp(0.85rem, 1.6vw, 1.2rem)',
        color: active ? colorHex : colorHex + 'aa',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        textShadow: active ? `0 0 16px ${colorHex}` : 'none',
      }}>
        {team.name}
      </Typography>
      <Typography sx={{
        ...fontSx,
        fontSize: 'clamp(2.8rem, 5.5vw, 5rem)',
        color: active ? '#fff' : '#ffffffcc',
        fontWeight: 900,
        lineHeight: 1,
        textShadow: active ? `0 0 30px ${colorHex}88` : 'none',
      }}>
        {team.score}
      </Typography>
      {active && player && (
        <Box sx={{
          mt: 0.75,
          px: 1.25,
          py: 0.3,
          borderRadius: 999,
          border: `1.5px solid ${colorHex}`,
          background: `${colorHex}22`,
          maxWidth: '100%',
        }}>
          <Typography sx={{
            ...fontSx,
            fontSize: 'clamp(0.8rem, 1.5vw, 1.3rem)',
            color: '#fff',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: `0 0 12px ${colorHex}`,
          }}>
            {player}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function QuestionPanel({ question, boardSlotsVisible, buzzArmed }: { question: string; boardSlotsVisible: boolean; buzzArmed: boolean }) {
  return (
    <Box sx={{
      flex: 1,
      border: `2px solid ${buzzArmed ? '#4fc3f7' : GOLD + '55'}`,
      borderRadius: 2,
      px: 3,
      py: 1.5,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      background: `${HALFTONE_DOT}, linear-gradient(135deg, #0a0e2a 0%, #0d1235 100%)`,
      backgroundSize: '6px 6px, 100%',
      boxShadow: buzzArmed ? `0 0 32px #4fc3f788` : `0 0 24px ${GOLD}22`,
      transition: 'border-color 0.4s, box-shadow 0.4s',
      position: 'relative',
    }}>
      {/* SURVEY SAYS emblem badge - always visible, overlaps top */}
      <Box sx={{
        position: 'absolute',
        top: -28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Box sx={{
          position: 'relative',
          width: 'clamp(180px, 24vw, 280px)',
          height: 'clamp(50px, 7vh, 70px)',
          borderRadius: '50%',
          border: `3px solid ${GOLD}`,
          background: `${HALFTONE_DOT}, radial-gradient(ellipse at 50% 50%, #1a0e30, #0d0620)`,
          backgroundSize: '6px 6px, 100%',
          boxShadow: `0 0 20px ${GOLD}88, 0 0 40px ${GOLD}44, inset 0 0 15px ${GOLD}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: -8,
            borderRadius: '50%',
            background: `repeating-conic-gradient(from 0deg, ${GOLD}dd 0deg 12deg, transparent 12deg 24deg)`,
            opacity: 0.6,
            zIndex: -1,
          },
        }}>
          <Typography sx={{
            ...fontSx,
            fontSize: 'clamp(0.9rem, 1.6vw, 1.4rem)',
            color: GOLD,
            fontWeight: 900,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            textShadow: `0 0 12px ${GOLD}cc`,
          }}>
            SURVEY SAYS
          </Typography>
        </Box>
      </Box>

      {boardSlotsVisible && question ? (
        <Typography sx={{
          ...fontSx,
          fontSize: 'clamp(1rem, 2.2vw, 1.8rem)',
          color: '#fff',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          textAlign: 'center',
          lineHeight: 1.2,
          mt: 2,
        }}>
          {question}
        </Typography>
      ) : null}
      {buzzArmed && (
        <Typography sx={{
          ...fontSx,
          fontSize: 'clamp(0.75rem, 1.4vw, 1.1rem)',
          color: '#4fc3f7',
          fontWeight: 900,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          animation: 'ssBuzzPulse 0.9s ease-in-out infinite',
          '@keyframes ssBuzzPulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.3 },
          },
        }}>
          ● BUZZ IN
        </Typography>
      )}
    </Box>
  );
}

function AnswerSlot({ rank, text, points, revealed, animIndex }: {
  rank: number; text: string; points: number; revealed: boolean; animIndex: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), animIndex * 80);
    return () => clearTimeout(t);
  }, [animIndex]);

  if (!visible) return null;

  return (
    <Box sx={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      border: `2px solid ${revealed ? GOLD : GOLD + '33'}`,
      borderRadius: 2,
      px: 'clamp(10px, 1.5vw, 20px)',
      background: revealed
        ? `${HALFTONE_DOT}, linear-gradient(90deg, #0d1020ee, #0a0d18ee)`
        : `${HALFTONE_DOT}, #080b1cee`,
      backgroundSize: '6px 6px, 100%',
      gap: 'clamp(10px, 1.5vw, 18px)',
      boxShadow: revealed ? `0 0 20px ${GOLD}33, inset 0 0 12px ${GOLD}11` : 'none',
      transition: 'border-color 0.3s, background 0.3s, box-shadow 0.3s',
      animation: revealed ? 'ssFlipIn 0.35s ease-out' : 'ssFadeIn 0.25s ease-out',
      minHeight: 0,
      '@keyframes ssFlipIn': {
        from: { opacity: 0, transform: 'scaleY(0.15)' },
        to: { opacity: 1, transform: 'scaleY(1)' },
      },
      '@keyframes ssFadeIn': {
        from: { opacity: 0, transform: 'scale(0.93)' },
        to: { opacity: 1, transform: 'scale(1)' },
      },
    }}>
      <Box sx={{
        width: 'clamp(28px, 3.5vw, 48px)',
        height: 'clamp(28px, 3.5vw, 48px)',
        borderRadius: '50%',
        border: `2px solid ${GOLD}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: revealed ? GOLD + '28' : 'transparent',
      }}>
        <Typography sx={{ ...fontSx, fontSize: 'clamp(0.9rem, 1.8vw, 1.5rem)', color: GOLD, fontWeight: 900, lineHeight: 1 }}>
          {rank}
        </Typography>
      </Box>
      {revealed ? (
        <>
          <Typography sx={{ ...fontSx, flex: 1, fontSize: 'clamp(1rem, 2.2vw, 1.9rem)', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1 }}>
            {text}
          </Typography>
          <Typography sx={{ ...fontSx, fontSize: 'clamp(1rem, 2.2vw, 1.9rem)', color: GOLD, fontWeight: 900, flexShrink: 0, lineHeight: 1 }}>
            {points}
          </Typography>
        </>
      ) : (
        <Box sx={{ flex: 1 }} />
      )}
    </Box>
  );
}

function StrikesPanel({ count }: { count: number }) {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'clamp(4px, 0.8vh, 10px)',
      border: `2px solid #d946ef`,
      borderRadius: 2,
      px: 'clamp(12px, 2vw, 28px)',
      background: `${HALFTONE_DOT}, #080b1ccc`,
      backgroundSize: '6px 6px, 100%',
      minWidth: 'clamp(100px, 14vw, 180px)',
      boxShadow: '0 0 20px #d946ef44',
    }}>
      <Typography sx={{ ...fontSx, fontSize: 'clamp(0.7rem, 1.1vw, 0.95rem)', color: '#ffffff55', fontWeight: 700, letterSpacing: '0.14em' }}>
        STRIKES
      </Typography>
      <Box sx={{ display: 'flex', gap: 'clamp(6px, 1vw, 14px)' }}>
        {[0, 1, 2].map(i => (
          <Box key={i} sx={{
            width: 'clamp(28px, 3.5vw, 46px)',
            height: 'clamp(28px, 3.5vw, 46px)',
            borderRadius: '50%',
            border: `2px solid ${i < count ? '#ff2020' : '#666'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: i < count ? '#ff202033' : 'transparent',
            boxShadow: i < count ? '0 0 14px #ff202066' : 'none',
            transition: 'all 0.25s',
          }}>
            <Typography sx={{
              ...fontSx,
              fontSize: 'clamp(0.9rem, 1.6vw, 1.4rem)',
              color: i < count ? '#ff2020' : '#666',
              fontWeight: 900,
              lineHeight: 1,
            }}>✕</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function MultiplierPanel({ mult }: { mult: number }) {
  if (mult <= 1) return null;
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `3px solid ${GOLD}`,
      borderRadius: 1,
      px: 'clamp(12px, 2vw, 28px)',
      background: `${HALFTONE_DOT}, linear-gradient(135deg, #1a0e30, #2a1540)`,
      backgroundSize: '6px 6px, 100%',
      boxShadow: `0 0 24px ${GOLD}55, inset 0 0 20px ${GOLD}11`,
      minWidth: 'clamp(140px, 18vw, 240px)',
      clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: -6,
        border: `2px solid ${GOLD}88`,
        clipPath: 'polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)',
        pointerEvents: 'none',
      },
    }}>
      <Typography sx={{ ...fontSx, fontSize: 'clamp(1rem, 1.8vw, 1.5rem)', color: GOLD, fontWeight: 900, letterSpacing: '0.1em', textAlign: 'center', textShadow: `0 0 12px ${GOLD}88` }}>
        {MULTIPLIER_LABELS[mult] ?? `×${mult} POINTS`}
      </Typography>
    </Box>
  );
}

function RoundTotalPanel({ round, bank }: { round: number; bank: number }) {
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'clamp(8px, 1.5vw, 16px)',
      border: `2px solid #4fc3f7`,
      borderRadius: 2,
      px: 'clamp(12px, 2vw, 28px)',
      background: `${HALFTONE_DOT}, #080b1ccc`,
      backgroundSize: '6px 6px, 100%',
      minWidth: 'clamp(120px, 16vw, 200px)',
      boxShadow: '0 0 20px #4fc3f744',
    }}>
      <Typography sx={{ ...fontSx, fontSize: 'clamp(0.65rem, 1vw, 0.9rem)', color: '#4fc3f7', letterSpacing: '0.14em', fontWeight: 700, whiteSpace: 'nowrap' }}>
        ROUND {round} TOTAL:
      </Typography>
      <Typography sx={{ ...fontSx, fontSize: 'clamp(1.6rem, 3.5vw, 3rem)', color: GOLD, fontWeight: 900, lineHeight: 1 }}>
        {bank}
      </Typography>
    </Box>
  );
}

// ─── Face-off Strike Overlay ──────────────────────────────────────────────────

function FaceOffStrikeOverlay({ teamName, color }: { teamName: string; color: string }) {
  return (
    <Box sx={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
      pointerEvents: 'none',
      animation: 'ssFadeIn 0.2s ease-out',
    }}>
      <Box sx={{
        border: `3px solid #ff2020`,
        borderRadius: 3,
        px: 5,
        py: 3,
        background: `radial-gradient(ellipse at 50% 50%, #2a000088, #05071acc)`,
        boxShadow: `0 0 60px #ff202088`,
        textAlign: 'center',
      }}>
        <Typography sx={{ ...fontSx, fontSize: 'clamp(2rem, 5vw, 4rem)', color: '#ff2020', fontWeight: 900, letterSpacing: '0.1em' }}>
          ✕
        </Typography>
        <Typography sx={{ ...fontSx, fontSize: 'clamp(0.9rem, 1.6vw, 1.3rem)', color, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {teamName}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Steal Overlay ────────────────────────────────────────────────────────────

function StealBanner({ teamName, color }: { teamName: string; color: string }) {
  return (
    <Box sx={{
      position: 'absolute',
      bottom: '18%',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 15,
      border: `2px solid ${color}`,
      borderRadius: 2,
      px: 4,
      py: 1.5,
      background: `radial-gradient(ellipse at 50% 50%, ${color}22, ${BG}ee)`,
      boxShadow: `0 0 30px ${color}55`,
      animation: 'ssFadeIn 0.3s ease-out',
      whiteSpace: 'nowrap',
    }}>
      <Typography sx={{ ...fontSx, fontSize: 'clamp(1rem, 2vw, 1.6rem)', color, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {teamName} — STEAL OPPORTUNITY
      </Typography>
    </Box>
  );
}

// ─── Game Over Overlay ────────────────────────────────────────────────────────

function GameOverOverlay({ winner, teams }: { winner: SurveyTeam; teams: [SurveyTeam, SurveyTeam] }) {
  const color = winner.id === 'team-1' ? TEAM_COLORS[0] : TEAM_COLORS[1];
  return (
    <Box sx={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: `radial-gradient(ellipse at 50% 40%, ${color}18 0%, ${BG}f0 60%)`,
      zIndex: 30,
      animation: 'ssFadeIn 0.5s ease-out',
    }}>
      <Typography sx={{ ...fontSx, fontSize: 'clamp(1rem, 2vw, 1.4rem)', color: '#ffffff88', letterSpacing: '0.2em', mb: 1 }}>
        SURVEY SAYS
      </Typography>
      <Typography sx={{
        ...fontSx,
        fontSize: 'clamp(3rem, 8vw, 7rem)',
        color,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        textShadow: `0 0 40px ${color}cc, 0 0 80px ${color}44`,
        lineHeight: 1,
      }}>
        {winner.name}
      </Typography>
      <Typography sx={{ ...fontSx, fontSize: 'clamp(1rem, 2vw, 1.5rem)', color: GOLD, fontWeight: 700, letterSpacing: '0.15em', mt: 2 }}>
        WINS!
      </Typography>
      <Box sx={{ display: 'flex', gap: 6, mt: 5 }}>
        {teams.map((t, i) => (
          <Box key={t.id} sx={{ textAlign: 'center' }}>
            <Typography sx={{ ...fontSx, fontSize: '0.85rem', color: TEAM_COLORS[i], letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t.name}</Typography>
            <Typography sx={{ ...fontSx, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#fff', fontWeight: 900 }}>{t.score}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── Intro Screen ────────────────────────────────────────────────────────────

function IntroScreen({ teams }: { teams: [SurveyTeam, SurveyTeam] }) {
  return (
    <Box sx={{
      height: '100vh',
      width: '100vw',
      bgcolor: BG,
      backgroundImage: 'radial-gradient(ellipse at 30% 40%, #1a0a3a 0%, transparent 55%), radial-gradient(ellipse at 70% 60%, #0a1a3a 0%, transparent 55%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      gap: 3,
    }}>
      {/* Gold accent bar top */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        boxShadow: `0 0 20px ${GOLD}88`,
      }} />

      {/* Title */}
      <Box sx={{ textAlign: 'center', animation: 'ssFadeIn 0.8s ease-out' }}>
        <Typography sx={{
          ...fontSx,
          fontSize: 'clamp(1rem, 2vw, 1.5rem)',
          color: '#ffffff55',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          mb: 1,
        }}>
          WELCOME TO
        </Typography>
        <Typography sx={{
          ...fontSx,
          fontSize: 'clamp(4rem, 10vw, 9rem)',
          fontWeight: 900,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          lineHeight: 0.9,
          background: `linear-gradient(180deg, #fff 0%, ${GOLD} 55%, #c89000 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: 'none',
          filter: `drop-shadow(0 0 30px ${GOLD}88)`,
        }}>
          SURVEY
        </Typography>
        <Typography sx={{
          ...fontSx,
          fontSize: 'clamp(4rem, 10vw, 9rem)',
          fontWeight: 900,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          lineHeight: 0.9,
          background: `linear-gradient(180deg, #fff 0%, ${GOLD} 55%, #c89000 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: `drop-shadow(0 0 30px ${GOLD}88)`,
        }}>
          SAYS
        </Typography>
      </Box>

      {/* Gold divider */}
      <Box sx={{
        width: 'clamp(200px, 40vw, 500px)',
        height: 3,
        borderRadius: 2,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        boxShadow: `0 0 16px ${GOLD}66`,
        my: 1,
      }} />

      {/* Teams */}
      <Box sx={{
        display: 'flex',
        gap: 'clamp(40px, 10vw, 120px)',
        animation: 'ssFadeIn 1s ease-out 0.3s both',
      }}>
        {teams.map((t, i) => (
          <Box key={t.id} sx={{ textAlign: 'center' }}>
            <Box sx={{
              width: 'clamp(60px, 10vw, 100px)',
              height: 4,
              borderRadius: 2,
              background: TEAM_COLORS[i],
              boxShadow: `0 0 16px ${TEAM_COLORS[i]}88`,
              mx: 'auto',
              mb: 1,
            }} />
            <Typography sx={{
              ...fontSx,
              fontSize: 'clamp(1.2rem, 2.5vw, 2rem)',
              color: TEAM_COLORS[i],
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textShadow: `0 0 20px ${TEAM_COLORS[i]}88`,
            }}>
              {t.name}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Gold accent bar bottom */}
      <Box sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        boxShadow: `0 0 20px ${GOLD}88`,
      }} />
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const SSShowComponent = () => {
  const [state, setState] = useState<SurveySaysState | null>(null);
  const [faceOffStrikeVisible, setFaceOffStrikeVisible] = useState(false);
  const prevStrikeTeamRef = useRef<string | null>(null);
  const faceOffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [randomizing, setRandomizing] = useState(false);
  const prevSeqRef = useRef<number | null>(null);
  const randomizerHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const s = await getState();
        if (alive) setState(s);
      } catch { /* ignore */ }
    };
    void poll();
    const interval = setInterval(() => { void poll(); }, 500);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!state) return;
    const strikeTeam = state.roundState.faceOffStrikeTeamId;
    if (strikeTeam && strikeTeam !== prevStrikeTeamRef.current) {
      prevStrikeTeamRef.current = strikeTeam;
      setFaceOffStrikeVisible(true);
      if (faceOffTimerRef.current) clearTimeout(faceOffTimerRef.current);
      faceOffTimerRef.current = setTimeout(() => setFaceOffStrikeVisible(false), 3000);
    }
    if (!strikeTeam) {
      prevStrikeTeamRef.current = null;
      setFaceOffStrikeVisible(false);
    }
  }, [state?.roundState.faceOffStrikeTeamId]);

  useEffect(() => {
    const seq = state?.randomizerSeq;
    if (seq === undefined) return;
    if (prevSeqRef.current !== null && seq > prevSeqRef.current) {
      setRandomizing(true);
    }
    prevSeqRef.current = seq;
  }, [state?.randomizerSeq]);

  if (!state) {
    return (
      <Box sx={{ height: '100vh', bgcolor: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ ...fontSx, color: '#ffffff33', fontSize: '1.2rem', letterSpacing: '0.2em' }}>LOADING…</Typography>
      </Box>
    );
  }

  if (randomizing) {
    return (
      <SSTeamRandomizer
        teams={state.teams}
        playerPool={state.playerPool}
        onDone={() => {
          if (randomizerHideRef.current) clearTimeout(randomizerHideRef.current);
          randomizerHideRef.current = setTimeout(() => setRandomizing(false), 3500);
        }}
      />
    );
  }

  if (state.showIntro) {
    return <IntroScreen teams={state.teams} />;
  }

  const { roundState, teams, boards, config } = state;
  const currentBoard = boards.find(b => b.id === roundState.currentBoardId);
  const boardSlotsVisible = roundState.phase !== 'idle';
  // Question visible once host clicks "Reveal Question" (question_revealed or beyond)
  const questionRevealed =
    roundState.phase !== 'idle' &&
    !(roundState.phase === 'face_off' && roundState.faceOffState === 'showing_board');
  // Buzz armed indicator: only while waiting for hardware buzz
  const buzzArmed =
    roundState.phase === 'face_off' && roundState.faceOffState === 'waiting_buzz';
  const mult = config.multiplierSchedule[roundState.currentRound - 1]
    ?? config.multiplierSchedule[config.multiplierSchedule.length - 1]
    ?? 1;

  const activeTeamId = roundState.phase === 'steal'
    ? roundState.stealingTeamId
    : roundState.phase === 'main_play' || roundState.phase === 'post_round'
    ? roundState.controllingTeamId
    : roundState.phase === 'face_off' && roundState.faceOffState === 'answering'
    ? roundState.faceOffTurnTeamId
    : null;

  // Current player name up (rotation wraps by each family's own size). No player during steal.
  const playerAt = (t: SurveyTeam | undefined, idx: number): string | null =>
    t && t.players.length ? t.players[((idx % t.players.length) + t.players.length) % t.players.length] : null;
  const activePlayer =
    roundState.phase === 'face_off' && roundState.faceOffState === 'answering'
      ? playerAt(teams.find(t => t.id === roundState.faceOffTurnTeamId), roundState.faceOffPlayerIndex)
      : roundState.phase === 'main_play' || roundState.phase === 'post_round'
      ? playerAt(teams.find(t => t.id === roundState.controllingTeamId), roundState.mainPlayPlayerIndex)
      : null;

  const strikingTeam = faceOffStrikeVisible
    ? teams.find(t => t.id === roundState.faceOffStrikeTeamId)
    : null;
  const strikingTeamColor = strikingTeam
    ? (strikingTeam.id === teams[0].id ? TEAM_COLORS[0] : TEAM_COLORS[1])
    : '#ff2020';

  const stealingTeam = roundState.phase === 'steal' && roundState.stealingTeamId
    ? teams.find(t => t.id === roundState.stealingTeamId)
    : null;
  const stealTeamColor = stealingTeam
    ? (stealingTeam.id === teams[0].id ? TEAM_COLORS[0] : TEAM_COLORS[1])
    : '#fff';

  const winner = roundState.phase === 'game_over'
    ? [...teams].sort((a, b) => b.score - a.score)[0]
    : null;

  const answers = currentBoard?.answers ?? [];
  const slotCount = answers.length;

  // Column-first: slots 1-4 in left col, 5-8 in right col
  // We render left col then right col interleaved into a CSS grid
  const leftSlots = answers.filter(a => a.rank <= 4);
  const rightSlots = answers.filter(a => a.rank >= 5);
  const maxRows = Math.max(leftSlots.length, rightSlots.length);

  return (
    <Box sx={{
      height: '100vh',
      width: '100vw',
      bgcolor: BG,
      backgroundImage: [
        'radial-gradient(ellipse at 15% 50%, #4a0a5a55 0%, transparent 45%)',
        'radial-gradient(ellipse at 85% 50%, #0a2a4a55 0%, transparent 45%)',
        'radial-gradient(ellipse at 50% 0%, #1a1a4a44 0%, transparent 60%)',
      ].join(', '),
      display: 'flex',
      flexDirection: 'column',
      p: 'clamp(10px, 1.8vw, 24px)',
      gap: 'clamp(8px, 1.2vw, 16px)',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* Halftone dot texture overlay */}
      <Box sx={{
        position: 'absolute',
        inset: 0,
        background: HALFTONE_DOT,
        backgroundSize: '6px 6px',
        opacity: 0.4,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Left bulb strip */}
      <Box sx={{
        position: 'absolute',
        left: 'clamp(4px, 0.8vw, 12px)',
        top: '10%',
        bottom: '10%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-evenly',
        gap: 'clamp(8px, 1.5vh, 16px)',
        zIndex: 0,
      }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Box key={i} sx={{
            width: 'clamp(10px, 1.2vw, 16px)',
            height: 'clamp(10px, 1.2vw, 16px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #ff2d2d, #aa0000)',
            boxShadow: '0 0 12px #ff2d2daa, 0 0 24px #ff2d2d55',
            animation: `bulbPulse ${1.2 + (i * 0.1)}s ease-in-out infinite`,
            '@keyframes bulbPulse': {
              '0%, 100%': { opacity: 0.7 },
              '50%': { opacity: 1 },
            },
          }} />)
        )}
      </Box>

      {/* Right bulb strip */}
      <Box sx={{
        position: 'absolute',
        right: 'clamp(4px, 0.8vw, 12px)',
        top: '10%',
        bottom: '10%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-evenly',
        gap: 'clamp(8px, 1.5vh, 16px)',
        zIndex: 0,
      }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Box key={i} sx={{
            width: 'clamp(10px, 1.2vw, 16px)',
            height: 'clamp(10px, 1.2vw, 16px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #2d9bff, #0055aa)',
            boxShadow: '0 0 12px #2d9bffaa, 0 0 24px #2d9bff55',
            animation: `bulbPulse ${1.2 + (i * 0.1)}s ease-in-out infinite`,
          }} />)
        )}
      </Box>

      {/* Content wrapper with higher z-index */}
      <Box sx={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(8px, 1.2vw, 16px)',
        height: '100%',
      }}>

        {/* ── Top row: Score | Question | Score ── */}
        <Box sx={{ display: 'flex', gap: 'clamp(8px, 1.2vw, 16px)', alignItems: 'stretch', height: 'clamp(90px, 14vh, 130px)', flexShrink: 0 }}>
        <ScorePanel team={teams[0]} active={activeTeamId === teams[0].id} colorHex={TEAM_COLORS[0]} player={activeTeamId === teams[0].id ? activePlayer : null} />
        <QuestionPanel question={questionRevealed ? (currentBoard?.question ?? '') : ''} boardSlotsVisible={boardSlotsVisible} buzzArmed={buzzArmed} />
        <ScorePanel team={teams[1]} active={activeTeamId === teams[1].id} colorHex={TEAM_COLORS[1]} player={activeTeamId === teams[1].id ? activePlayer : null} />
        </Box>

        {/* ── Answer board — fills remaining space ── */}
        <Box sx={{ flex: 1, display: 'flex', gap: 'clamp(8px, 1.2vw, 16px)', minHeight: 0 }}>
        {/* Left column: answers 1-4 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1vw, 12px)' }}>
          {boardSlotsVisible && Array.from({ length: maxRows }, (_, row) => {
            const answer = leftSlots[row];
            if (!answer) return <Box key={`left-empty-${row}`} sx={{ flex: 1 }} />;
            const revealed = roundState.revealedAnswers.some(r => r.rank === answer.rank);
            return (
              <AnswerSlot
                key={answer.rank}
                rank={answer.rank}
                text={answer.text}
                points={answer.points}
                revealed={revealed}
                animIndex={answer.rank - 1}
              />
            );
          })}
        </Box>

        {/* Right column: answers 5-8 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1vw, 12px)' }}>
          {boardSlotsVisible && slotCount > 4 && Array.from({ length: maxRows }, (_, row) => {
            const answer = rightSlots[row];
            if (!answer) return <Box key={`right-empty-${row}`} sx={{ flex: 1 }} />;
            const revealed = roundState.revealedAnswers.some(r => r.rank === answer.rank);
            return (
              <AnswerSlot
                key={answer.rank}
                rank={answer.rank}
                text={answer.text}
                points={answer.points}
                revealed={revealed}
                animIndex={answer.rank - 1}
              />
            );
          })}
        </Box>
        </Box>

        {/* ── Bottom row: Multiplier | spacer | Round Total | Strikes ── */}
        <Box sx={{ display: 'flex', gap: 'clamp(8px, 1.2vw, 16px)', alignItems: 'stretch', height: 'clamp(60px, 10vh, 90px)', flexShrink: 0 }}>
        {mult > 1
          ? <MultiplierPanel mult={mult} />
          : <Box sx={{ flex: 1 }} />
        }
        <Box sx={{ flex: 1 }} />
        <RoundTotalPanel round={roundState.currentRound} bank={roundState.roundBank} />
        <StrikesPanel count={roundState.strikeCount} />
        </Box>
      </Box>

      {/* ── Overlays ── */}
      {faceOffStrikeVisible && strikingTeam && (
        <FaceOffStrikeOverlay teamName={strikingTeam.name} color={strikingTeamColor} />
      )}
      {stealingTeam && roundState.phase === 'steal' && (
        <StealBanner teamName={stealingTeam.name} color={stealTeamColor} />
      )}
      {winner && (
        <GameOverOverlay winner={winner} teams={teams} />
      )}
    </Box>
  );
};

export default SSShowComponent;
