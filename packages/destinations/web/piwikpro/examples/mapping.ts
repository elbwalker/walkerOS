import type { Mapping, WalkerOS } from '@elbwalker/types';
import type { DestinationPiwikPro } from '../src';
import { isObject } from '@elbwalker/utils';

export const Purchase: DestinationPiwikPro.EventConfig = {
  name: 'Purchase',
  data: {},
};

export const ecommerceAddToCart: DestinationPiwikPro.EventConfig = {
  name: 'ecommerceAddToCart',
  data: {
    set: [
      {
        set: [
          {
            map: {
              sku: 'data.id',
              name: 'data.name',
              price: 'data.price',
              quantity: { value: 1 },
              variant: 'data.color',
              customDimensions: {
                map: {
                  1: 'data.size',
                },
              },
            },
          },
        ],
      },
      {
        map: {
          currencyCode: { value: 'EUR' },
        },
      },
    ],
  },
};

export const InitiateCheckout: DestinationPiwikPro.EventConfig = {
  name: 'InitiateCheckout',
  data: {},
};

export const config = {
  order: { complete: Purchase },
  product: { add: ecommerceAddToCart },
  cart: { view: InitiateCheckout },
} satisfies Mapping.Config;
