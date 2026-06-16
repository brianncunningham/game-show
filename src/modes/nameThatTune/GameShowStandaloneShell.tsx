import { useEffect } from 'react';
import { Box } from '@mui/material';

export const GameShowStandaloneShell = ({ children, hideCursor }: { children: React.ReactNode; hideCursor?: boolean }) => {
  useEffect(() => {
    if (!hideCursor) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [hideCursor]);

  return (
    <Box
      sx={{
        ...(hideCursor ? { height: '100vh', overflow: 'hidden' } : { minHeight: '100vh', overflowY: 'auto' }),
        bgcolor: '#0b1020',
        color: 'white',
        ...(hideCursor && { cursor: 'none', '& *': { cursor: 'none !important' } }),
      }}
    >
      {children}
    </Box>
  );
};
