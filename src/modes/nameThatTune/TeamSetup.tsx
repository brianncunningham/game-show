import { useState } from 'react';
import { Button, Card, CardContent, FormControlLabel, IconButton, MenuItem, Radio, RadioGroup, Select, Stack, TextField, Tooltip, Typography } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import PeopleIcon from '@mui/icons-material/People';
import { randomAssignPlayers } from './api';
import { PlayerRosterModal } from './PlayerRosterModal';
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

export const TeamSetup = ({ teamCount, teams, playerPool, onTeamCountChange, onTeamsChange, onPlayerPoolChange }: TeamSetupProps) => {
  const safePlayerPool = playerPool ?? [];
  const [rosterOpen, setRosterOpen] = useState(false);

  const updateTeam = (teamId: string, patch: Partial<GameShowTeam>) => {
    onTeamsChange(teams.map((team) => (team.id === teamId ? { ...team, ...patch } : team)));
  };

  const handleTeamCountChange = (count: 2 | 3 | 4) => {
    const nextTeams = Array.from({ length: count }, (_, i) =>
      teams[i] ?? { ...TEAM_TEMPLATES[i] }
    );
    onTeamCountChange(count);
    onTeamsChange(nextTeams);
  };

  const displayedTeams = teams.slice(0, teamCount);
  const assignedPlayers = new Set(displayedTeams.flatMap(t => t.players));
  const unassignedPool = safePlayerPool.filter(p => !assignedPlayers.has(p));

  const assignPlayerToTeam = (teamId: string, playerName: string) => {
    onTeamsChange(teams.map(team =>
      team.id === teamId ? { ...team, players: [...team.players, playerName] } : team
    ));
  };

  const clearTeamPlayers = (teamId: string) => {
    onTeamsChange(teams.map(team =>
      team.id === teamId ? { ...team, players: [] } : team
    ));
  };

  return (
    <>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="h6">Team setup</Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<PeopleIcon />}
                  onClick={() => setRosterOpen(true)}
                >
                  Manage players
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => void randomAssignPlayers()}
                >
                  Random assign
                </Button>
              </Stack>
            </Stack>

            {safePlayerPool.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                Pool ({safePlayerPool.length}): {safePlayerPool.join(', ')}
              </Typography>
            )}

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

            {displayedTeams.map((team) => {
              const teamUnassigned = unassignedPool;
              return (
                <Stack key={team.id} direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                  <TextField
                    label="Team name"
                    size="small"
                    value={team.name}
                    onChange={(event) => updateTeam(team.id, { name: event.target.value })}
                  />
                  <TextField
                    label="Assigned players"
                    size="small"
                    sx={{ minWidth: 200, flex: 1 }}
                    value={team.players.join(', ')}
                    InputProps={{ readOnly: true }}
                  />
                  {teamUnassigned.length > 0 && (
                    <Select
                      size="small"
                      displayEmpty
                      value=""
                      onChange={(e) => { if (e.target.value) assignPlayerToTeam(team.id, e.target.value as string); }}
                      sx={{ minWidth: 160, fontSize: '0.85rem' }}
                      renderValue={() => <em>Add player…</em>}
                    >
                      {teamUnassigned.map(p => (
                        <MenuItem key={p} value={p}>{p}</MenuItem>
                      ))}
                    </Select>
                  )}
                  {team.players.length > 0 && (
                    <Tooltip title="Clear team">
                      <IconButton size="small" onClick={() => clearTeamPlayers(team.id)}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      <PlayerRosterModal
        open={rosterOpen}
        currentPool={safePlayerPool}
        onClose={() => setRosterOpen(false)}
        onApply={(pool) => onPlayerPoolChange(pool)}
      />
    </>
  );
};
