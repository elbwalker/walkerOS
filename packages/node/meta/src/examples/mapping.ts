import type { Mapping, WalkerOS } from '@elbwalker/types';
import type { DestinationMeta } from '..';
import { isObject } from '@walkerOS/utils';

export const InitUserData: DestinationMeta.Custom = {
  pixelId: 'p1x3l1d',
  accessToken: 's3cr3t',
  user_data: {
    external_id: { set: ['user.device', 'user.session'] },
  },
};

export const Purchase: DestinationMeta.EventConfig = {
  name: 'Purchase',
  data: {
    map: {
      order_id: 'data.id',
      currency: { key: 'data.currency', value: 'EUR' },
      value: 'data.total',
      contents: {
        loop: [
          'nested',
          {
            condition: (entity) =>
              isObject(entity) && entity.type === 'product',
            map: {
              id: 'data.id',
              item_price: 'data.price',
              quantity: { key: 'data.quantity', value: 1 },
            },
          },
        ],
      },
      num_items: {
        fn: (event) =>
          (event as WalkerOS.Event).nested.filter(
            (item) => item.type === 'product',
          ).length,
      },
    },
  },
};

export const config = {
  order: { complete: Purchase },
} satisfies Mapping.Config;
