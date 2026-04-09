import { useEffect } from 'react';
import { Box } from '@mui/material';

export const GameShowStandaloneShell = ({ children, hideCursor }: { children: React.ReactNode; hideCursor?: boolean }) => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <Box
      sx={{
        height: '100vh',
        overflow: 'hidden',
        bgcolor: '#0b1020',
        color: 'white',
        ...(hideCursor && { cursor: 'none', '& *': { cursor: 'none !important' } }),
      }}
    >
      {children}
    </Box>
  );
};
