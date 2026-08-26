import type { GameModeClient } from '../../shared/types/gameMode';
import { TToTOAdminComponent } from './TToTOAdminComponent';
import { TToTOHostComponent } from './TToTOHostComponent';
import { TToTOShowComponent } from './TToTOShowComponent';

export const ttotoClientMode: GameModeClient = {
  id: 'ttoto',
  displayName: 'This, That, or the Other',
  ShowComponent: TToTOShowComponent,
  HostComponent: TToTOHostComponent,
  AdminComponent: TToTOAdminComponent,
};
