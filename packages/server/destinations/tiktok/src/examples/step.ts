import type { Flow } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

/**
 * TikTok Events API step examples.
 *
 * At push time, the destination calls
 * `env.sendServer(url, body, { headers })` where `url` is the fixed
 * TikTok Events API endpoint and `body` is the JSON-stringified payload
 * `{ pixel_code, partner_name, data: [tiktokEvent] }`.
 *
 * The test fixture pins `accessToken = 's3cr3t'` and `pixelCode = 'PIXEL_CODE'`.
 *
 * Body fields are emitted in the order the destination constructs them
 * (insertion order matters for `JSON.stringify` string equality):
 *   pixel_code, partner_name, data[] with { event, event_id, timestamp,
 *   context: { user?, page }, properties }.
 *
 * User identity fields (`email`, `phone_number`, `external_id`) are hashed
 * with SHA-256.
 */
const ENDPOINT = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
const HEADERS = {
  headers: {
    'Access-Token': 's3cr3t',
    'Content-Type': 'application/json',
  },
};

export const purchase: Flow.StepExample = {
  title: 'Complete payment',
  description:
    'A completed order is sent to the TikTok Events API as a CompletePayment with value, currency, and contents.',
  in: getEvent('order complete', {
    id: 'd1e2f3a4b5c60001',
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
    name: 'CompletePayment',
    data: {
      map: {
        value: 'data.total',
        currency: { key: 'data.currency', value: 'EUR' },
        order_id: 'data.id',
        content_type: { value: 'product' },
        contents: {
          loop: [
            'nested',
            {
              condition: (entity: unknown) =>
                isObject(entity) && entity.entity === 'product',
              map: {
                content_id: 'data.id',
                content_name: 'data.name',
                quantity: { key: 'data.quantity', value: 1 },
                price: 'data.price',
              },
            },
          ],
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
        pixel_code: 'PIXEL_CODE',
        partner_name: 'walkerOS',
        data: [
          {
            event: 'CompletePayment',
            event_id: 'd1e2f3a4b5c60001',
            timestamp: '2023-11-14T22:28:20.000Z',
            context: {
              user: {
                external_id:
                  'fcdec6df4d44dbc637c7c5b58efface52a7f8a88535423430255be0bb89bedd8',
              },
              page: {
                url: 'https://shop.example.com/checkout/complete',
              },
            },
            properties: {
              value: 249.99,
              currency: 'EUR',
              order_id: 'ORD-300',
              content_type: 'product',
              contents: [
                {
                  content_id: 'SKU-A1',
                  content_name: 'Widget Pro',
                  quantity: 2,
                  price: 124.99,
                },
              ],
            },
          },
        ],
      }),
      HEADERS,
    ],
  ],
};

export const addToCart: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A product add is sent to TikTok as an AddToCart event with value, currency, and product contents.',
  in: getEvent('product add', {
    id: 'd1e2f3a4b5c60002',
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
      type: 'browser',
      platform: 'web',
      url: 'https://shop.example.com/products/running-shoes',
    },
  }),
  mapping: {
    name: 'AddToCart',
    data: {
      map: {
        content_type: { value: 'product' },
        value: 'data.price',
        currency: { value: 'EUR' },
        contents: {
          loop: [
            'nested',
            {
              condition: (entity: unknown) =>
                isObject(entity) && entity.entity === 'product',
              map: {
                content_id: 'data.id',
                content_name: 'data.name',
                quantity: { key: 'data.quantity', value: 1 },
                price: 'data.price',
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
        pixel_code: 'PIXEL_CODE',
        partner_name: 'walkerOS',
        data: [
          {
            event: 'AddToCart',
            event_id: 'd1e2f3a4b5c60002',
            timestamp: '2023-11-14T22:28:21.000Z',
            context: {
              page: {
                url: 'https://shop.example.com/products/running-shoes',
              },
            },
            properties: {
              content_type: 'product',
              value: 89.99,
              currency: 'EUR',
              contents: [
                {
                  content_id: 'SKU-B2',
                  content_name: 'Running Shoes',
                  quantity: 1,
                  price: 89.99,
                },
              ],
            },
          },
        ],
      }),
      HEADERS,
    ],
  ],
};

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view is forwarded to TikTok as a page view event with the source URL in the page context.',
  in: getEvent('page view', {
    id: 'd1e2f3a4b5c60003',
    timestamp: 1700000902000,
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://example.com/docs/',
    },
  }),
  mapping: undefined,
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        pixel_code: 'PIXEL_CODE',
        partner_name: 'walkerOS',
        data: [
          {
            event: 'page view',
            event_id: 'd1e2f3a4b5c60003',
            timestamp: '2023-11-14T22:28:22.000Z',
            context: {
              page: {
                url: 'https://example.com/docs/',
              },
            },
            properties: {},
          },
        ],
      }),
      HEADERS,
    ],
  ],
};

export const lead: Flow.StepExample = {
  title: 'Submit form',
  description:
    'A newsletter form submission is sent to TikTok as a SubmitForm event with the hashed email in user context.',
  in: getEvent('form submit', {
    id: 'd1e2f3a4b5c60004',
    timestamp: 1700000903000,
    data: { type: 'newsletter' },
    user: { email: 'user@example.com' },
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://example.com/contact',
    },
  }),
  mapping: {
    name: 'SubmitForm',
    data: {
      map: {
        user_data: {
          map: {
            email: 'user.email',
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
        pixel_code: 'PIXEL_CODE',
        partner_name: 'walkerOS',
        data: [
          {
            event: 'SubmitForm',
            event_id: 'd1e2f3a4b5c60004',
            timestamp: '2023-11-14T22:28:23.000Z',
            context: {
              user: {
                // sha256('user@example.com')
                email:
                  'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
              },
              page: {
                url: 'https://example.com/contact',
              },
            },
            properties: {},
          },
        ],
      }),
      HEADERS,
    ],
  ],
};
