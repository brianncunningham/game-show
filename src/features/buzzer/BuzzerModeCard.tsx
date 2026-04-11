/**
 * BuzzerModeCard
 *
 * Shown on /gameadmin. Lets the host set buzzerMode for this session and
 * displays the current controller assignments (generated after player shuffle).
 *
 * Future /buzz claiming will read controllerAssignments to display player names
 * and mark claimedAt when a phone session connects.
 */

import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { setBuzzerMode } from '../gameShow/api';
import type { BuzzerMode, ControllerAssignment, GameShowTeam } from '../gameShow/types';

interface Props {
  buzzerMode: BuzzerMode;
  controllerAssignments: ControllerAssignment[];
  teams: GameShowTeam[];
}

const MODE_DESC: Record<BuzzerMode, string> = {
  manual:   'Host clicks buzz winner on the host page. No hardware or phone needed.',
  phone:    'Players open /buzz on their phone and claim a preassigned controller slot.',
  hardware: 'Physical buzzers send inputs to the judge. Controller IDs must match assignments.',
};

const cell = { borderColor: '#ffffff18', py: 0.75, px: 1.5, fontSize: '0.8rem', color: 'white' };

export const BuzzerModeCard = ({ buzzerMode, controllerAssignments, teams }: Props) => {
  const teamName = (teamId: string) => teams.find(t => t.id === teamId)?.name ?? teamId;

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Buzzer Mode</Typography>

          <Stack spacing={1}>
            <ToggleButtonGroup
              value={buzzerMode}
              exclusive
              size="small"
              onChange={(_e, val) => { if (val) void setBuzzerMode(val as BuzzerMode); }}
            >
              <ToggleButton value="manual">Manual</ToggleButton>
              <ToggleButton value="phone">Phone</ToggleButton>
              <ToggleButton value="hardware">Hardware</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.disabled">
              {MODE_DESC[buzzerMode]}
            </Typography>
          </Stack>

          {/* Controller assignments — generated on player shuffle */}
          <Stack spacing={1}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="subtitle2" color="text.secondary">
                Controller Assignments
              </Typography>
              <Typography variant="caption" color="text.disabled">
                (regenerated on player shuffle)
              </Typography>
            </Stack>

            {controllerAssignments.length === 0 ? (
              <Typography variant="caption" color="text.disabled">
                No assignments yet — run player shuffle to generate.
              </Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ '& td, & th': cell }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...cell, color: '#aaa' }}>controllerId</TableCell>
                      <TableCell sx={{ ...cell, color: '#aaa' }}>Team</TableCell>
                      <TableCell sx={{ ...cell, color: '#aaa' }}>Player</TableCell>
                      {buzzerMode === 'phone' && (
                        <TableCell sx={{ ...cell, color: '#aaa' }}>Claimed</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {controllerAssignments.map(a => (
                      <TableRow key={a.controllerId}>
                        <TableCell><code>{a.controllerId}</code></TableCell>
                        <TableCell>{teamName(a.teamId)}</TableCell>
                        <TableCell>{a.playerName}</TableCell>
                        {buzzerMode === 'phone' && (
                          <TableCell>
                            {a.claimedAt
                              ? <Chip label="Claimed" color="success" size="small" />
                              : <Chip label="Waiting" size="small" />}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Stack>

          {/* Mode-specific hints */}
          {buzzerMode === 'phone' && (
            <Typography variant="caption" color="text.disabled">
              Players visit /buzz and choose their name to claim their slot. The app creates
              assignments first — the phone session claims an existing one.
            </Typography>
          )}
          {buzzerMode === 'hardware' && (
            <Typography variant="caption" color="text.disabled">
              Each physical buzzer must send its controllerId (shown above) to the judge.
              Map hardware controller IDs to match the assignment table.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
