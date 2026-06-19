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
      width: '310px',
      height: '220px',
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
          fontSize: '1.8rem',
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
          fontSize: '5.5rem',
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
      height: '220px',
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
          top: '-280px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '520px',
          height: '260px',
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
            fontSize: '2.6rem',
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
        {/* Number badge - inside slot left edge */}
        <Box sx={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0, ml: 0 }}>
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
            fontSize: '3.8rem',
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
              fontSize: '3.2rem',
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
              fontSize: '3.2rem',
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
      height: '150px',
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
        <Box sx={{ display: 'flex', gap: 2 }}>
          {[0, 1, 2].map(i => (
            <Box
              key={i}
              component="img"
              src={i < count
                ? '/survey-says/decorations/strike-x-active.png'
                : '/survey-says/decorations/strike-x-inactive.png'
              }
              sx={{
                width: '96px',
                height: '96px',
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
      height: '150px',
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
          fontSize: '3rem',
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
      height: '150px',
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
          fontSize: '2.2rem',
          color: '#4fc3f7',
          letterSpacing: '0.14em',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          ROUND {round} TOTAL:
        </Typography>
        <Typography sx={{
          ...fontSx,
          fontSize: '5rem',
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

// ─── Face-off Announce Overlay ────────────────────────────────────────────────

function FaceOffAnnounceOverlay({ teamA, playerA, colorA, teamB, playerB, colorB }: {
  teamA: string; playerA: string | null; colorA: string;
  teamB: string; playerB: string | null; colorB: string;
}) {
  return (
    <Box sx={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 18,
      pointerEvents: 'none',
      background: 'rgba(5,7,26,0.6)',
      animation: 'ssFadeIn 0.4s ease-out',
    }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
        <Typography sx={{ ...fontSx, fontSize: '4.5rem', color: GOLD, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', textShadow: `0 0 40px ${GOLD}, 0 0 80px ${GOLD}66`, lineHeight: 1 }}>
          Face Off
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '60px' }}>
          {/* Team A */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ ...fontSx, fontSize: '1.4rem', color: colorA, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', textShadow: `0 0 16px ${colorA}` }}>
              {teamA}
            </Typography>
            {playerA && (
              <Typography sx={{ ...fontSx, fontSize: '3.6rem', color: '#fff', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.1, textShadow: `0 0 24px ${colorA}88` }}>
                {playerA}
              </Typography>
            )}
          </Box>

          {/* VS */}
          <Typography sx={{ ...fontSx, fontSize: '3rem', color: GOLD, fontWeight: 900, letterSpacing: '0.1em', textShadow: `0 0 20px ${GOLD}` }}>
            VS
          </Typography>

          {/* Team B */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ ...fontSx, fontSize: '1.4rem', color: colorB, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', textShadow: `0 0 16px ${colorB}` }}>
              {teamB}
            </Typography>
            {playerB && (
              <Typography sx={{ ...fontSx, fontSize: '3.6rem', color: '#fff', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.1, textShadow: `0 0 24px ${colorB}88` }}>
                {playerB}
              </Typography>
            )}
          </Box>
        </Box>
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
      animation: 'ssFadeIn 0.3s ease-out',
      pointerEvents: 'none',
      px: '48px',
      py: '18px',
      borderRadius: '8px',
      background: `rgba(5,7,26,0.92)`,
      border: `3px solid ${color}`,
      boxShadow: `0 0 24px ${color}99, 0 0 60px ${color}44`,
      whiteSpace: 'nowrap',
    }}>
      <Typography sx={{
        ...fontSx,
        fontSize: '2.4rem',
        color: '#fff',
        fontWeight: 900,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        textShadow: `0 0 12px ${color}`,
      }}>
        {teamName} — STEAL OPPORTUNITY
      </Typography>
    </Box>
  );
}

function StealResultOverlay({ teamName, success, color }: { teamName: string; success: boolean; color: string }) {
  return (
    <Box sx={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
      background: `radial-gradient(ellipse at 50% 50%, ${color}22 0%, rgba(5,7,26,0.75) 60%)`,
      animation: 'ssFadeIn 0.4s ease-out',
      pointerEvents: 'none',
    }}>
      <Box sx={{
        px: '64px',
        py: '32px',
        borderRadius: '12px',
        background: `rgba(5,7,26,0.94)`,
        border: `4px solid ${color}`,
        boxShadow: `0 0 40px ${color}aa, 0 0 100px ${color}44`,
        textAlign: 'center',
      }}>
        <Typography sx={{
          ...fontSx,
          fontSize: '3rem',
          color,
          fontWeight: 900,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          textShadow: `0 0 20px ${color}`,
          lineHeight: 1.1,
        }}>
          {teamName}
        </Typography>
        <Typography sx={{
          ...fontSx,
          fontSize: '2.2rem',
          color: '#fff',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          mt: 1,
        }}>
          {success ? 'STEALS THE POINTS!' : 'KEEPS THE POINTS!'}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Game Over Overlay ────────────────────────────────────────────────────────

function GameOverScreen({ winner, teams }: { winner: SurveyTeam; teams: [SurveyTeam, SurveyTeam] }) {
  const color = winner.id === 'team-1' ? TEAM_COLORS[0] : TEAM_COLORS[1];
  const loser = teams.find(t => t.id !== winner.id)!;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 1920;
    canvas.height = 1080;
    const pieces: Array<{ x: number; y: number; vx: number; vy: number; angle: number; va: number; size: number; color: string }> = [];
    const colors = [GOLD, color, '#fff', '#ff9e3d', '#d8ff9b'];
    for (let i = 0; i < 180; i++) {
      pieces.push({ x: Math.random() * 1920, y: Math.random() * 1080 - 1080, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3, angle: Math.random() * Math.PI * 2, va: (Math.random() - 0.5) * 0.12, size: 8 + Math.random() * 14, color: colors[Math.floor(Math.random() * colors.length)] });
    }
    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, 1920, 1080);
      pieces.forEach(p => {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); ctx.globalAlpha = 0.88; ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
        p.x += p.vx; p.y += p.vy; p.angle += p.va;
        if (p.y > 1100) { p.y = -20; p.x = Math.random() * 1920; }
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [color]);

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      background: `radial-gradient(ellipse at 50% 0%, ${color}44 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, ${color}22 0%, transparent 55%), linear-gradient(180deg, ${BG} 0%, #0a0e1a 100%)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
      <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', px: 4 }}>
        <Typography sx={{ ...fontSx, fontSize: '2rem', color: '#ffffff66', letterSpacing: '0.28em', textTransform: 'uppercase', mb: 1 }}>
          Survey Says
        </Typography>
        <Typography sx={{
          ...fontSx,
          fontSize: '9rem',
          lineHeight: 0.9,
          color: GOLD,
          fontWeight: 900,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          textShadow: `0 0 30px ${GOLD}cc, 0 0 70px ${GOLD}66`,
          animation: 'champPulse 1.4s ease-in-out infinite',
          '@keyframes champPulse': {
            '0%': { textShadow: `0 0 20px ${GOLD}aa, 0 0 50px ${GOLD}55` },
            '50%': { textShadow: `0 0 40px ${GOLD}ff, 0 0 90px ${GOLD}99, 0 0 160px ${color}55` },
            '100%': { textShadow: `0 0 20px ${GOLD}aa, 0 0 50px ${GOLD}55` },
          },
          mb: 2,
        }}>
          SURVEY SAYS!
        </Typography>
        <Box sx={{
          mx: 'auto',
          px: 8,
          py: 4,
          borderRadius: '16px',
          border: `4px solid ${color}`,
          background: `radial-gradient(ellipse at 50% 0%, ${color}33, rgba(5,7,26,0.97) 60%)`,
          boxShadow: `0 0 50px ${color}aa, 0 0 120px ${color}44`,
          animation: 'heroPanelPulse 1.6s ease-in-out infinite',
          '@keyframes heroPanelPulse': {
            '0%': { boxShadow: `0 0 40px ${color}88, 0 0 100px ${color}33` },
            '50%': { boxShadow: `0 0 70px ${color}cc, 0 0 160px ${color}66` },
            '100%': { boxShadow: `0 0 40px ${color}88, 0 0 100px ${color}33` },
          },
          minWidth: '600px',
        }}>
          <Typography sx={{ ...fontSx, fontSize: '4rem', color, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', textShadow: `0 0 20px ${color}` }}>
            {winner.name}
          </Typography>
          <Typography sx={{ ...fontSx, fontSize: '12rem', color: '#fff', fontWeight: 900, lineHeight: 0.85, textShadow: `0 0 30px #fff8, 0 0 60px ${color}88` }}>
            {winner.score}
          </Typography>
          <Typography sx={{ ...fontSx, fontSize: '2rem', color: GOLD, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
            WINS!
          </Typography>
        </Box>
        <Typography sx={{ ...fontSx, fontSize: '1.6rem', color: '#ffffff44', letterSpacing: '0.1em', textTransform: 'uppercase', mt: 3 }}>
          {loser.name} — {loser.score} pts
        </Typography>
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
  const [stealResult, setStealResult] = useState<{ teamName: string; success: boolean; color: string } | null>(null);
  const prevPhaseRef = useRef<string | null>(null);
  const stealResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStealingTeamIdRef = useRef<string | null>(null);
  const stealRevealedCountRef = useRef<number>(0);
  
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
    if (!state) return;
    const phase = state.roundState.phase;
    const prevPhase = prevPhaseRef.current;
    // While in steal phase: track stealingTeamId and current revealed count
    if (phase === 'steal') {
      if (state.roundState.stealingTeamId) {
        prevStealingTeamIdRef.current = state.roundState.stealingTeamId;
      }
      stealRevealedCountRef.current = state.roundState.revealedAnswers.length;
    }
    // Detect transition from steal -> post_round/game_over
    if (prevPhase === 'steal' && (phase === 'post_round' || phase === 'game_over')) {
      const stealingId = prevStealingTeamIdRef.current;
      const controllingId = state.roundState.controllingTeamId;
      // Server appends the stolen answer to revealedAnswers only on success.
      // So if count increased, steal succeeded.
      const stealSucceeded = state.roundState.revealedAnswers.length > stealRevealedCountRef.current;
      const winnerTeamId = stealSucceeded ? stealingId : controllingId;
      const winnerTeam = state.teams.find(t => t.id === winnerTeamId);
      const winnerColor = winnerTeam?.id === state.teams[0].id ? TEAM_COLORS[0] : TEAM_COLORS[1];
      if (winnerTeam) {
        setStealResult({ teamName: winnerTeam.name, success: stealSucceeded, color: winnerColor });
        if (stealResultTimerRef.current) clearTimeout(stealResultTimerRef.current);
        stealResultTimerRef.current = setTimeout(() => setStealResult(null), 4000);
      }
    }
    prevPhaseRef.current = phase;
  }, [state?.roundState.phase]);

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

  if (state.roundState.phase === 'game_over') {
    const gameWinner = [...state.teams].sort((a, b) => b.score - a.score)[0];
    return <GameOverScreen winner={gameWinner} teams={state.teams} />;
  }

  const { roundState, teams, boards, config } = state;
  const currentBoard = boards.find(b => b.id === roundState.currentBoardId);
  const boardSlotsVisible = roundState.phase !== 'idle' &&
    !(roundState.phase === 'face_off' && roundState.faceOffState === 'announcing');
  // Question visible once host clicks "Reveal Question" (question_revealed or beyond)
  const questionRevealed =
    roundState.phase !== 'idle' &&
    !(roundState.phase === 'face_off' && (roundState.faceOffState === 'announcing' || roundState.faceOffState === 'showing_board'));
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
          pt: '80px',
          px: '24px',
          pb: '24px',
          boxSizing: 'border-box',
        }}>

        {/* ── Top row: Score | Question | Score ── */}
        <Box sx={{ display: 'flex', gap: '16px', alignItems: 'flex-end', height: '220px', flexShrink: 0, overflow: 'visible' }}>
        <ScorePanel team={teams[0]} active={activeTeamId === teams[0].id} colorHex={TEAM_COLORS[0]} player={activeTeamId === teams[0].id ? activePlayer : null} />
        <QuestionPanel question={questionRevealed ? (currentBoard?.question ?? '') : ''} boardSlotsVisible={boardSlotsVisible} buzzArmed={buzzArmed} />
        <ScorePanel team={teams[1]} active={activeTeamId === teams[1].id} colorHex={TEAM_COLORS[1]} player={activeTeamId === teams[1].id ? activePlayer : null} />
        </Box>

        {/* ── Answer board — fills remaining space ── */}
        <Box sx={{ flex: 1, display: 'flex', gap: '16px', minHeight: 0 }}>
        {/* Left column: answers 1-4 — always 4 flex rows so height is consistent */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {boardSlotsVisible && Array.from({ length: 4 }, (_, row) => {
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

        {/* Right column: answers 5-8 — always 4 flex rows */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {boardSlotsVisible && slotCount > 4 && Array.from({ length: 4 }, (_, row) => {
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
        <Box sx={{ display: 'flex', gap: '16px', alignItems: 'stretch', height: '150px', flexShrink: 0 }}>
        {mult > 1
          ? <MultiplierPanel mult={mult} />
          : <Box sx={{ flex: 1 }} />
        }
        <RoundTotalPanel round={roundState.currentRound} bank={roundState.roundBank * mult} />
        <StrikesPanel count={roundState.strikeCount} />
        </Box>
        </Box>

        {/* ── Overlays ── */}
        {roundState.phase === 'face_off' && roundState.faceOffState === 'announcing' && (() => {
          const playerAt = (t: SurveyTeam, idx: number) => t.players.length ? t.players[((idx % t.players.length) + t.players.length) % t.players.length] : null;
          const idx = roundState.faceOffPlayerIndex;
          return (
            <FaceOffAnnounceOverlay
              teamA={teams[0].name} playerA={playerAt(teams[0], idx)} colorA={TEAM_COLORS[0]}
              teamB={teams[1].name} playerB={playerAt(teams[1], idx)} colorB={TEAM_COLORS[1]}
            />
          );
        })()}
        {faceOffStrikeVisible && strikingTeam && (
          <FaceOffStrikeOverlay teamName={strikingTeam.name} color={strikingTeamColor} />
        )}
        {stealingTeam && roundState.phase === 'steal' && (
          <StealBanner teamName={stealingTeam.name} color={stealTeamColor} />
        )}
        {stealResult && (
          <StealResultOverlay teamName={stealResult.teamName} success={stealResult.success} color={stealResult.color} />
        )}
      </Box>
    </Box>
  );
};

export default SSShowComponent;
