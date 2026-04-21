import type { Flow } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

/**
 * Criteo Events API step examples.
 *
 * At push time, the destination calls `env.sendServer(url, body)` where
 * `url` is the configured Criteo endpoint (default:
 * `https://widget.criteo.com/m/event?version=s2s_v0`) and `body` is the
 * JSON-stringified request payload.
 *
 * Test fixture pins `partnerId = 'PARTNER_ID'` and `callerId = 'CALLER_ID'`,
 * so every call targets the default URL above.
 *
 * Body is emitted with keys in the order the destination assembles them:
 *   1. version
 *   2. site_type
 *   3. account
 *   4. id (identity block)
 *   5. events (always a single-element array)
 *   6. full_url (only when event.source.id is set)
 *   7. previous_url (only when event.source.previous_id is set)
 */
const ENDPOINT = 'https://widget.criteo.com/m/event?version=s2s_v0';

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'A completed order is posted to the Criteo Events API as a trackTransaction event with items.',
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
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        version: 'walkeros_criteo_1.0.0',
        site_type: 'd',
        account: 'PARTNER_ID',
        id: {
          mapping_key: 'CALLER_ID',
        },
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
        full_url: 'https://shop.example.com/checkout/complete',
        previous_url: 'https://shop.example.com/cart',
      }),
    ],
  ],
};

export const addToCart: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A product add becomes a Criteo addToCart event with the item id, price, and quantity.',
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
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        version: 'walkeros_criteo_1.0.0',
        site_type: 'd',
        account: 'PARTNER_ID',
        id: {
          mapping_key: 'CALLER_ID',
        },
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
        full_url: 'https://shop.example.com/products/running-shoes',
      }),
    ],
  ],
};

export const viewItem: Flow.StepExample = {
  title: 'View item',
  description:
    'A product view becomes a Criteo viewItem event with the viewed product id.',
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
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        version: 'walkeros_criteo_1.0.0',
        site_type: 'd',
        account: 'PARTNER_ID',
        id: {
          mapping_key: 'CALLER_ID',
        },
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
        full_url: 'https://shop.example.com/products/coffee-maker',
      }),
    ],
  ],
};

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view becomes a Criteo viewHome event used for home page impression tracking.',
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
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        version: 'walkeros_criteo_1.0.0',
        site_type: 'd',
        account: 'PARTNER_ID',
        id: {
          mapping_key: 'CALLER_ID',
        },
        events: [
          {
            event: 'viewHome',
            timestamp: '2023-11-14T22:28:23.000Z',
          },
        ],
        full_url: 'https://example.com/',
      }),
    ],
  ],
};
