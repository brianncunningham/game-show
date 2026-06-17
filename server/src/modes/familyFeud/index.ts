import type { Router } from 'express';
import type { JudgeController } from '../../shared/buzzer/judgeController.js';
import type { GameModeServer } from '../../shared/types/gameMode.js';

export const familyFeudMode: GameModeServer = {
  id: 'feud',
  displayName: 'Family Feud',

  mountRoutes(_router: Router, _judge: JudgeController): void {
    /* No routes yet — stub only */
  },

  onActivate(): void {
    console.log('[FamilyFeud] Mode activated');
  },

  onDeactivate(): void {
    console.log('[FamilyFeud] Mode deactivated');
  },

  reset(): void {
    console.log('[FamilyFeud] Reset (no state to clear)');
  },
};
