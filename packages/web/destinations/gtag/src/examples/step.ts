import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

export const purchase: Flow.StepExample = {
  in: getEvent('order complete', { timestamp: 1700000100 }),
  mapping: {
    name: 'purchase',
    settings: {
      ga4: {
        include: ['data', 'context'],
      },
    },
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
              condition: (entity: unknown) =>
                isObject(entity) && entity.entity === 'product',
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
  out: [
    'event',
    'purchase',
    {
      transaction_id: '0rd3r1d',
      value: 555,
      tax: 73.76,
      shipping: 5.22,
      currency: 'EUR',
      items: [
        { item_id: 'ers', item_name: 'Everyday Ruck Snack', quantity: 1 },
        { item_id: 'cc', item_name: 'Cool Cap', quantity: 1 },
      ],
      send_to: 'G-XXXXXX-1',
    },
  ],
};

export const addToCart: Flow.StepExample = {
  in: getEvent('product add', { timestamp: 1700000101 }),
  mapping: {
    name: 'add_to_cart',
    settings: {
      ga4: {
        include: ['data'],
      },
    },
    data: {
      map: {
        currency: { value: 'EUR', key: 'data.currency' },
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
  },
  out: [
    'event',
    'add_to_cart',
    {
      currency: 'EUR',
      value: 420,
      items: [{ item_id: 'ers', item_variant: 'black', quantity: 1 }],
      send_to: 'G-XXXXXX-1',
    },
  ],
};

export const pageView: Flow.StepExample = {
  in: getEvent('page view', { timestamp: 1700000102 }),
  mapping: undefined,
  out: ['event', 'page_view', { send_to: 'G-XXXXXX-1' }],
};
