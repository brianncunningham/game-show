import type { GameModeClient } from '../../shared/types/gameMode';
import { FeudAdminComponent } from './FeudAdminComponent';
import { FeudHostComponent } from './FeudHostComponent';
import { FeudShowComponent } from './FeudShowComponent';

export const feudClientMode: GameModeClient = {
  id: 'feud',
  displayName: 'Family Feud',
  ShowComponent: FeudShowComponent,
  HostComponent: FeudHostComponent,
  AdminComponent: FeudAdminComponent,
};
