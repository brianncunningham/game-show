import type { Router } from 'express';
import type { JudgeController } from '../../shared/buzzer/judgeController.js';
import type { GameModeServer } from '../../shared/types/gameMode.js';
import ttotoRoutes from './routes.js';
import { ttotoStore } from './store.js';

export const ttotoMode: GameModeServer = {
  id: 'ttoto',
  displayName: 'This, That, or the Other',

  mountRoutes(router: Router, _judge: JudgeController): void {
    router.use(ttotoRoutes);
  },

  onActivate(): void {
    console.log('[TToTO] Mode activated');
  },

  onDeactivate(): void {
    console.log('[TToTO] Mode deactivated');
  },

  reset(): void {
    ttotoStore.reset();
    console.log('[TToTO] Reset');
  },
};
