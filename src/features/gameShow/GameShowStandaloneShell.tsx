import { Box } from '@mui/material';

export const GameShowStandaloneShell = ({ children, hideCursor }: { children: React.ReactNode; hideCursor?: boolean }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0b1020',
        color: 'white',
        ...(hideCursor && { cursor: 'none', '& *': { cursor: 'none !important' } }),
      }}
    >
      {children}
    </Box>
  );
};
