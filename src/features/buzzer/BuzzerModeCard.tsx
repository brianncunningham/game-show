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

          {/* Controller assignments + hint — only shown in hardware mode */}
          {buzzerMode === 'hardware' && (
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
              ) : (() => {
                const mid = Math.ceil(controllerAssignments.length / 2);
                const cols = [controllerAssignments.slice(0, mid), controllerAssignments.slice(mid)];
                const AssignmentTable = ({ rows }: { rows: ControllerAssignment[] }) => (
                  <Table size="small" sx={{ '& td, & th': cell }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...cell, color: '#aaa' }}>#</TableCell>
                        <TableCell sx={{ ...cell, color: '#aaa' }}>Player</TableCell>
                        <TableCell sx={{ ...cell, color: '#aaa' }}>Team</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map(a => (
                        <TableRow key={a.controllerId}>
                          <TableCell>
                            <Box sx={{
                              width: 26, height: 26, borderRadius: '50%',
                              border: '2px solid #56d7ffcc',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              bgcolor: '#56d7ff18',
                            }}>
                              <Typography sx={{ fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', color: '#56d7ff', lineHeight: 1 }}>
                                {a.controllerId}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{a.playerName}</TableCell>
                          <TableCell sx={{ color: '#888' }}>{teamName(a.teamId)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                );
                return (
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box flex={1}><AssignmentTable rows={cols[0]} /></Box>
                    {cols[1].length > 0 && <Box flex={1}><AssignmentTable rows={cols[1]} /></Box>}
                  </Stack>
                );
              })()}

              <Typography variant="caption" color="text.disabled">
                Each physical buzzer must send its controllerId (shown above) to the judge.
              </Typography>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
