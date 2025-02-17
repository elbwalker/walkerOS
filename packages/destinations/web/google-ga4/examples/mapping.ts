import type { Mapping } from '@elbwalker/types';
import { isObject } from '@elbwalker/utils';

export const mapping = {
  order: {
    complete: {
      name: 'purchase',
      data: {
        map: {
          transaction_id: 'data.id',
          value: 'data.total',
          tax: 'data.taxes',
          shipping: 'data.shipping',
          currency: { key: 'data.currency', value: 'EUR' },
          items: {
            loop: [
              'nested',
              {
                condition: (entity) =>
                  isObject(entity) && entity.type === 'product',
                map: {
                  item_id: 'data.id',
                  item_name: 'data.name',
                  quantity: { key: 'data.quantity', value: 1 },
                },
              },
            ],
          },
        },
      },
    },
  },
} satisfies Mapping.Config;
