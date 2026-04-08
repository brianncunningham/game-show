import { useEffect, useState } from 'react';
import { Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { randomAssignPlayers } from './api';
import type { GameShowTeam } from './types';

interface TeamSetupProps {
  teams: GameShowTeam[];
  playerPool: string[];
  onTeamsChange: (teams: GameShowTeam[]) => void;
  onPlayerPoolChange: (players: string[]) => void;
}

const parsePlayers = (value: string) =>
  value
    .split(',')
    .map((player) => player.trim())
    .filter(Boolean);

export const TeamSetup = ({ teams, playerPool, onTeamsChange, onPlayerPoolChange }: TeamSetupProps) => {
  const safePlayerPool = playerPool ?? [];
  const [playerPoolDraft, setPlayerPoolDraft] = useState(safePlayerPool.join(', '));

  useEffect(() => {
    setPlayerPoolDraft(safePlayerPool.join(', '));
  }, [safePlayerPool]);

  const updateTeam = (teamId: string, patch: Partial<GameShowTeam>) => {
    onTeamsChange(teams.map((team) => (team.id === teamId ? { ...team, ...patch } : team)));
  };

  const commitPlayerPool = () => {
    onPlayerPoolChange(parsePlayers(playerPoolDraft));
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Team setup</Typography>
            <Button
              variant="outlined"
              onClick={() => {
                commitPlayerPool();
                void randomAssignPlayers();
              }}
            >
              Apply + random assign
            </Button>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap">
            <TextField
              label="Player pool (comma separated)"
              size="small"
              multiline
              minRows={2}
              sx={{ minWidth: 420, flex: 1 }}
              value={playerPoolDraft}
              onChange={(event) => setPlayerPoolDraft(event.target.value)}
              onBlur={commitPlayerPool}
            />
            <Button variant="contained" onClick={commitPlayerPool}>
              Apply players
            </Button>
          </Stack>

          {teams.map((team) => (
            <Stack key={team.id} direction="row" spacing={2} flexWrap="wrap">
              <TextField
                label="Team name"
                size="small"
                value={team.name}
                onChange={(event) => updateTeam(team.id, { name: event.target.value })}
              />
              <TextField
                label="Assigned players"
                size="small"
                sx={{ minWidth: 360 }}
                value={team.players.join(', ')}
                InputProps={{ readOnly: true }}
              />
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
