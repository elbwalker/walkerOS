import type { Flow } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

/**
 * Bing UET CAPI step examples.
 *
 * At push time, the destination calls
 * `env.sendServer(endpoint, JSON.stringify(body), options)` where
 * `endpoint = ${settings.url}${settings.tagId}/events`
 * and `body = { data: [capiEvent], dataProvider }`.
 *
 * Test fixture pins `tagId = 'UET-12345'` and the default url, so every
 * endpoint resolves to:
 *   https://capi.uet.microsoft.com/v1/UET-12345/events
 *
 * Body is emitted with keys in the order the destination assembles them:
 *   1. eventType
 *   2. eventId
 *   3. eventTime (unix seconds; `Math.round(event.timestamp / 1000)`)
 *   4. adStorageConsent
 *   5. userData (hashed — only `em`, `ph` via SHA-256)
 *   6. eventName (only when eventType === 'custom')
 *   7. eventSourceUrl (only when event.source.id is set)
 *   8. customData (only when it has keys)
 *
 * The `options` argument carries the Authorization + Content-Type headers.
 */
const ENDPOINT = 'https://capi.uet.microsoft.com/v1/UET-12345/events';
const OPTIONS = {
  headers: {
    Authorization: 'Bearer s3cr3t',
    'Content-Type': 'application/json',
  },
};

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
      previous_id: '',
    },
  }),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        customData: {
          map: {
            value: 'data.total',
            currency: { key: 'data.currency', value: 'EUR' },
            transactionId: 'data.id',
            pageType: { value: 'purchase' },
            items: {
              loop: [
                'nested',
                {
                  condition: (entity: unknown) =>
                    isObject(entity) && entity.entity === 'product',
                  map: {
                    id: 'data.id',
                    name: 'data.name',
                    price: 'data.price',
                    quantity: { key: 'data.quantity', value: 1 },
                  },
                },
              ],
            },
          },
        },
        userData: {
          map: {
            externalId: 'user.id',
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
            eventType: 'custom',
            eventId: '1700000900000-gr0up-1',
            eventTime: 1700000900,
            adStorageConsent: 'G',
            userData: {
              externalId: 'user-123',
            },
            eventName: 'purchase',
            eventSourceUrl: 'https://shop.example.com/checkout/complete',
            customData: {
              value: 249.99,
              currency: 'EUR',
              transactionId: 'ORD-300',
              pageType: 'purchase',
              items: [
                {
                  id: 'SKU-A1',
                  name: 'Widget Pro',
                  price: 124.99,
                  quantity: 2,
                },
              ],
            },
          },
        ],
        dataProvider: 'walkerOS',
      }),
      OPTIONS,
    ],
  ],
};

export const pageView: Flow.StepExample = {
  in: getEvent('page view', {
    timestamp: 1700000901000,
    source: {
      type: 'server',
      id: 'https://example.com/docs/',
      previous_id: '',
    },
  }),
  mapping: {
    settings: { eventType: 'pageLoad' },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        data: [
          {
            eventType: 'pageLoad',
            eventId: '1700000901000-gr0up-1',
            eventTime: 1700000901,
            adStorageConsent: 'G',
            userData: {},
            eventSourceUrl: 'https://example.com/docs/',
          },
        ],
        dataProvider: 'walkerOS',
      }),
      OPTIONS,
    ],
  ],
};

export const lead: Flow.StepExample = {
  in: getEvent('form submit', {
    timestamp: 1700000902000,
    data: { type: 'newsletter' },
    user: { email: 'user@example.com' },
    source: {
      type: 'server',
      id: 'https://example.com/contact',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'lead',
    data: {
      map: {
        userData: {
          map: {
            em: 'user.email',
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
            eventType: 'custom',
            eventId: '1700000902000-gr0up-1',
            eventTime: 1700000902,
            adStorageConsent: 'G',
            userData: {
              // sha256(normalizeEmail('user@example.com'))
              em: 'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
            },
            eventName: 'lead',
            eventSourceUrl: 'https://example.com/contact',
          },
        ],
        dataProvider: 'walkerOS',
      }),
      OPTIONS,
    ],
  ],
};

export const addToCart: Flow.StepExample = {
  in: getEvent('product add', {
    timestamp: 1700000903000,
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
    name: 'add_to_cart',
    data: {
      map: {
        customData: {
          map: {
            value: 'data.price',
            currency: { value: 'EUR' },
            items: {
              loop: [
                'nested',
                {
                  condition: (entity: unknown) =>
                    isObject(entity) && entity.entity === 'product',
                  map: {
                    id: 'data.id',
                    name: 'data.name',
                    price: 'data.price',
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
            eventType: 'custom',
            eventId: '1700000903000-gr0up-1',
            eventTime: 1700000903,
            adStorageConsent: 'G',
            userData: {},
            eventName: 'add_to_cart',
            eventSourceUrl: 'https://shop.example.com/products/running-shoes',
            customData: {
              value: 89.99,
              currency: 'EUR',
              items: [
                {
                  id: 'SKU-B2',
                  name: 'Running Shoes',
                  price: 89.99,
                  quantity: 1,
                },
              ],
            },
          },
        ],
        dataProvider: 'walkerOS',
      }),
      OPTIONS,
    ],
  ],
};
