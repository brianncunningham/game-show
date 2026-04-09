import { useEffect, useState } from 'react';
import { Button, Card, CardContent, FormControlLabel, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { randomAssignPlayers } from './api';
import type { GameShowTeam } from './types';

const TEAM_TEMPLATES: GameShowTeam[] = [
  { id: 'team-a', name: 'Team A', players: [], score: 0, eliminated: false },
  { id: 'team-b', name: 'Team B', players: [], score: 0, eliminated: false },
  { id: 'team-c', name: 'Team C', players: [], score: 0, eliminated: false },
  { id: 'team-d', name: 'Team D', players: [], score: 0, eliminated: false },
];

interface TeamSetupProps {
  teamCount: 2 | 3 | 4;
  teams: GameShowTeam[];
  playerPool: string[];
  onTeamCountChange: (count: 2 | 3 | 4) => void;
  onTeamsChange: (teams: GameShowTeam[]) => void;
  onPlayerPoolChange: (players: string[]) => void;
}

const parsePlayers = (value: string) =>
  value
    .split(',')
    .map((player) => player.trim())
    .filter(Boolean);

export const TeamSetup = ({ teamCount, teams, playerPool, onTeamCountChange, onTeamsChange, onPlayerPoolChange }: TeamSetupProps) => {
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

  const handleTeamCountChange = (count: 2 | 3 | 4) => {
    const nextTeams = Array.from({ length: count }, (_, i) =>
      teams[i] ?? { ...TEAM_TEMPLATES[i] }
    );
    onTeamCountChange(count);
    onTeamsChange(nextTeams);
  };

  const displayedTeams = teams.slice(0, teamCount);

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

          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" color="text.secondary">Number of teams:</Typography>
            <RadioGroup
              row
              value={String(teamCount)}
              onChange={(e) => handleTeamCountChange(Number(e.target.value) as 2 | 3 | 4)}
            >
              {([2, 3, 4] as const).map(n => (
                <FormControlLabel key={n} value={String(n)} control={<Radio size="small" />} label={String(n)} />
              ))}
            </RadioGroup>
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

          {displayedTeams.map((team) => (
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
