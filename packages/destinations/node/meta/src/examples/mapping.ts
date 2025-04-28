import type { Mapping, WalkerOS } from '@elbwalker/types';
import type { DestinationMeta } from '..';

export const AddToCart: DestinationMeta.EventConfig = {
  name: 'AddToCart',
  data: {
    map: {
      value: 'data.price',
      currency: { value: 'EUR' },
      contents: {
        set: [
          {
            map: {
              id: 'data.id',
              quantity: { key: 'data.quantity', value: 1 },
            },
          },
        ],
      },
    },
  },
};

export const config = {
  product: { add: AddToCart },
} satisfies Mapping.Config;
