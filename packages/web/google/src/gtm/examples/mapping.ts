import type { Mapping } from '@elbwalker/types';
import type { DestinationGoogleGTM } from '..';
import { isObject } from '@walkerOS/utils';

export const entity_action: DestinationGoogleGTM.EventConfig = {
  name: 'entity_action',
  data: {
    map: {
      data: 'data',
    },
  },
};

export const purchase: DestinationGoogleGTM.EventConfig = {
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
};

export const add_to_cart: DestinationGoogleGTM.EventConfig = {
  name: 'add_to_cart',
  data: {
    map: {
      currency: { value: 'EUR', key: 'data.currency' },
      override: 'data.old',
      value: 'data.price',
      items: {
        loop: [
          'this',
          {
            map: {
              item_id: 'data.id',
              item_variant: 'data.color',
              quantity: { value: 1, key: 'data.quantity' },
            },
          },
        ],
      },
    },
  },
};

export const config = {
  entity: { action: entity_action },
  order: { complete: purchase },
  product: { add: add_to_cart },
} satisfies Mapping.Config;
