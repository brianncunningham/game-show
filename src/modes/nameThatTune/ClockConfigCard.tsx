import {
  Card,
  CardContent,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { updateClockConfig } from './api';
import type { GameShowClockConfig } from './types';

interface Props {
  clockConfig: GameShowClockConfig;
}

export const ClockConfigCard = ({ clockConfig }: Props) => {
  const update = (patch: Partial<GameShowClockConfig>) => {
    void updateClockConfig(patch);
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h6">Clock Mechanism</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={clockConfig.enabled}
                  onChange={(_e, checked) => update({ enabled: checked })}
                />
              }
              label="Enabled"
            />
          </Stack>

          {clockConfig.enabled && (
            <>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <TextField
                  label="Clocks per team per round"
                  type="number"
                  size="small"
                  sx={{ width: 210 }}
                  defaultValue={clockConfig.clocksPerTeam}
                  inputProps={{ min: 0, max: 10 }}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 0) update({ clocksPerTeam: v });
                  }}
                />
                <TextField
                  label="Clock duration (seconds)"
                  type="number"
                  size="small"
                  sx={{ width: 210 }}
                  defaultValue={clockConfig.durationSecs}
                  inputProps={{ min: 5, max: 60 }}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v > 0) update({ durationSecs: v });
                  }}
                />
                <TextField
                  label="Min delay before callable (seconds)"
                  type="number"
                  size="small"
                  sx={{ width: 250 }}
                  defaultValue={clockConfig.minDelaySecs}
                  inputProps={{ min: 0, max: 30 }}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 0) update({ minDelaySecs: v });
                  }}
                />
              </Stack>

              <Stack direction="row" spacing={3} flexWrap="wrap">
                <FormControlLabel
                  control={
                    <Switch
                      checked={clockConfig.penalizeClocked}
                      onChange={(_e, checked) => update({ penalizeClocked: checked })}
                    />
                  }
                  label="Penalize clocked team on expiry"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={clockConfig.penalizeClocking}
                      onChange={(_e, checked) => update({ penalizeClocking: checked })}
                    />
                  }
                  label="Penalize clocking team if clocked team answers correctly"
                />
              </Stack>

              <Typography variant="caption" color="text.disabled">
                Penalties = current point value × multiplier. All members of an opposing team must press their buzzer to call a clock (after the min delay). Host can also start a clock directly from the host page.
              </Typography>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
