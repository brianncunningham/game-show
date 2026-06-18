import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControlLabel, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { addKnownPlayers, deleteKnownPlayer, listKnownPlayers } from './api';

const MAX_POOL = 10;

interface Props {
  open: boolean;
  currentPool: string[];
  onClose: () => void;
  onApply: (pool: string[]) => void;
}

export const SSPlayerRosterModal = ({ open, currentPool, onClose, onApply }: Props) => {
  const [knownPlayers, setKnownPlayers] = useState<string[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState('');

  const refresh = useCallback(async () => {
    setKnownPlayers(await listKnownPlayers());
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
      if (next.has(name)) next.delete(name);
      else if (next.size < MAX_POOL) next.add(name);
      return next;
    });
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setKnownPlayers(await addKnownPlayers([name]));
    setChecked(prev => (prev.size < MAX_POOL ? new Set([...prev, name]) : prev));
    setNewName('');
  };

  const handleDelete = async (name: string) => {
    setKnownPlayers(await deleteKnownPlayer(name));
    setChecked(prev => { const next = new Set(prev); next.delete(name); return next; });
  };

  const handleApply = () => {
    onApply(knownPlayers.filter(n => checked.has(n)).slice(0, MAX_POOL));
    onClose();
  };

  const atMax = checked.size >= MAX_POOL;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Player roster — pick up to {MAX_POOL}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Add player" size="small" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleAdd(); }}
              sx={{ flex: 1 }}
            />
            <Button variant="contained" size="small" disabled={!newName.trim()} onClick={() => void handleAdd()}>Add</Button>
          </Stack>

          {knownPlayers.length > 0 && <Divider />}
          {knownPlayers.length === 0 && (
            <Typography variant="body2" color="text.secondary">No players yet — add some above.</Typography>
          )}
          {knownPlayers.length > 0 && (
            <Box sx={{ columns: 2, columnGap: 1 }}>
              {knownPlayers.map(name => {
                const isChecked = checked.has(name);
                return (
                  <Box key={name} sx={{ display: 'flex', alignItems: 'center', breakInside: 'avoid' }}>
                    <FormControlLabel
                      sx={{ flex: 1, mr: 0, minWidth: 0 }}
                      control={
                        <Checkbox size="small" checked={isChecked} disabled={!isChecked && atMax}
                          onChange={() => toggle(name)} />
                      }
                      label={<Typography variant="body2" noWrap>{name}</Typography>}
                    />
                    <IconButton size="small" color="error" onClick={() => void handleDelete(name)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" color={atMax ? 'warning.main' : 'text.secondary'} sx={{ flex: 1, pl: 1 }}>
          {checked.size}/{MAX_POOL} selected
        </Typography>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleApply}>Apply to pool</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SSPlayerRosterModal;
