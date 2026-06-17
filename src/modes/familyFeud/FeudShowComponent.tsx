import { Box, Typography } from '@mui/material';

export const FeudShowComponent = () => {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      bgcolor: '#0a0a1a',
      gap: 3,
    }}>
      <Typography
        variant="h1"
        sx={{
          fontWeight: 900,
          fontSize: { xs: '3rem', md: '6rem' },
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          textShadow: '0 0 40px #c8102ecc, 0 0 80px #c8102e66',
        }}
      >
        Family Feud
      </Typography>
      <Box sx={{
        width: { xs: 200, md: 400 },
        height: 6,
        borderRadius: 3,
        background: 'linear-gradient(90deg, #c8102e, #ff6b35, #c8102e)',
        boxShadow: '0 0 20px #c8102e88',
      }} />
      <Typography
        variant="h5"
        sx={{ color: '#ffffff66', fontStyle: 'italic', letterSpacing: '0.2em', mt: 2 }}
      >
        Coming Soon
      </Typography>
    </Box>
  );
};

export default FeudShowComponent;
