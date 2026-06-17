import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useState } from 'react';
import { useActiveMode } from '../shared/hooks/useActiveMode';
import { getClientMode } from '../shared/modeRegistry';

export const GameAdminPage = () => {
  const { modeState, isLoading, switchMode } = useActiveMode();
  const [pendingModeId, setPendingModeId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const mode = modeState.activeModeId ? getClientMode(modeState.activeModeId) : null;

  const handleModeSelect = (newModeId: string) => {
    if (newModeId === modeState.activeModeId) return;
    setPendingModeId(newModeId);
  };

  const handleConfirmSwitch = async () => {
    if (!pendingModeId) return;
    await switchMode(pendingModeId);
    setPendingModeId(null);
  };

  return (
    <>
      {modeState.modes.length > 1 && (
        <Box sx={{ px: 2, pt: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Game Mode
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={modeState.activeModeId}
              onChange={(_e, val) => { if (val) handleModeSelect(val); }}
            >
              {modeState.modes.map((m) => (
                <ToggleButton key={m.id} value={m.id}>{m.displayName}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>
        </Box>
      )}

      {mode ? <mode.AdminComponent /> : (
        <Box sx={{ p: 4 }}>
          <Typography color="error" variant="h4">No active game mode.</Typography>
        </Box>
      )}

      <Dialog open={Boolean(pendingModeId)} onClose={() => setPendingModeId(null)}>
        <DialogTitle>Switch Game Mode?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Switching to <strong>{modeState.modes.find(m => m.id === pendingModeId)?.displayName}</strong> will
            reset the current game state. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingModeId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void handleConfirmSwitch()}>
            Switch &amp; Reset
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GameAdminPage;
