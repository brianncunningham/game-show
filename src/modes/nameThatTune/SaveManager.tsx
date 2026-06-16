import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveIcon from '@mui/icons-material/Save';
import { createSave, deleteSave, listSaves, loadSave } from './api';
import type { GameSaveMeta } from './api';

interface SaveManagerProps {
  onLoaded?: () => void;
}

export const SaveManager = ({ onLoaded }: SaveManagerProps) => {
  const [saves, setSaves] = useState<GameSaveMeta[]>([]);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await listSaves();
    setSaves(list.sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleSave = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createSave(newName.trim());
      setNewName('');
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (id: string) => {
    setLoadingId(id);
    try {
      await loadSave(id);
      onLoaded?.();
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteSave(id);
      await refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Game saves</Typography>
          <Typography variant="body2" color="text.secondary">
            Saves capture all questions and song metadata for the current game. Loading a save replaces current questions only — teams and scores are unaffected.
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Save name"
              size="small"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSave(); }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!newName.trim() || saving}
              onClick={() => void handleSave()}
            >
              Save current
            </Button>
          </Stack>

          {saves.length > 0 && <Divider />}

          <Stack spacing={1}>
            {saves.map((save) => (
              <Box
                key={save.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  px: 1.5,
                  py: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{save.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(save.savedAt).toLocaleString()}
                  </Typography>
                </Box>
                <Chip label="load" size="small" icon={<FolderOpenIcon />}
                  onClick={() => void handleLoad(save.id)}
                  disabled={loadingId === save.id}
                  color="primary" variant="outlined"
                  sx={{ cursor: 'pointer' }}
                />
                <Tooltip title="Delete save">
                  <IconButton
                    size="small"
                    color="error"
                    disabled={deletingId === save.id}
                    onClick={() => void handleDelete(save.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
            {saves.length === 0 && (
              <Typography variant="body2" color="text.secondary">No saves yet.</Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};
