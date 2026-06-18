import type { GameModeClient } from '../../shared/types/gameMode';
import { SSAdminComponent } from './SSAdminComponent';
import { SSHostComponent } from './SSHostComponent';
import { SSShowComponent } from './SSShowComponent';

export const surveySaysClientMode: GameModeClient = {
  id: 'survey-says',
  displayName: 'Survey Says',
  ShowComponent: SSShowComponent,
  HostComponent: SSHostComponent,
  AdminComponent: SSAdminComponent,
};
