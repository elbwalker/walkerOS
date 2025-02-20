import type { Mapping, WalkerOS } from '@elbwalker/types';
import type { DestinationPiwikPro } from '../src';
import { isObject } from '@elbwalker/utils';

const productMap = {
  sku: 'data.id',
  name: 'data.name',
  price: 'data.price',
  quantity: { value: 1 },
  variant: { key: 'data.color' },
  customDimensions: {
    map: {
      1: 'data.size',
    },
  },
};

export const ecommerceOrder: DestinationPiwikPro.EventConfig = {
  name: 'ecommerceOrder',
  data: {
    set: [
      {
        loop: [
          'nested',
          {
            condition: (entity) =>
              isObject(entity) && entity.type === 'product',
            map: productMap,
          },
        ],
      },
      {
        map: {
          orderId: 'data.id',
          grandTotal: 'data.total',
          tax: 'data.taxes',
          shipping: 'data.shipping',
        },
      },
      {
        map: {
          currencyCode: { value: 'EUR' },
        },
      },
    ],
  },
};

export const ecommerceAddToCart: DestinationPiwikPro.EventConfig = {
  name: 'ecommerceAddToCart',
  data: {
    set: [
      {
        set: [
          {
            map: productMap,
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
  order: { complete: ecommerceOrder },
  product: { add: ecommerceAddToCart },
  cart: { view: InitiateCheckout },
} satisfies Mapping.Config;
