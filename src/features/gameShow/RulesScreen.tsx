import { Box, Grid, Stack, Typography } from '@mui/material';

const GOLD = '#ffd700';
const CYAN = '#40d8ff';
const PANEL_BG = 'rgba(5, 12, 30, 0.92)';

const rules = [
  {
    number: '01',
    icon: '🎯',
    title: 'Gameplay',
    subtitle: '',
    color: CYAN,
    items: [
      'Teams alternate selecting themes each round.',
      'Buzz in first to name the Song Title.',
      'Correct answer = +100 points for your team.',
    ],
  },
  {
    number: '02',
    icon: '🎤',
    title: 'Bonus: Correct Artist',
    subtitle: '',
    color: GOLD,
    items: [
      'Name the Song? Earn a chance to name the Artist.',
      'Correct artist = +50 bonus points.',
      'Artist bonus is only available to the buzzing team.',
    ],
  },
  {
    number: '03',
    icon: '⚡',
    title: 'Steal Opportunity',
    subtitle: '',
    color: '#ff6b6b',
    items: [
      'Wrong answer? The other team gets a chance.',
      'Name the Song Title to Steal and capture the points.',
      'Failed steal — no points awarded.',
    ],
  },
  {
    number: '04',
    icon: '✖️',
    title: 'Round Multipliers',
    subtitle: '',
    color: '#a78bfa',
    items: [
      'Point values increase each round.',
      'Round 2 = Double Points.',
      'Round 3 = Triple Points.',
    ],
  },
];

export const RulesScreen = () => {
  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      background: 'radial-gradient(ellipse 110% 90% at 50% 20%, rgba(8,22,58,0.98) 0%, rgba(2,5,15,1) 65%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      px: '3vw',
      py: '2.5vh',
    }}>

      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: '2.5vh' }}>
        {/* Crown + wreath decoration */}
        <Typography sx={{ fontSize: 'clamp(1.2rem, 3vw, 3.5rem)', lineHeight: 1, mb: 0.5 }}>
          👑
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
          <Box sx={{ height: 2, width: 'clamp(40px, 6vw, 100px)', background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
          <Typography sx={{ color: GOLD, fontSize: 'clamp(0.6rem, 0.9vw, 1rem)', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700 }}>
            🎵 Name That Tune 🎵
          </Typography>
          <Box sx={{ height: 2, width: 'clamp(40px, 6vw, 100px)', background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
        </Box>

        <Typography sx={{
          fontWeight: 900,
          fontSize: 'clamp(1.8rem, 5vw, 6.5rem)',
          lineHeight: 1.05,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          background: `linear-gradient(135deg, ${GOLD} 0%, #fff8dc 40%, ${GOLD} 70%, #b8860b 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: 'none',
          filter: 'drop-shadow(0 0 18px rgba(255,215,0,0.6))',
          mt: 0.5,
        }}>
          Official Rules
        </Typography>

      </Box>

      {/* Rule panels */}
      <Grid container spacing={{ xs: 1, md: 1.5 }} sx={{ flex: 1, width: '100%', maxWidth: '1400px' }}>
        {rules.map((rule) => (
          <Grid item xs={12} sm={6} key={rule.number} sx={{ display: 'flex' }}>
            <Box sx={{
              flex: 1,
              borderRadius: 4,
              border: `1.5px solid ${rule.color}55`,
              background: PANEL_BG,
              boxShadow: `0 0 24px ${rule.color}22, inset 0 0 24px ${rule.color}08`,
              p: { xs: '1.2vh 2vw', md: '1.5vh 2vw' },
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              transition: 'box-shadow 300ms ease',
              '&:hover': {
                boxShadow: `0 0 40px ${rule.color}44, inset 0 0 30px ${rule.color}12`,
              },
            }}>
              {/* Panel number watermark */}
              <Typography sx={{
                position: 'absolute',
                top: '-0.1em',
                right: '0.2em',
                fontSize: 'clamp(4rem, 10vw, 11rem)',
                fontWeight: 900,
                color: `${rule.color}09`,
                lineHeight: 1,
                userSelect: 'none',
                pointerEvents: 'none',
                letterSpacing: '-0.05em',
              }}>
                {rule.number}
              </Typography>

              {/* Icon + title */}
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                <Typography sx={{ fontSize: 'clamp(1.4rem, 3vw, 3.2rem)', lineHeight: 1 }}>
                  {rule.icon}
                </Typography>
                <Box>
                  <Typography sx={{
                    fontWeight: 900,
                    fontSize: 'clamp(0.9rem, 1.8vw, 2.2rem)',
                    color: rule.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    lineHeight: 1.1,
                    textShadow: `0 0 12px ${rule.color}88`,
                  }}>
                    {rule.title}
                  </Typography>
                </Box>
              </Stack>

              {/* Divider */}
              <Box sx={{ height: '1px', background: `linear-gradient(90deg, ${rule.color}88, transparent)`, mb: 1.2 }} />

              {/* Rule items */}
              <Stack spacing={0.8} sx={{ flex: 1 }}>
                {rule.items.map((item, i) => (
                  <Stack key={i} direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: rule.color,
                      boxShadow: `0 0 6px ${rule.color}`,
                      flexShrink: 0,
                    }} />
                    <Typography sx={{
                      color: 'rgba(255,255,255,0.88)',
                      fontSize: 'clamp(0.9rem, 1.6vw, 1.9rem)',
                      lineHeight: 1.45,
                      fontWeight: 500,
                    }}>
                      {item}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Footer */}
      <Typography sx={{
        color: GOLD,
        fontSize: 'clamp(1.4rem, 3vw, 4rem)',
        fontWeight: 900,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        textAlign: 'center',
        mt: '2vh',
        textShadow: '0 0 20px rgba(255,215,0,0.7), 0 0 50px rgba(255,215,0,0.3)',
        animation: 'rulesPulse 3s ease-in-out infinite',
        '@keyframes rulesPulse': { '0%': { opacity: 0.75 }, '50%': { opacity: 1 }, '100%': { opacity: 0.75 } },
      }}>
        The Team with the Most Points Wins
      </Typography>
    </Box>
  );
};
