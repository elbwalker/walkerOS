import type { Mapping, WalkerOS } from '@elbwalker/types';
import type { DestinationMetaPixel } from '../src';
import { isObject } from '@elbwalker/utils';

export const Purchase: DestinationMetaPixel.EventConfig = {
  name: 'Purchase',
  data: {
    map: {
      value: 'data.total',
      currency: { value: 'EUR' },
      contents: {
        loop: [
          'nested',
          {
            condition: (entity) =>
              isObject(entity) && entity.type === 'product',
            map: {
              id: 'data.id',
              quantity: { key: 'data.quantity', value: 1 },
            },
          },
        ],
      },
      content_type: { value: 'product' },
      num_items: {
        fn: (event) =>
          (event as WalkerOS.Event).nested.filter(
            (item) => item.type === 'product',
          ).length,
      },
    },
  },
};

export const AddToCart: DestinationMetaPixel.EventConfig = {
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
      content_type: { value: 'product' },
    },
  },
};

export const config = {
  order: { complete: Purchase },
  product: { add: AddToCart },
} satisfies Mapping.Config;
