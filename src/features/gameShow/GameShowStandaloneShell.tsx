import { Box } from '@mui/material';

export const GameShowStandaloneShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0b1020',
        color: 'white',
      }}
    >
      {children}
    </Box>
  );
};
