import { useEffect, useRef, useState } from 'react';
import { Button, Card, CardContent, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { startGame, updateGameConfig } from '../features/gameShow/api';
import { ContentManager } from '../features/gameShow/ContentManager';
import { SaveManager } from '../features/gameShow/SaveManager';
import { GameShowSharedView } from '../features/gameShow/GameShowSharedView';
import { TeamSetup } from '../features/gameShow/TeamSetup';
import { useGameShowState } from '../features/gameShow/useGameShowState';

export const GameAdminPage = () => {
  const { state, isLoading, error } = useGameShowState();
  const [multipliersText, setMultipliersText] = useState('');
  const multipliersFieldFocused = useRef(false);

  useEffect(() => {
    if (!multipliersFieldFocused.current && state) {
      setMultipliersText(state.rules.roundMultipliers.join(', '));
    }
  }, [state?.rules.roundMultipliers]);

  const controls = !state ? null : (
      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Button variant="contained" onClick={() => void startGame()}>
                  Start game
                </Button>
                <Typography color="text.secondary">
                  Shared state is live across admin, host, and show.
                </Typography>
              </Stack>

              <Stack direction="row" spacing={2} flexWrap="wrap">
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.practiceMode}
                      onChange={(_event, checked) => {
                        void updateGameConfig({ practiceMode: checked });
                      }}
                    />
                  }
                  label="Practice mode"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.rules.allowSteal}
                      onChange={(_event, checked) => {
                        void updateGameConfig({ rules: { ...state.rules, allowSteal: checked } });
                      }}
                    />
                  }
                  label="Allow steal"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.rules.wrongBuzzPenalty}
                      onChange={(_event, checked) => {
                        void updateGameConfig({ rules: { ...state.rules, wrongBuzzPenalty: checked } });
                      }}
                    />
                  }
                  label="Wrong buzz penalty"
                />
              </Stack>

              <TextField
                label="Round multipliers"
                size="small"
                value={multipliersText}
                onChange={(event) => setMultipliersText(event.target.value)}
                onFocus={() => { multipliersFieldFocused.current = true; }}
                onBlur={(event) => {
                  multipliersFieldFocused.current = false;
                  const values = event.target.value
                    .split(',')
                    .map((value) => Number(value.trim()))
                    .filter((value) => !Number.isNaN(value) && value > 0);

                  if (values.length) {
                    void updateGameConfig({ rules: { ...state.rules, roundMultipliers: values } });
                  }
                }}
              />
            </Stack>
          </CardContent>
        </Card>

        <TeamSetup
          teams={state.teams}
          playerPool={state.playerPool ?? []}
          onTeamsChange={(teams) => {
            void updateGameConfig({ teams });
          }}
          onPlayerPoolChange={(playerPool) => {
            void updateGameConfig({ playerPool });
          }}
        />

        <ContentManager
          questions={state.questions}
          onChange={(questions) => {
            void updateGameConfig({ questions });
          }}
        />

        <SaveManager />
      </Stack>
  );

  return (
    <GameShowSharedView
      title="Game Admin"
      subtitle="Pre-game setup and baseline config for the music game show."
      state={state}
      isLoading={isLoading}
      error={error}
      controls={controls}
    />
  );
};

export default GameAdminPage;
