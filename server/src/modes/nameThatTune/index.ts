import type { Router } from 'express';
import type { JudgeController } from '../../shared/buzzer/judgeController.js';
import type { GameModeServer } from '../../shared/types/gameMode.js';
import { gameShowStore } from './store.js';
import nttRoutes from './routes.js';

export const nameThatTuneMode: GameModeServer = {
  id: 'ntt',
  displayName: 'Name That Tune',

  mountRoutes(router: Router, _judge: JudgeController): void {
    router.use('/', nttRoutes);
  },

  onActivate(): void {
    /* NTT socket is attached at startup in gameShowSocket.ts — nothing extra needed */
  },

  onDeactivate(): void {
    /* No timers or long-running processes to clean up */
  },

  reset(): void {
    gameShowStore.reset();
  },
};
