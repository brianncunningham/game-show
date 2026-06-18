import type { Router } from 'express';
import type { JudgeController } from '../../shared/buzzer/judgeController.js';
import type { GameModeServer } from '../../shared/types/gameMode.js';
import ssRoutes from './routes.js';
import { surveySaysStore } from './store.js';

export const surveySaysMode: GameModeServer = {
  id: 'survey-says',
  displayName: 'Survey Says',

  mountRoutes(router: Router, _judge: JudgeController): void {
    router.use(ssRoutes);
  },

  onActivate(): void {
    console.log('[SurveySays] Mode activated');
  },

  onDeactivate(): void {
    console.log('[SurveySays] Mode deactivated');
  },

  reset(): void {
    surveySaysStore.reset();
    console.log('[SurveySays] Reset');
  },
};
