import { Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GameShowQuestion } from './types';

interface RevealScreenProps {
  mode: 'title' | 'artist' | 'both';
  question: GameShowQuestion;
  songIndex: number;
  onDone: () => void;
  duration?: number;
}

const SHOW_DELAY = 600;

export const RevealScreen = ({ mode, question, songIndex, onDone, duration = 4500 }: RevealScreenProps) => {
  const song = question.songs[songIndex] ?? question.songs[0];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setVisible(true), SHOW_DELAY);
    const doneTimer = window.setTimeout(onDone, duration + SHOW_DELAY);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(doneTimer);
    };
  }, [mode, duration, onDone]);

  if (!visible) return null;

  const showTitle = mode === 'title' || mode === 'both';
  const showArtist = mode === 'artist' || mode === 'both';

  const bgGradient =
    mode === 'artist'
      ? 'radial-gradient(ellipse 110% 80% at 50% 30%, rgba(80,0,160,0.75) 0%, rgba(20,0,60,0.98) 55%), linear-gradient(180deg, #06000f 0%, #10003a 50%, #06000f 100%)'
      : mode === 'both'
      ? 'radial-gradient(ellipse 110% 80% at 50% 30%, rgba(120,80,0,0.75) 0%, rgba(40,20,0,0.98) 55%), linear-gradient(180deg, #0a0600 0%, #1a1000 50%, #0a0600 100%)'
      : 'radial-gradient(ellipse 110% 80% at 50% 30%, rgba(160,120,0,0.75) 0%, rgba(60,40,0,0.98) 55%), linear-gradient(180deg, #0d0a00 0%, #1a1400 50%, #080600 100%)';

  const glowColor =
    mode === 'artist' ? 'rgba(180,80,255,0.9)' : mode === 'both' ? 'rgba(255,180,40,0.9)' : 'rgba(255,210,40,0.9)';

  const accentColor =
    mode === 'artist' ? '#c060ff' : mode === 'both' ? '#ffb830' : '#ffd740';

  return createPortal(
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: bgGradient,
        animation: 'revealBgPulse 900ms ease-in-out infinite',
        '@keyframes revealBgPulse': {
          '0%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.12)' },
          '100%': { filter: 'brightness(1)' },
        },
      }}
    >
      {/* Scanline overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Spotlight halo */}
      <Box
        sx={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '140%',
          height: '70%',
          background: `radial-gradient(ellipse at 50% 0%, ${glowColor.replace('0.9', '0.18')} 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Label badge */}
      <Typography
        sx={{
          position: 'relative',
          zIndex: 2,
          fontWeight: 900,
          fontSize: 'clamp(0.7rem, 1.4vw, 1.6rem)',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: accentColor,
          textShadow: `0 0 14px ${glowColor}`,
          mb: '2vh',
          opacity: 0.85,
        }}
      >
        {mode === 'title' ? '♪ Song Revealed' : mode === 'artist' ? '★ Artist Revealed' : '♪ ★ Full Reveal'}
      </Typography>

      {/* Title block */}
      {showTitle && (
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            px: '6vw',
            py: '2.5vh',
            mb: showArtist ? '2vh' : 0,
            borderRadius: 3,
            border: `2px solid ${accentColor}`,
            background: 'rgba(0,0,0,0.55)',
            boxShadow: `0 0 40px ${glowColor.replace('0.9', '0.5')}, 0 0 80px ${glowColor.replace('0.9', '0.25')}`,
            textAlign: 'center',
            animation: 'revealCardIn 400ms cubic-bezier(0.22,1,0.36,1)',
            '@keyframes revealCardIn': {
              '0%': { opacity: 0, transform: 'scale(0.88) translateY(24px)' },
              '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
            },
          }}
        >
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: 'clamp(2rem, 6vw, 8rem)',
              letterSpacing: '0.04em',
              color: '#fff',
              textShadow: `0 0 20px ${glowColor}, 0 0 50px ${glowColor.replace('0.9', '0.5')}`,
              lineHeight: 1.1,
            }}
          >
            {song.title || '—'}
          </Typography>
        </Box>
      )}

      {/* Artist block */}
      {showArtist && (
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            px: '6vw',
            py: '2vh',
            borderRadius: 3,
            border: `2px solid ${accentColor}`,
            background: 'rgba(0,0,0,0.55)',
            boxShadow: `0 0 40px ${glowColor.replace('0.9', '0.5')}, 0 0 80px ${glowColor.replace('0.9', '0.25')}`,
            textAlign: 'center',
            animation: 'revealCardIn 400ms cubic-bezier(0.22,1,0.36,1)',
            animationDelay: showTitle ? '120ms' : '0ms',
            animationFillMode: 'both',
            '@keyframes revealCardIn': {
              '0%': { opacity: 0, transform: 'scale(0.88) translateY(24px)' },
              '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
            },
          }}
        >
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: 'clamp(1.4rem, 4vw, 5.5rem)',
              letterSpacing: '0.06em',
              color: accentColor,
              textShadow: `0 0 16px ${glowColor}, 0 0 40px ${glowColor.replace('0.9', '0.45')}`,
              lineHeight: 1.15,
            }}
          >
            {song.artist || '—'}
          </Typography>
        </Box>
      )}
    </Box>,
    document.body
  );
};
