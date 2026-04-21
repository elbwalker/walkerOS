import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

/**
 * Reddit Conversions API step examples.
 *
 * At push time, the destination calls
 * `env.sendServer(endpoint, JSON.stringify(body), options)` where
 * `endpoint = ${settings.url}${settings.pixelId}` and
 * `body = { data: { events: [hashedServerEvent] } }`.
 *
 * Test fixture pins `pixelId = 'a2_abcdef123456'` and the default url, so
 * every endpoint resolves to:
 *   https://ads-api.reddit.com/api/v2.0/conversions/events/a2_abcdef123456
 *
 * The serverEvent keys are assembled in this order (insertion order matters
 * for `JSON.stringify` string equality):
 *   1. event_at (ISO timestamp)
 *   2. event_at_ms
 *   3. event_type ({ tracking_type, custom_event_name? })
 *   4. ...restEventData (mapped event data minus user/event_metadata/click_id)
 *   5. user (hashed — email, external_id, ip_address, user_agent, idfa, aaid)
 *   6. event_metadata (conversion_id first, then merged metadata)
 *   7. click_id (only when a string is present)
 *
 * `options` carries the Authorization: Bearer <accessToken> header.
 */
const ENDPOINT =
  'https://ads-api.reddit.com/api/v2.0/conversions/events/a2_abcdef123456';
