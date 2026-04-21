import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

/**
 * Pinterest Conversions API step examples.
 *
 * At push time, the destination calls
 * `env.sendServer(endpoint, JSON.stringify(body), { headers })` where
 * `endpoint = ${settings.url}ad_accounts/${settings.adAccountId}/events`
 * and `body = { data: [hashedServerEvent] }`.
 *
 * Test fixture pins `accessToken = 's3cr3t'` and `adAccountId = '123456789'`,
 * so every endpoint resolves to:
 *   https://api.pinterest.com/v5/ad_accounts/123456789/events
 *
 * Body is emitted with keys in insertion order from push.ts:
 *   1. event_name
 *   2. event_id
 *   3. event_time (unix seconds; `Math.round(event.timestamp / 1000)`)
 *   4. action_source (default 'web')
 *   5. ...restEventData (from mapping.data, excluding user_data/custom_data)
 *   6. user_data (hashed per Pinterest's PII requirements)
 *   7. custom_data (only when mapping sets custom_data)
 *   8. event_source_url (appended when action_source === 'web')
 *
 * The `options` argument carries the Authorization header.
 */
const ENDPOINT = 'https://api.pinterest.com/v5/ad_accounts/123456789/events';
const OPTIONS = {
  headers: { Authorization: 'Bearer s3cr3t' },
};

export const checkout: Flow.StepExample = {
  title: 'Checkout',
  description:
    'A completed order is sent to the Pinterest Conversions API as a checkout event with value, currency, and contents.',
  in: getEvent('order complete', {
    timestamp: 1700000900,
    data: { id: 'ORD-300', total: 249.99, currency: 'EUR' },
    nested: [
      {
        entity: 'product',
        data: {
          id: 'SKU-A1',
          name: 'Everyday Ruck Snack',
          price: '129.99',
          quantity: 2,
        },
      },
    ],
    user: { id: 'user-123', device: 'device-456' },
    source: { type: 'server', id: 'https://shop.example.com', previous_id: '' },
  }),
  mapping: {
    name: 'checkout',
    data: {
      map: {
        custom_data: {
          map: {
            value: 'data.total',
            currency: { key: 'data.currency', value: 'EUR' },
            order_id: 'data.id',
            num_items: {
              fn: (event: unknown) =>
                (event as WalkerOS.Event).nested.filter(
                  (item) => item.entity === 'product',
                ).length,
            },
            contents: {
              loop: [
                'nested',
                {
                  condition: (entity: unknown) =>
                    isObject(entity) && entity.entity === 'product',
                  map: {
                    id: 'data.id',
                    item_name: 'data.name',
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
            event_name: 'checkout',
            event_id: '1700000900-gr0up-1',
            event_time: 1700001,
            action_source: 'web',
            user_data: {},
            custom_data: {
              value: 249.99,
              currency: 'EUR',
              order_id: 'ORD-300',
              num_items: 1,
              contents: [
                {
                  id: 'SKU-A1',
                  item_name: 'Everyday Ruck Snack',
                  item_price: '129.99',
                  quantity: 2,
                },
              ],
            },
            event_source_url: 'https://shop.example.com',
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const addToCart: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A product add is sent to Pinterest as an add_to_cart conversion with the added item details.',
  in: getEvent('product add', {
    timestamp: 1700000901,
    data: { id: 'SKU-B2', name: 'Cool Cap', price: '42.00', quantity: 1 },
    user: { id: 'user-456' },
    source: {
      type: 'server',
      id: 'https://shop.example.com/products',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'add_to_cart',
    data: {
      map: {
        custom_data: {
          map: {
            value: 'data.price',
            currency: { value: 'EUR' },
            contents: {
              set: [
                {
                  map: {
                    id: 'data.id',
                    item_name: 'data.name',
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
            event_name: 'add_to_cart',
            event_id: '1700000901-gr0up-1',
            event_time: 1700001,
            action_source: 'web',
            user_data: {},
            custom_data: {
              value: '42.00',
              currency: 'EUR',
              contents: [
                {
                  id: 'SKU-B2',
                  item_name: 'Cool Cap',
                  item_price: '42.00',
                  quantity: 1,
                },
              ],
            },
            event_source_url: 'https://shop.example.com/products',
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const pageVisit: Flow.StepExample = {
  title: 'Page visit',
  description:
    'A page view is sent to Pinterest as a page_visit conversion with the source URL.',
  in: getEvent('page view', {
    timestamp: 1700000902,
    user: { id: 'user-789' },
    source: {
      type: 'server',
      id: 'https://www.example.com/docs/',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'page_visit',
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        data: [
          {
            event_name: 'page_visit',
            event_id: '1700000902-gr0up-1',
            event_time: 1700001,
            action_source: 'web',
            user_data: {},
            event_source_url: 'https://www.example.com/docs/',
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const search: Flow.StepExample = {
  title: 'Search',
  description:
    'A site search event is forwarded to Pinterest as a search conversion with the query in custom data.',
  in: getEvent('entity action', {
    timestamp: 1700000903,
    name: 'site search',
    data: { query: 'walkerOS destinations' },
    user: { id: 'user-101' },
    source: {
      type: 'server',
      id: 'https://www.example.com/search',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'search',
    data: {
      map: {
        custom_data: {
          map: {
            search_string: 'data.query',
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
            event_name: 'search',
            event_id: '1700000903-gr0up-1',
            event_time: 1700001,
            action_source: 'web',
            user_data: {},
            custom_data: {
              search_string: 'walkerOS destinations',
            },
            event_source_url: 'https://www.example.com/search',
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const signup: Flow.StepExample = {
  title: 'Signup',
  description:
    'A user signup is sent to Pinterest as a signup conversion with the hashed email and external id.',
  in: getEvent('entity action', {
    timestamp: 1700000904,
    name: 'user signup',
    data: { method: 'email' },
    user: { id: 'new-user-1', email: 'new@example.com' },
    source: {
      type: 'server',
      id: 'https://www.example.com/register',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'signup',
    data: {
      map: {
        user_data: {
          map: {
            em: { set: ['user.email'] },
            external_id: { set: ['user.id'] },
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
            event_name: 'signup',
            event_id: '1700000904-gr0up-1',
            event_time: 1700001,
            action_source: 'web',
            user_data: {
              // sha256('new@example.com')
              em: [
                'f0030501023327437b06e5c6f87df7871b8e704ae608d1d0b7b24fdd2a06c716',
              ],
              // sha256('new-user-1')
              external_id: [
                'b45cf5f6ebc2c6974ea3bd9fab19f8cc3a7cf63054727a9fcd22f1fda97d6dde',
              ],
            },
            event_source_url: 'https://www.example.com/register',
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};
