import type { Mapping } from '@walkeros/core';
import type { DestinationPiwikPro } from '..';
import { isObject } from '@walkeros/core';

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

export const ecommerceOrder: DestinationPiwikPro.Rule = {
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

export const ecommerceAddToCart: DestinationPiwikPro.Rule = {
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

export const ecommerceProductDetailView: DestinationPiwikPro.Rule = {
  name: 'ecommerceProductDetailView',
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

export const ecommerceCartUpdate: DestinationPiwikPro.Rule = {
  name: 'ecommerceCartUpdate',
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
      'data.value',
      {
        map: {
          currencyCode: { value: 'EUR' },
        },
      },
    ],
  },
};

export const config = {
  order: { complete: ecommerceOrder },
  product: { add: ecommerceAddToCart, view: ecommerceProductDetailView },
  cart: { view: ecommerceCartUpdate },
} satisfies DestinationPiwikPro.Rules;
