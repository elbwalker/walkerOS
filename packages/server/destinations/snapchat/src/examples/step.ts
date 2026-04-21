import type { Flow } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

/**
 * Snapchat Conversions API step examples.
 *
 * At push time, the destination calls `env.sendServer(url, body)` where
 * `url` is `${settings.url}${settings.pixelId}/${path}?access_token=${settings.accessToken}`
 * with `path` = `events` (or `events/validate` when `testMode` is set),
 * and `body` is the JSON-stringified `{ data: [snapchatEvent] }` payload.
 *
 * The test fixture pins `accessToken = 's3cr3t'` and `pixelId = 'p1x3l1d'`,
 * so every endpoint resolves to:
 *   https://tr.snapchat.com/v3/p1x3l1d/events?access_token=s3cr3t
 *
 * Body fields are emitted in the order the destination constructs them
 * (insertion order matters for `JSON.stringify` string equality):
 *   1. event_name
 *   2. event_time (unix seconds; `Math.round(event.timestamp / 1000)`)
 *   3. action_source (default 'WEB')
 *   4. event_id
 *   5. user_data (hashed per Snapchat's PII requirements)
 *   6. custom_data (mapped event data, excluding user_data/custom_data keys)
 *   7. event_source_url (appended last when action_source === 'WEB')
 */
const ENDPOINT =
  'https://tr.snapchat.com/v3/p1x3l1d/events?access_token=s3cr3t';

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'A completed order is sent to the Snapchat Conversions API as a PURCHASE with value, currency, and contents.',
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
      previous_id: '',
    },
  }),
  mapping: {
    name: 'PURCHASE',
    data: {
      map: {
        custom_data: {
          map: {
            value: 'data.total',
            currency: { key: 'data.currency', value: 'EUR' },
            transaction_id: 'data.id',
            contents: {
              loop: [
                'nested',
                {
                  condition: (entity: unknown) =>
                    isObject(entity) && entity.entity === 'product',
                  map: {
                    id: 'data.id',
                    item_price: 'data.price',
                    quantity: { key: 'data.quantity', value: 1 },
                  },
                },
              ],
            },
          },
        },
        user_data: {
          map: {
            external_id: 'user.id',
          },
        },
      },
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        data: [
          {
            event_name: 'PURCHASE',
            event_time: 1700000900,
            action_source: 'WEB',
            event_id: '1700000900000-gr0up-1',
            user_data: {
              external_id:
                'fcdec6df4d44dbc637c7c5b58efface52a7f8a88535423430255be0bb89bedd8',
            },
            custom_data: {
              value: 249.99,
              currency: 'EUR',
              transaction_id: 'ORD-300',
              contents: [{ id: 'SKU-A1', item_price: 124.99, quantity: 2 }],
            },
            event_source_url: 'https://shop.example.com/checkout/complete',
          },
        ],
      }),
    ],
  ],
};

export const addToCart: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A product add is sent to Snapchat as an ADD_CART conversion with value and product details.',
  in: getEvent('product add', {
    timestamp: 1700000901000,
    data: {
      id: 'SKU-B2',
      name: 'Running Shoes',
      price: 89.99,
      color: 'blue',
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
    name: 'ADD_CART',
    data: {
      map: {
        custom_data: {
          map: {
            value: 'data.price',
            currency: { value: 'EUR' },
            contents: {
              loop: [
                'nested',
                {
                  condition: (entity: unknown) =>
                    isObject(entity) && entity.entity === 'product',
                  map: {
                    id: 'data.id',
                    item_price: 'data.price',
                    quantity: { key: 'data.quantity', value: 1 },
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        data: [
          {
            event_name: 'ADD_CART',
            event_time: 1700000901,
            action_source: 'WEB',
            event_id: '1700000901000-gr0up-1',
            user_data: {},
            custom_data: {
              value: 89.99,
              currency: 'EUR',
              contents: [{ id: 'SKU-B2', item_price: 89.99, quantity: 1 }],
            },
            event_source_url: 'https://shop.example.com/products/running-shoes',
          },
        ],
      }),
    ],
  ],
};

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view is forwarded to Snapchat with the event source URL and no extra custom data.',
  in: getEvent('page view', {
    timestamp: 1700000902000,
    source: {
      type: 'server',
      id: 'https://example.com/docs/',
      previous_id: '',
    },
  }),
  mapping: undefined,
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        data: [
          {
            event_name: 'page view',
            event_time: 1700000902,
            action_source: 'WEB',
            event_id: '1700000902000-gr0up-1',
            user_data: {},
            custom_data: {},
            event_source_url: 'https://example.com/docs/',
          },
        ],
      }),
    ],
  ],
};

export const lead: Flow.StepExample = {
  title: 'Sign up',
  description:
    'A newsletter form submission is sent to Snapchat as a SIGN_UP conversion with a hashed email.',
  in: getEvent('form submit', {
    timestamp: 1700000903000,
    data: { type: 'newsletter' },
    user: { email: 'user@example.com' },
    source: {
      type: 'server',
      id: 'https://example.com/contact',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'SIGN_UP',
    data: {
      map: {
        user_data: {
          map: {
            em: 'user.email',
          },
        },
        custom_data: {
          map: {
            sign_up_method: { value: 'newsletter' },
          },
        },
      },
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        data: [
          {
            event_name: 'SIGN_UP',
            event_time: 1700000903,
            action_source: 'WEB',
            event_id: '1700000903000-gr0up-1',
            user_data: {
              // sha256('user@example.com')
              em: 'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
            },
            custom_data: {
              sign_up_method: 'newsletter',
            },
            event_source_url: 'https://example.com/contact',
          },
        ],
      }),
    ],
  ],
};
