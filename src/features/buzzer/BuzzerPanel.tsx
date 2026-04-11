import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { armJudge, resetJudge, simulateBuzz } from './buzzerApi';
import { useBuzzerState } from './useBuzzerState';

const STATE_COLOR: Record<string, 'default' | 'success' | 'error'> = {
  IDLE: 'default',
  ARMED: 'success',
  LOCKED: 'error',
};

interface BuzzerPanelProps {
  /** controllerId options for simulation — typically team names or device IDs */
  controllerIds: string[];
}

export const BuzzerPanel = ({ controllerIds }: BuzzerPanelProps) => {
  const { judgeState, eventLog } = useBuzzerState();
  const [simController, setSimController] = useState(controllerIds[0] ?? 'controller-1');

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" gap={1}>
            <Typography variant="h6">Buzzer</Typography>
            <Chip
              label={judgeState}
              color={STATE_COLOR[judgeState] ?? 'default'}
              size="small"
            />
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="contained"
              color="success"
              disabled={judgeState === 'ARMED'}
              onClick={() => void armJudge()}
            >
              ARM
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => void resetJudge()}
            >
              RESET
            </Button>
          </Stack>

          <Divider />

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">Simulate buzz:</Typography>
            {controllerIds.length > 0 ? (
              <Select
                size="small"
                value={simController}
                onChange={e => setSimController(e.target.value)}
                sx={{ minWidth: 160, fontSize: '0.85rem' }}
              >
                {controllerIds.map(id => (
                  <MenuItem key={id} value={id}>{id}</MenuItem>
                ))}
              </Select>
            ) : (
              <Typography variant="body2" color="text.disabled">No controllers configured</Typography>
            )}
            <Button
              size="small"
              variant="outlined"
              disabled={controllerIds.length === 0}
              onClick={() => void simulateBuzz(simController)}
            >
              Buzz
            </Button>
          </Stack>

          <Divider />

          <Stack spacing={0.5}>
            <Typography variant="overline" sx={{ lineHeight: 1.5 }}>Event log</Typography>
            {eventLog.length === 0 && (
              <Typography variant="body2" color="text.disabled">No events yet.</Typography>
            )}
            <Box sx={{ maxHeight: 180, overflowY: 'auto' }}>
              {eventLog.map((ev, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="baseline">
                  <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, flexShrink: 0 }}>
                    {ev.type}
                  </Typography>
                  {Object.keys(ev.payload ?? {}).length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {JSON.stringify(ev.payload)}
                    </Typography>
                  )}
                </Stack>
              ))}
            </Box>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};
