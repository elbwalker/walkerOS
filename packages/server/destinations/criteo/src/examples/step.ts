import type { Flow } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

export const purchase: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000900000,
    data: { id: 'ORD-300', total: 249.99, currency: 'EUR' },
    nested: [
      {
        entity: 'product',
        data: { id: 'SKU-A1', name: 'Widget Pro', price: 124.99, quantity: 2 },
      },
    ],
    user: { id: 'user-123', device: 'device-456' },
    source: {
      type: 'server',
      id: 'https://shop.example.com/checkout/complete',
      previous_id: 'https://shop.example.com/cart',
    },
  }),
  mapping: {
    name: 'trackTransaction',
    data: {
      map: {
        id: 'data.id',
        item: {
          loop: [
            'nested',
            {
              condition: (entity: unknown) =>
                isObject(entity) && entity.entity === 'product',
              map: {
                id: 'data.id',
                price: 'data.price',
                quantity: { key: 'data.quantity', value: 1 },
              },
            },
          ],
        },
      },
    },
  },
  out: {
    version: 'walkeros_criteo_1.0.0',
    site_type: 'd',
    account: 'PARTNER_ID',
    id: {
      mapping_key: 'CALLER_ID',
    },
    full_url: 'https://shop.example.com/checkout/complete',
    previous_url: 'https://shop.example.com/cart',
    events: [
      {
        event: 'trackTransaction',
        timestamp: '2023-11-14T22:28:20.000Z',
        id: 'ORD-300',
        item: [
          {
            id: 'SKU-A1',
            price: 124.99,
            quantity: 2,
          },
        ],
      },
    ],
  },
};

export const addToCart: Flow.StepExample = {
  in: getEvent('product add', {
    timestamp: 1700000901000,
    data: {
      id: 'SKU-B2',
      name: 'Running Shoes',
      price: 89.99,
    },
    nested: [
      {
        entity: 'product',
        data: {
          id: 'SKU-B2',
          name: 'Running Shoes',
          price: 89.99,
          quantity: 1,
        },
      },
    ],
    source: {
      type: 'server',
      id: 'https://shop.example.com/products/running-shoes',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'addToCart',
    data: {
      map: {
        item: {
          loop: [
            'nested',
            {
              condition: (entity: unknown) =>
                isObject(entity) && entity.entity === 'product',
              map: {
                id: 'data.id',
                price: 'data.price',
                quantity: { key: 'data.quantity', value: 1 },
              },
            },
          ],
        },
      },
    },
  },
  out: {
    version: 'walkeros_criteo_1.0.0',
    site_type: 'd',
    account: 'PARTNER_ID',
    id: {
      mapping_key: 'CALLER_ID',
    },
    full_url: 'https://shop.example.com/products/running-shoes',
    events: [
      {
        event: 'addToCart',
        timestamp: '2023-11-14T22:28:21.000Z',
        item: [
          {
            id: 'SKU-B2',
            price: 89.99,
            quantity: 1,
          },
        ],
      },
    ],
  },
};

export const viewItem: Flow.StepExample = {
  in: getEvent('product view', {
    timestamp: 1700000902000,
    data: { id: 'SKU-C3', name: 'Coffee Maker' },
    nested: [
      {
        entity: 'product',
        data: { id: 'SKU-C3' },
      },
    ],
    source: {
      type: 'server',
      id: 'https://shop.example.com/products/coffee-maker',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'viewItem',
    data: {
      map: {
        item: {
          loop: [
            'nested',
            {
              condition: (entity: unknown) =>
                isObject(entity) && entity.entity === 'product',
              map: {
                id: 'data.id',
              },
            },
          ],
        },
      },
    },
  },
  out: {
    version: 'walkeros_criteo_1.0.0',
    site_type: 'd',
    account: 'PARTNER_ID',
    id: {
      mapping_key: 'CALLER_ID',
    },
    full_url: 'https://shop.example.com/products/coffee-maker',
    events: [
      {
        event: 'viewItem',
        timestamp: '2023-11-14T22:28:22.000Z',
        item: [
          {
            id: 'SKU-C3',
          },
        ],
      },
    ],
  },
};

export const pageView: Flow.StepExample = {
  in: getEvent('page view', {
    timestamp: 1700000903000,
    source: {
      type: 'server',
      id: 'https://example.com/',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'viewHome',
  },
  out: {
    version: 'walkeros_criteo_1.0.0',
    site_type: 'd',
    account: 'PARTNER_ID',
    id: {
      mapping_key: 'CALLER_ID',
    },
    full_url: 'https://example.com/',
    events: [
      {
        event: 'viewHome',
        timestamp: '2023-11-14T22:28:23.000Z',
      },
    ],
  },
};
