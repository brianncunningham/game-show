import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { addKnownPlayers, deleteKnownPlayer, listKnownPlayers } from './api';

interface PlayerRosterModalProps {
  open: boolean;
  currentPool: string[];
  onClose: () => void;
  onApply: (pool: string[]) => void;
}

export const PlayerRosterModal = ({ open, currentPool, onClose, onApply }: PlayerRosterModalProps) => {
  const [knownPlayers, setKnownPlayers] = useState<string[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState('');

  const refresh = useCallback(async () => {
    const list = await listKnownPlayers();
    setKnownPlayers(list);
  }, []);

  useEffect(() => {
    if (open) {
      void refresh();
      setChecked(new Set(currentPool));
    }
  }, [open, currentPool, refresh]);

  const toggle = (name: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const updated = await addKnownPlayers([name]);
    setKnownPlayers(updated);
    setChecked(prev => new Set([...prev, name]));
    setNewName('');
  };

  const handleDelete = async (name: string) => {
    const updated = await deleteKnownPlayer(name);
    setKnownPlayers(updated);
    setChecked(prev => { const next = new Set(prev); next.delete(name); return next; });
  };

  const handleApply = async () => {
    const pool = knownPlayers.filter(n => checked.has(n));
    await addKnownPlayers(pool);
    onApply(pool);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Player roster</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Add player"
              size="small"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleAdd(); }}
              sx={{ flex: 1 }}
            />
            <Button variant="contained" size="small" disabled={!newName.trim()} onClick={() => void handleAdd()}>
              Add
            </Button>
          </Stack>

          {knownPlayers.length > 0 && <Divider />}

          <Stack spacing={0}>
            {knownPlayers.length === 0 && (
              <Typography variant="body2" color="text.secondary">No players yet — add some above.</Typography>
            )}
            {knownPlayers.map(name => (
              <Box key={name} sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  sx={{ flex: 1, mr: 0 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={checked.has(name)}
                      onChange={() => toggle(name)}
                    />
                  }
                  label={name}
                />
                <IconButton size="small" color="error" onClick={() => void handleDelete(name)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, pl: 1 }}>
          {checked.size} selected
        </Typography>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void handleApply()}>Apply to pool</Button>
      </DialogActions>
    </Dialog>
  );
};
