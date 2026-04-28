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
 *   5. userData (hashed - only `em`, `ph` via SHA-256)
 *   6. eventName (only when eventType === 'custom')
 *   7. eventSourceUrl (only when event.source.url is set)
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
  title: 'Purchase',
  description:
    'A completed order is sent to the Bing UET CAPI with transaction id, value, items, and hashed user data.',
  in: getEvent('order complete', {
    id: 'b1c2d3e4f5a60001',
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
      type: 'browser',
      platform: 'web',
      url: 'https://shop.example.com/checkout/complete',
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
            eventId: 'b1c2d3e4f5a60001',
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
  title: 'Page view',
  description:
    'A page view is sent to the Bing UET CAPI with eventType pageLoad and the source URL.',
  in: getEvent('page view', {
    id: 'b1c2d3e4f5a60002',
    timestamp: 1700000901000,
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://example.com/docs/',
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
            eventId: 'b1c2d3e4f5a60002',
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
  title: 'Lead',
  description:
    'A newsletter form submission is sent to Bing UET as a lead event with the SHA-256 hashed email.',
  in: getEvent('form submit', {
    id: 'b1c2d3e4f5a60003',
    timestamp: 1700000902000,
    data: { type: 'newsletter' },
    user: { email: 'user@example.com' },
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://example.com/contact',
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
            eventId: 'b1c2d3e4f5a60003',
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
  title: 'Add to cart',
  description:
    'A product add is sent to Bing UET as an add_to_cart event with value, currency, and item details.',
  in: getEvent('product add', {
    id: 'b1c2d3e4f5a60004',
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
      type: 'browser',
      platform: 'web',
      url: 'https://shop.example.com/products/running-shoes',
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
            eventId: 'b1c2d3e4f5a60004',
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
