import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { SurveySaysState, SurveyBoard, SurveyTeam } from './types';
import { getState } from './api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAM_COLORS = ['#00e5ff', '#ff6a00'] as const;
const GOLD = '#f5c518';
const BG = '#05071a';

const MULTIPLIER_LABELS: Record<number, string> = {
  2: 'DOUBLE POINTS',
  3: 'TRIPLE POINTS',
  4: 'QUADRUPLE POINTS',
};

const fontSx = { fontFamily: '"Barlow Condensed", Impact, sans-serif' };

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScorePanel({ team, active, colorHex }: { team: SurveyTeam; active: boolean; colorHex: string }) {
  return (
    <Box sx={{
      flex: 1,
      border: `2px solid ${colorHex}`,
      borderRadius: 2,
      px: 2,
      py: 1.5,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: active
        ? `radial-gradient(ellipse at 50% 0%, ${colorHex}28 0%, ${BG}cc 70%)`
        : `${BG}cc`,
      boxShadow: active
        ? `0 0 32px ${colorHex}66, 0 0 8px ${colorHex}44 inset`
        : `0 0 8px ${colorHex}22`,
      transition: 'box-shadow 0.4s, background 0.4s',
    }}>
      <Typography sx={{ ...fontSx, fontSize: 'clamp(0.8rem, 1.4vw, 1.1rem)', color: colorHex, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {team.name}
      </Typography>
      <Typography sx={{ ...fontSx, fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: '#fff', fontWeight: 900, lineHeight: 1.1 }}>
        {team.score}
      </Typography>
    </Box>
  );
}

function QuestionPanel({ question, boardRevealed }: { question: string; boardRevealed: boolean }) {
  return (
    <Box sx={{
      flex: 2,
      mx: 1.5,
      border: `2px solid ${GOLD}55`,
      borderRadius: 2,
      px: 2,
      py: 1.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, #0a0e2a 0%, #0d1235 100%)`,
      boxShadow: `0 0 20px ${GOLD}22`,
      minHeight: 80,
    }}>
      {boardRevealed ? (
        <Typography sx={{
          ...fontSx,
          fontSize: 'clamp(1rem, 2.2vw, 1.8rem)',
          color: '#fff',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          textAlign: 'center',
          lineHeight: 1.2,
        }}>
          {question || ''}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ ...fontSx, fontSize: 'clamp(1.2rem, 2.4vw, 2rem)', color: GOLD, fontWeight: 900, letterSpacing: '0.15em' }}>
            SURVEY SAYS
          </Typography>
          <Box sx={{ width: 120, height: 3, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
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

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      border: `1.5px solid ${revealed ? GOLD : GOLD + '44'}`,
      borderRadius: 1.5,
      px: 1.5,
      py: 0.75,
      background: revealed ? `linear-gradient(90deg, #0d1a08, #071208)` : '#0a0d1e',
      gap: 1.5,
      transition: 'border-color 0.3s, background 0.3s',
      animation: revealed ? 'ssFlipIn 0.35s ease-out' : 'ssFadeIn 0.25s ease-out',
      '@keyframes ssFlipIn': {
        from: { opacity: 0, transform: 'scaleY(0.2)' },
        to: { opacity: 1, transform: 'scaleY(1)' },
      },
      '@keyframes ssFadeIn': {
        from: { opacity: 0, transform: 'scale(0.95)' },
        to: { opacity: 1, transform: 'scale(1)' },
      },
    }}>
      <Box sx={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: `2px solid ${GOLD}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: revealed ? GOLD + '22' : 'transparent',
      }}>
        <Typography sx={{ ...fontSx, fontSize: '0.85rem', color: GOLD, fontWeight: 900, lineHeight: 1 }}>
          {rank}
        </Typography>
      </Box>
      {revealed ? (
        <>
          <Typography sx={{ ...fontSx, flex: 1, fontSize: 'clamp(0.75rem, 1.5vw, 1.1rem)', color: '#fff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {text}
          </Typography>
          <Typography sx={{ ...fontSx, fontSize: 'clamp(0.85rem, 1.6vw, 1.2rem)', color: GOLD, fontWeight: 900, ml: 1 }}>
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
      gap: 0.75,
      border: `1.5px solid #ffffff22`,
      borderRadius: 2,
      px: 2,
      py: 1,
      background: '#0a0d1ecc',
      minWidth: 100,
    }}>
      <Typography sx={{ ...fontSx, fontSize: '0.75rem', color: '#ffffff66', fontWeight: 700, letterSpacing: '0.12em' }}>
        STRIKES
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.75 }}>
        {[0, 1, 2].map(i => (
          <Box key={i} sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: `2px solid ${i < count ? '#ff2020' : '#ffffff33'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: i < count ? '#ff202022' : 'transparent',
            transition: 'all 0.2s',
          }}>
            {i < count && (
              <Typography sx={{ fontSize: '0.9rem', color: '#ff2020', fontWeight: 900, lineHeight: 1 }}>✕</Typography>
            )}
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
      border: `2px solid ${GOLD}`,
      borderRadius: 2,
      px: 2,
      py: 1,
      background: `linear-gradient(135deg, #1a0e30, #2a1540)`,
      boxShadow: `0 0 20px ${GOLD}44`,
      minWidth: 140,
    }}>
      <Typography sx={{ ...fontSx, fontSize: 'clamp(0.85rem, 1.4vw, 1.1rem)', color: GOLD, fontWeight: 900, letterSpacing: '0.1em', textAlign: 'center' }}>
        {MULTIPLIER_LABELS[mult] ?? `×${mult} POINTS`}
      </Typography>
    </Box>
  );
}

function RoundTotalPanel({ round, bank }: { round: number; bank: number }) {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      border: `1.5px solid #ffffff22`,
      borderRadius: 2,
      px: 2,
      py: 1,
      background: '#0a0d1ecc',
      minWidth: 140,
    }}>
      <Typography sx={{ ...fontSx, fontSize: '0.7rem', color: '#ffffff55', letterSpacing: '0.12em', fontWeight: 700 }}>
        ROUND {round} TOTAL
      </Typography>
      <Typography sx={{ ...fontSx, fontSize: 'clamp(1.4rem, 2.5vw, 2.2rem)', color: '#fff', fontWeight: 900, lineHeight: 1.1 }}>
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

