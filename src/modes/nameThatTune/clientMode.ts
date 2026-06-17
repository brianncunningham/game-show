import type { GameModeClient } from '../../shared/types/gameMode';
import { NTTAdminComponent } from './NTTAdminComponent';
import { NTTHostComponent } from './NTTHostComponent';
import { NTTShowComponent } from './NTTShowComponent';

export const nttClientMode: GameModeClient = {
  id: 'ntt',
  displayName: 'Name That Tune',
  ShowComponent: NTTShowComponent,
  HostComponent: NTTHostComponent,
  AdminComponent: NTTAdminComponent,
};
