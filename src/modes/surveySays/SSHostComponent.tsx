import { Box, Typography } from '@mui/material';

export const SSHostComponent = () => {
  return (
    <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <Typography variant="h4" color="text.secondary">
        Family Feud — Host controls coming soon
      </Typography>
    </Box>
  );
};

export default SSHostComponent;
