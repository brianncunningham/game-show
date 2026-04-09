import { Box } from '@mui/material';

export const GameShowStandaloneShell = ({ children, hideCursor }: { children: React.ReactNode; hideCursor?: boolean }) => {
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
