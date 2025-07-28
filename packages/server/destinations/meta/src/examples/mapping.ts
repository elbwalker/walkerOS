import type { WalkerOS } from '@walkeros/core';
import type { DestinationMeta } from '..';
import { isObject } from '@walkeros/core';

export const InitUserData: DestinationMeta.Settings = {
  pixelId: 'p1x3l1d',
  accessToken: 's3cr3t',
  user_data: {
    external_id: { set: ['user.device', 'user.session'] },
  },
};

export const Purchase: DestinationMeta.Rule = {
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
} satisfies DestinationMeta.Rules;
