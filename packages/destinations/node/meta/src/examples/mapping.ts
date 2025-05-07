import type { Mapping, WalkerOS } from '@elbwalker/types';
import type { DestinationMeta } from '..';

export const InitUserData: DestinationMeta.Custom = {
  pixelId: 'data.pixelId',
  accessToken: 'data.accessToken',
  user_data: {
    em: { value: 'foo@bar.com' },
  },
};

export const Purchase: DestinationMeta.EventConfig = {
  name: 'Purchase',
  data: {
    map: {
      event_id: 'id',
    },
  },
};

export const config = {
  order: { complete: Purchase },
} satisfies Mapping.Config;
