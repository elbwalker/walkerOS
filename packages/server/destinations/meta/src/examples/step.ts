import type { Flow } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';

/**
 * Meta Conversions API step examples.
 *
 * At push time, the destination calls `env.sendServer(url, body, options)`
 * where `url` is `${settings.url}/${settings.pixelId}/events`, `body` is the
 * JSON-stringified `{ data: [serverEvent] }` payload, and `options` carries the
 * access token in an `Authorization: Bearer` header (never in the URL). Each
 * `out` tuple is `['sendServer', url, body, options]`.
 *
 * The four standard events follow Meta's server event, custom data and
 * customer information parameters, run with the settings
 * `{ accessToken: 's3cr3t', pixelId: '1234567890' }` (placeholders). Business
 * data goes into `custom_data`; a website event needs `event_source_url` and
 * `user_data.client_user_agent`. Each input is the standard event relayed from
 * a browser: its page url, and the request's IP and user agent on `user`
 * (read by default when no ingest carries them).
 *
 * Body fields are emitted in the order the destination constructs them
 * (insertion order matters for `JSON.stringify` string equality):
 *   1. event_name
 *   2. event_id
 *   3. event_time (unix seconds; `Math.round(event.timestamp / 1000)`)
 *   4. action_source
 *   5. ...mapped event data (custom_data, user_data)
 *   6. user_data (hashed per Meta's PII requirements)
 *   7. event_source_url (appended after hash when action_source === 'website')
 *
 * Functions in mappings are published as source code, so they must not use
 * imported helpers.
 */
const ENDPOINT = 'https://graph.facebook.com/v22.0/1234567890/events';

const OPTIONS = { headers: { Authorization: 'Bearer s3cr3t' } };