const OPTIONS = {
  headers: { Authorization: 'Bearer s3cr3t' },
};

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'A completed order is sent to the Reddit Conversions API as a Purchase event with value, currency, and items.',
  in: getEvent('order complete', {
    timestamp: 1700000900,
    data: { id: 'ORD-300', total: 249.99, currency: 'EUR' },
    nested: [
      {
        entity: 'product',
        data: {
          id: 'SKU-A1',
          name: 'Everyday Ruck Snack',
          category: 'bags',
          price: '129.99',
          quantity: 2,
        },
      },
    ],
    user: { id: 'user-123', device: 'device-456' },
    source: { type: 'server', id: 'https://shop.example.com', previous_id: '' },
  }),
  mapping: {
    name: 'Purchase',
    data: {
      map: {
        event_metadata: {
          map: {
            value_decimal: 'data.total',
            currency: { key: 'data.currency', value: 'EUR' },
            item_count: {
              fn: (event: unknown) =>
                (event as WalkerOS.Event).nested.filter(
                  (item) => item.entity === 'product',
                ).length,
            },
            products: {
              loop: [
                'nested',
                {
                  condition: (entity: unknown) =>
                    isObject(entity) && entity.entity === 'product',
                  map: {
                    id: 'data.id',
                    name: 'data.name',
                    category: { key: 'data.category', value: 'uncategorized' },
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
        data: {
          events: [
            {
              event_at: '1970-01-20T16:13:20.900Z',
              event_at_ms: 1700000900,
              event_type: { tracking_type: 'Purchase' },
              user: {},
              event_metadata: {
                conversion_id: '1700000900-gr0up-1',
                value_decimal: 249.99,
                currency: 'EUR',
                item_count: 1,
                products: [
                  {
                    id: 'SKU-A1',
                    name: 'Everyday Ruck Snack',
                    category: 'bags',
                  },
                ],
              },
            },
          ],
        },
      }),
      OPTIONS,
    ],
  ],
};

export const addToCart: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A product add is sent to Reddit as an AddToCart conversion with value and product details.',
  in: getEvent('product add', {
    timestamp: 1700000901,
    data: {
      id: 'SKU-B2',
      name: 'Cool Cap',
      category: 'hats',
      price: '42.00',
      quantity: 1,
    },
    user: { id: 'user-456' },
    source: {
      type: 'server',
      id: 'https://shop.example.com/products',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'AddToCart',
    data: {
      map: {
        event_metadata: {
          map: {
            value_decimal: 'data.price',
            currency: { value: 'EUR' },
            item_count: { value: 1 },
            products: {
              set: [
                {
                  map: {
                    id: 'data.id',
                    name: 'data.name',
                    category: { key: 'data.category', value: 'uncategorized' },
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
        data: {
          events: [
            {
              event_at: '1970-01-20T16:13:20.901Z',
              event_at_ms: 1700000901,
              event_type: { tracking_type: 'AddToCart' },
              user: {},
              event_metadata: {
                conversion_id: '1700000901-gr0up-1',
                value_decimal: '42.00',
                currency: 'EUR',
                item_count: 1,
                products: [
                  { id: 'SKU-B2', name: 'Cool Cap', category: 'hats' },
                ],
              },
            },
          ],
        },
      }),
      OPTIONS,
    ],
  ],
};

export const pageVisit: Flow.StepExample = {
  title: 'Page visit',
  description:
    'A page view is sent to Reddit as a PageVisit conversion used for retargeting audiences.',
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
    name: 'PageVisit',
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        data: {
          events: [
            {
              event_at: '1970-01-20T16:13:20.902Z',
              event_at_ms: 1700000902,
              event_type: { tracking_type: 'PageVisit' },
              user: {},
              event_metadata: { conversion_id: '1700000902-gr0up-1' },
            },
          ],
        },
      }),
      OPTIONS,
    ],
  ],
};

export const lead: Flow.StepExample = {
  title: 'Lead',
  description:
    'A form submission is sent to Reddit as a Lead conversion with the SHA-256 hashed email and external id.',
  in: getEvent('form submit', {
    timestamp: 1700000903,
    data: { form: 'contact' },
    user: { id: 'user-lead-1', email: 'lead@example.com' },
    source: {
      type: 'server',
      id: 'https://www.example.com/contact',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'Lead',
    data: {
      map: {
        user: {
          map: {
            email: 'user.email',
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
        data: {
          events: [
            {
              event_at: '1970-01-20T16:13:20.903Z',
              event_at_ms: 1700000903,
              event_type: { tracking_type: 'Lead' },
              user: {
                // sha256('lead@example.com')
                email:
                  '9fbdefe2837a03c9225be80e741f316f4d174d1732b719b6abb6477efc1ae9d2',
                // sha256('user-lead-1')
                external_id:
                  'ee818eebb052cf288ffeeb2e09ee35c9946e1a7f53a959cb3ef06d5d4adb78e8',
              },
              event_metadata: { conversion_id: '1700000903-gr0up-1' },
            },
          ],
        },
      }),
      OPTIONS,
    ],
  ],
};

export const signUp: Flow.StepExample = {
  title: 'Sign up',
  description:
    'A user signup is sent to Reddit as a SignUp conversion with hashed user identifiers.',
  in: getEvent('user signup', {
    timestamp: 1700000904,
    data: { method: 'email' },
    user: { id: 'new-user-1', email: 'new@example.com' },
    source: {
      type: 'server',
      id: 'https://www.example.com/register',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'SignUp',
    data: {
      map: {
        user: {
          map: {
            email: 'user.email',
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
        data: {
          events: [
            {
              event_at: '1970-01-20T16:13:20.904Z',
              event_at_ms: 1700000904,
              event_type: { tracking_type: 'SignUp' },
              user: {
                // sha256('new@example.com')
                email:
                  'f0030501023327437b06e5c6f87df7871b8e704ae608d1d0b7b24fdd2a06c716',
                // sha256('new-user-1')
                external_id:
                  'b45cf5f6ebc2c6974ea3bd9fab19f8cc3a7cf63054727a9fcd22f1fda97d6dde',
              },
              event_metadata: { conversion_id: '1700000904-gr0up-1' },
            },
          ],
        },
      }),
      OPTIONS,
    ],
  ],
};

export const search: Flow.StepExample = {
  title: 'Search',
  description:
    'A site search is sent to Reddit as a Search conversion with an item count in event_metadata.',
  in: getEvent('site search', {
    timestamp: 1700000905,
    data: { query: 'walkerOS destinations' },
    user: { id: 'user-101' },
    source: {
      type: 'server',
      id: 'https://www.example.com/search',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'Search',
    data: {
      map: {
        event_metadata: {
          map: {
            item_count: { value: 1 },
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
        data: {
          events: [
            {
              event_at: '1970-01-20T16:13:20.905Z',
              event_at_ms: 1700000905,
              event_type: { tracking_type: 'Search' },
              user: {},
              event_metadata: {
                conversion_id: '1700000905-gr0up-1',
                item_count: 1,
              },
            },
          ],
        },
      }),
      OPTIONS,
    ],
  ],
};