// ─── Main component ───────────────────────────────────────────────────────────

export const SSShowComponent = () => {
  const [state, setState] = useState<SurveySaysState | null>(null);
  const [faceOffStrikeVisible, setFaceOffStrikeVisible] = useState(false);
  const prevStrikeTeamRef = useRef<string | null>(null);
  const faceOffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  if (!state) {
    return (
      <Box sx={{ height: '100vh', bgcolor: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ ...fontSx, color: '#ffffff33', fontSize: '1.2rem', letterSpacing: '0.2em' }}>LOADING…</Typography>
      </Box>
    );
  }

  const { roundState, teams, boards, config } = state;
  const currentBoard: SurveyBoard | undefined = boards.find(b => b.id === roundState.currentBoardId);
  const boardRevealed = roundState.phase !== 'idle' && roundState.phase !== 'face_off' || (roundState.phase === 'face_off' && roundState.faceOffState !== 'waiting_buzz');
  const questionRevealed = roundState.phase !== 'idle' && roundState.phase !== 'face_off';
  const mult = config.multiplierSchedule[roundState.currentRound - 1] ?? config.multiplierSchedule[config.multiplierSchedule.length - 1] ?? 1;

  const activeTeamId = roundState.phase === 'steal'
    ? roundState.stealingTeamId
    : roundState.phase === 'main_play' || roundState.phase === 'post_round'
    ? roundState.controllingTeamId
    : roundState.buzzWinnerTeamId;

  const strikingTeam = faceOffStrikeVisible
    ? teams.find(t => t.id === roundState.faceOffStrikeTeamId)
    : null;
  const strikingTeamColor = strikingTeam
    ? (strikingTeam.id === 'team-1' ? TEAM_COLORS[0] : TEAM_COLORS[1])
    : '#ff2020';

  const stealingTeam = roundState.phase === 'steal' && roundState.stealingTeamId
    ? teams.find(t => t.id === roundState.stealingTeamId)
    : null;
  const stealTeamColor = stealingTeam
    ? (stealingTeam.id === 'team-1' ? TEAM_COLORS[0] : TEAM_COLORS[1])
    : '#fff';

  const winner = roundState.phase === 'game_over'
    ? [...teams].sort((a, b) => b.score - a.score)[0]
    : null;

  const slotCount = currentBoard?.answers.length ?? 0;

  return (
    <Box sx={{
      height: '100vh',
      width: '100vw',
      bgcolor: BG,
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, #0d0d2a 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #0a0a1e 0%, transparent 50%)',
      display: 'flex',
      flexDirection: 'column',
      p: 'clamp(8px, 1.5vw, 20px)',
      gap: 'clamp(6px, 1vw, 14px)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ── Top row: Score | Question | Score ── */}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch', minHeight: '14%' }}>
        <ScorePanel team={teams[0]} active={activeTeamId === teams[0].id} colorHex={TEAM_COLORS[0]} />
        <QuestionPanel question={questionRevealed ? (currentBoard?.question ?? '') : ''} boardRevealed={boardRevealed} />
        <ScorePanel team={teams[1]} active={activeTeamId === teams[1].id} colorHex={TEAM_COLORS[1]} />
      </Box>

      {/* ── Answer board ── */}
      <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(4px, 0.8vw, 10px)', alignContent: 'start' }}>
        {roundState.phase === 'idle' ? null : (
          Array.from({ length: slotCount }, (_, i) => {
            const rank = i + 1;
            const revEntry = roundState.revealedAnswers.find(r => r.rank === rank);
            const answer = currentBoard?.answers.find(a => a.rank === rank);
            return (
              <AnswerSlot
                key={rank}
                rank={rank}
                text={answer?.text ?? ''}
                points={answer?.points ?? 0}
                revealed={!!revEntry}
                animIndex={i}
              />
            );
          })
        )}
      </Box>

      {/* ── Bottom row: Multiplier | Round Total | Strikes ── */}
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', alignItems: 'center' }}>
        {mult > 1 && <MultiplierPanel mult={mult} />}
        <Box sx={{ flex: 1 }} />
        <RoundTotalPanel round={roundState.currentRound} bank={roundState.roundBank} />
        <StrikesPanel count={roundState.strikeCount} />
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