/** A browser event relayed to the server, with the request's IP and agent. */
const RELAYED = {
  source: {
    type: 'browser',
    platform: 'web',
    url: 'https://www.example.com/',
    referrer: 'https://www.walkeros.io/',
  },
  user: {
    id: 'us3r',
    device: 'c00k13',
    session: 's3ss10n',
    ip: '192.0.2.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  },
};

/** user_data of a relayed event; external_id is sha256('us3r'). */
const USER_DATA = {
  client_ip_address: '192.0.2.1',
  client_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  external_id:
    '273f9a3cb7d30a28b5e1a1040f4f0becae0bb574fab1f05e5653e78e93d2eb69',
};

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view is sent to the Meta Conversions API as PageView with the request IP, user agent and a hashed external id.',
  in: getEvent('page view', RELAYED),
  mapping: {
    name: 'PageView',
    data: {
      map: {
        user_data: { map: { external_id: 'user.id' } },
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
            event_name: 'PageView',
            event_id: 'f0cc5f6fec3d8eeb',
            event_time: 1700000000,
            action_source: 'website',
            user_data: USER_DATA,
            event_source_url: 'https://www.example.com/',
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const viewContent: Flow.StepExample = {
  title: 'View content',
  description:
    'A product view is sent as ViewContent with currency, value and the product in custom_data.',
  in: getEvent('product view', RELAYED),
  mapping: {
    name: 'ViewContent',
    data: {
      map: {
        custom_data: {
          map: {
            currency: { key: 'data.currency', value: 'EUR' },
            value: 'data.price',
            content_type: { value: 'product' },
            contents: {
              set: [
                {
                  map: {
                    id: 'data.id',
                    quantity: { key: 'data.quantity', value: 1 },
                    item_price: 'data.price',
                  },
                },
              ],
            },
          },
        },
        user_data: { map: { external_id: 'user.id' } },
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
            event_name: 'ViewContent',
            event_id: 'db22fb16c70f663d',
            event_time: 1700000000,
            action_source: 'website',
            custom_data: {
              currency: 'EUR',
              value: 420,
              content_type: 'product',
              contents: [{ id: 'ers', quantity: 1, item_price: 420 }],
            },
            user_data: USER_DATA,
            event_source_url: 'https://www.example.com/',
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
    'A product add is sent as AddToCart with currency, value and the added product in custom_data.',
  in: getEvent('product add', RELAYED),
  mapping: {
    name: 'AddToCart',
    data: {
      map: {
        custom_data: {
          map: {
            currency: { key: 'data.currency', value: 'EUR' },
            value: 'data.price',
            content_type: { value: 'product' },
            contents: {
              set: [
                {
                  map: {
                    id: 'data.id',
                    quantity: { key: 'data.quantity', value: 1 },
                    item_price: 'data.price',
                  },
                },
              ],
            },
          },
        },
        user_data: { map: { external_id: 'user.id' } },
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
            event_name: 'AddToCart',
            event_id: '83e860384d50953f',
            event_time: 1700000000,
            action_source: 'website',
            custom_data: {
              currency: 'EUR',
              value: 420,
              content_type: 'product',
              contents: [{ id: 'ers', quantity: 1, item_price: 420 }],
            },
            user_data: USER_DATA,
            event_source_url: 'https://www.example.com/',
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'An order complete is sent as Purchase with value, currency, order id and one content per product in custom_data.',
  in: getEvent('order complete', RELAYED),
  mapping: {
    name: 'Purchase',
    data: {
      map: {
        custom_data: {
          map: {
            currency: { key: 'data.currency', value: 'EUR' },
            value: 'data.value',
            order_id: 'data.id',
            content_type: { value: 'product' },
            contents: {
              loop: [
                'nested',
                {
                  condition: (entity: unknown) =>
                    typeof entity === 'object' &&
                    entity !== null &&
                    'entity' in entity &&
                    entity.entity === 'product',
                  map: {
                    id: 'data.id',
                    quantity: { key: 'data.quantity', value: 1 },
                    item_price: 'data.price',
                  },
                },
              ],
            },
          },
        },
        user_data: { map: { external_id: 'user.id' } },
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
            event_name: 'Purchase',
            event_id: '235d0d7bd7a213f2',
            event_time: 1700000000,
            action_source: 'website',
            custom_data: {
              currency: 'EUR',
              value: 555,
              order_id: '0rd3r1d',
              content_type: 'product',
              contents: [
                { id: 'ers', quantity: 1, item_price: 420 },
                { id: 'cc', quantity: 1, item_price: 42 },
              ],
            },
            user_data: USER_DATA,
            event_source_url: 'https://www.example.com/',
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const lead: Flow.StepExample = {
  public: false,
  title: 'Form submit',
  description:
    'A form submission is forwarded to Meta CAPI as a custom event with the event source URL.',
  in: createEvent({
    name: 'form submit',
    id: 'c1d2e3f4a5b60002',
    timestamp: 1700000901000,
    data: { type: 'newsletter' },
    user: { email: 'user@example.com' },
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://example.com',
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
            event_name: 'form submit',
            event_id: 'c1d2e3f4a5b60002',
            event_time: 1700000901,
            action_source: 'website',
            user_data: {},
            event_source_url: 'https://example.com',
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const purchaseWithClickAttribution: Flow.StepExample = {
  public: false,
  title: 'Purchase with fbclid',
  description:
    'A purchase is sent to Meta CAPI with an external_id and a formatted fbc click id for ads attribution.',
  in: getEvent('order complete', {
    id: 'c1d2e3f4a5b60003',
    timestamp: 1700000902000,
    data: { id: 'ORD-700', value: 89.99, currency: 'USD' },
    user: { id: 'cust-42' },
    context: { fbclid: ['abc123xyz', 0] },
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://shop.example.com',
    },
  }),
  mapping: {
    name: 'Purchase',
    data: {
      map: {
        custom_data: {
          map: {
            currency: { key: 'data.currency', value: 'EUR' },
            value: 'data.value',
            order_id: 'data.id',
          },
        },
        user_data: {
          map: {
            external_id: 'user.id',
            fbclid: 'context.fbclid.0',
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
            event_name: 'Purchase',
            event_id: 'c1d2e3f4a5b60003',
            event_time: 1700000902,
            action_source: 'website',
            custom_data: {
              currency: 'USD',
              value: 89.99,
              order_id: 'ORD-700',
            },
            user_data: {
              // sha256('cust-42')
              external_id:
                '8a3c5a67cad508582b5edf6b8352cea3ffbad7f44812c1a736b4444c0f5746aa',
              // fb.subdomainIndex.creationTime.fbclid, creationTime in milliseconds
              fbc: 'fb.1.1700000902000.abc123xyz',
            },
            event_source_url: 'https://shop.example.com',
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

/** A silent rule sends nothing to Meta. */
export const silentRule: Flow.StepExample = {
  public: false,
  description: 'A rule with silent: true sends no request to Meta.',
  in: getEvent('page view'),
  mapping: { silent: true },
  out: [],
};
