import type { Router } from 'express';
import type { JudgeController } from '../../shared/buzzer/judgeController.js';
import type { GameModeServer } from '../../shared/types/gameMode.js';

export const surveySaysMode: GameModeServer = {
  id: 'survey-says',
  displayName: 'Survey Says',

  mountRoutes(_router: Router, _judge: JudgeController): void {
    /* No routes yet — stub only */
  },

  onActivate(): void {
    console.log('[SurveySays] Mode activated');
  },

  onDeactivate(): void {
    console.log('[SurveySays] Mode deactivated');
  },

  reset(): void {
    console.log('[SurveySays] Reset (no state to clear)');
  },
};
