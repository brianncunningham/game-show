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
  const teamColor = colorHex === TEAM_COLORS[0] ? 'cyan' : 'orange';
  const borderAsset = active
    ? `/survey-says/borders/score-panel-${teamColor}-active.png`
    : `/survey-says/borders/score-panel-${teamColor}-inactive.png`;

  return (
    <Box sx={{
      width: '260px',
      height: '180px',
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Layer 1: Dark fill */}
      <Box
        component="img"
        src="/survey-says/backgrounds/panel-fill-dark.png"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
        }}
      />
      
      {/* Layer 2: Border frame */}
      <Box
        component="img"
        src={borderAsset}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
        }}
      />
      
      {/* Layer 3: Text content */}
      <Box sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
      }}>
        <Typography sx={{
          ...fontSx,
          fontSize: '1.1rem',
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
          fontSize: '4.5rem',
          color: active ? '#fff' : '#ffffffcc',
          fontWeight: 900,
          lineHeight: 1,
          textShadow: active ? `0 0 30px ${colorHex}88` : 'none',
        }}>
          {team.score}
        </Typography>
        {active && player && (
          <Box sx={{
            px: 1.5,
            py: 0.25,
            borderRadius: 999,
            border: `2px solid ${colorHex}`,
            background: `${colorHex}22`,
            maxWidth: '90%',
          }}>
            <Typography sx={{
              ...fontSx,
              fontSize: '0.85rem',
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
    </Box>
  );
}

function QuestionPanel({ question, boardSlotsVisible, buzzArmed }: { question: string; boardSlotsVisible: boolean; buzzArmed: boolean }) {
  return (
    <Box sx={{
      flex: 1,
      height: '180px',
      position: 'relative',
      overflow: 'visible',
    }}>
      {/* Layer 1: Dark fill (only when board visible) */}
      {boardSlotsVisible && (
        <Box
          component="img"
          src="/survey-says/backgrounds/panel-fill-dark.png"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'fill',
          }}
        />
      )}
      
      {/* Layer 2: Border (only when board visible) */}
      {boardSlotsVisible && (
        <Box
          component="img"
          src="/survey-says/borders/question-panel-border.png"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'fill',
          }}
        />
      )}
      
      {/* Layer 3: Emblem — always visible, overlaps top edge */}
      <Box
        component="img"
        src="/survey-says/emblem/survey-says-emblem.png"
        sx={{
          position: 'absolute',
          top: '-70px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '220px',
          objectFit: 'contain',
          zIndex: 10,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
      
      {/* Layer 4: Question text */}
      {boardSlotsVisible && question && (
        <Box sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 4,
        }}>
          <Typography sx={{
            ...fontSx,
            fontSize: '1.8rem',
            color: '#fff',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            textAlign: 'center',
            lineHeight: 1.2,
          }}>
            {question}
          </Typography>
        </Box>
      )}
      
      {/* Buzz armed indicator */}
      {buzzArmed && (
        <Typography sx={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          ...fontSx,
          fontSize: '1.1rem',
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

  const borderAsset = revealed
    ? '/survey-says/borders/answer-slot-border-revealed.png'
    : '/survey-says/borders/answer-slot-border.png';

  return (
    <Box sx={{
      flex: 1,
      position: 'relative',
      minHeight: '90px',
      maxHeight: '90px',
      animation: revealed ? 'ssFlipIn 0.35s ease-out' : 'ssFadeIn 0.25s ease-out',
      '@keyframes ssFlipIn': {
        from: { opacity: 0, transform: 'scaleY(0.15)' },
        to: { opacity: 1, transform: 'scaleY(1)' },
      },
      '@keyframes ssFadeIn': {
        from: { opacity: 0, transform: 'scale(0.93)' },
        to: { opacity: 1, transform: 'scale(1)' },
      },
    }}>
      {/* Layer 1: Dark fill (only if revealed) */}
      {revealed && (
        <Box
          component="img"
          src="/survey-says/backgrounds/panel-fill-dark.png"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'fill',
          }}
        />
      )}
      
      {/* Layer 2: Border */}
      <Box
        component="img"
        src={borderAsset}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
        }}
      />
      
      {/* Layer 3: Content */}
      <Box sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        gap: 2,
      }}>
        {/* Number badge - overlaps left edge */}
        <Box sx={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0, ml: '-18px' }}>
          <Box
            component="img"
            src="/survey-says/borders/answer-number-badge.png"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
          <Typography sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...fontSx,
            fontSize: '2.4rem',
            color: GOLD,
            fontWeight: 900,
            lineHeight: 1,
          }}>
            {rank}
          </Typography>
        </Box>
        
        {/* Answer text and points */}
        {revealed && (
          <>
            <Typography sx={{
              ...fontSx,
              flex: 1,
              fontSize: '2rem',
              color: '#fff',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              textAlign: 'left',
            }}>
              {text}
            </Typography>
            <Typography sx={{
              ...fontSx,
              fontSize: '2rem',
              color: GOLD,
              fontWeight: 900,
              flexShrink: 0,
              pr: 3,
            }}>
              {points}
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}

function StrikesPanel({ count }: { count: number }) {
  return (
    <Box sx={{
      flex: 1,
      height: '120px',
      position: 'relative',
    }}>
      {/* Layer 1: Dark fill */}
      <Box
        component="img"
        src="/survey-says/backgrounds/panel-fill-dark.png"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
        }}
      />
      
      {/* Layer 2: Border */}
      <Box
        component="img"
        src="/survey-says/borders/strikes-panel-border.png"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
        }}
      />
      
      {/* Layer 3: Content */}
      <Box sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
      }}>
        <Typography sx={{
          ...fontSx,
          fontSize: '0.95rem',
          color: '#ffffff55',
          fontWeight: 700,
          letterSpacing: '0.14em',
        }}>
          STRIKES
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {[0, 1, 2].map(i => (
            <Box
              key={i}
              component="img"
              src={i < count
                ? '/survey-says/decorations/strike-x-active.png'
                : '/survey-says/decorations/strike-x-inactive.png'
              }
              sx={{
                width: '46px',
                height: '46px',
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function MultiplierPanel({ mult }: { mult: number }) {
  if (mult <= 1) return null;
  return (
    <Box sx={{
      flex: 1,
      height: '120px',
      position: 'relative',
    }}>
      {/* Layer 1: Banner frame */}
      <Box
        component="img"
        src="/survey-says/borders/multiplier-banner.png"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
        }}
      />
      
      {/* Layer 2: Text */}
      <Box sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Typography sx={{
          ...fontSx,
          fontSize: '1.5rem',
          color: GOLD,
          fontWeight: 900,
          letterSpacing: '0.1em',
          textAlign: 'center',
          textShadow: `0 0 12px ${GOLD}88`,
        }}>
          {MULTIPLIER_LABELS[mult] ?? `×${mult} POINTS`}
        </Typography>
      </Box>
    </Box>
  );
}

function RoundTotalPanel({ round, bank }: { round: number; bank: number }) {
  return (
    <Box sx={{
      flex: 1,
      height: '120px',
      position: 'relative',
    }}>
      {/* Layer 1: Dark fill */}
      <Box
        component="img"
        src="/survey-says/backgrounds/panel-fill-dark.png"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
        }}
      />
      
      {/* Layer 2: Border */}
      <Box
        component="img"
        src="/survey-says/borders/round-total-border.png"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
        }}
      />
      
      {/* Layer 3: Content */}
      <Box sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}>
        <Typography sx={{
          ...fontSx,
          fontSize: '1.1rem',
          color: '#4fc3f7',
          letterSpacing: '0.14em',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          ROUND {round} TOTAL:
        </Typography>
        <Typography sx={{
          ...fontSx,
          fontSize: '3.5rem',
          color: GOLD,
          fontWeight: 900,
          lineHeight: 1,
        }}>
          {bank}
        </Typography>
      </Box>
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
      bottom: '14%',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 15,
      width: '700px',
      height: '120px',
      animation: 'ssFadeIn 0.3s ease-out',
      pointerEvents: 'none',
    }}>
      <Box
        component="img"
        src="/survey-says/overlays/prompt-overlay-lower-third.png"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
      />
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ ...fontSx, fontSize: '1.8rem', color, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', textShadow: `0 0 20px ${color}` }}>
          {teamName} — STEAL OPPORTUNITY
        </Typography>
      </Box>
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
  
  // Stage scaling for fixed 1920x1080 layout - MUST be before any conditional returns
  const [scale, setScale] = useState(1);
  
  useEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth / 1920;
      const scaleY = window.innerHeight / 1080;
      setScale(Math.min(scaleX, scaleY));
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

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
      width: '100vw',
      height: '100vh',
      bgcolor: '#000',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Fixed 1920x1080 game stage, scaled to fit viewport */}
      <Box sx={{
        width: '1920px',
        height: '1080px',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        position: 'relative',
      }}>
        {/* Studio background */}
        <Box
          component="img"
          src="/survey-says/backgrounds/studio-background.png"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        />

        {/* Content wrapper */}
        <Box sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          height: '100%',
          p: '24px',
          boxSizing: 'border-box',
        }}>

        {/* ── Top row: Score | Question | Score ── */}
        <Box sx={{ display: 'flex', gap: '16px', alignItems: 'stretch', height: '180px', flexShrink: 0, overflow: 'visible' }}>
        <ScorePanel team={teams[0]} active={activeTeamId === teams[0].id} colorHex={TEAM_COLORS[0]} player={activeTeamId === teams[0].id ? activePlayer : null} />
        <QuestionPanel question={questionRevealed ? (currentBoard?.question ?? '') : ''} boardSlotsVisible={boardSlotsVisible} buzzArmed={buzzArmed} />
        <ScorePanel team={teams[1]} active={activeTeamId === teams[1].id} colorHex={TEAM_COLORS[1]} player={activeTeamId === teams[1].id ? activePlayer : null} />
        </Box>

        {/* ── Answer board — fills remaining space ── */}
        <Box sx={{ flex: 1, display: 'flex', gap: '16px', minHeight: 0 }}>
        {/* Left column: answers 1-4 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
        <Box sx={{ display: 'flex', gap: '16px', alignItems: 'stretch', height: '120px', flexShrink: 0 }}>
        {mult > 1
          ? <MultiplierPanel mult={mult} />
          : <Box sx={{ flex: 1 }} />
        }
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
    </Box>
  );
};

export default SSShowComponent;
