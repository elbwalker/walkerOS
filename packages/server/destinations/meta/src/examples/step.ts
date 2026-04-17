import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

/**
 * Meta Conversions API step examples.
 *
 * At push time, the destination calls `env.sendServer(url, body)` where
 * `url` is `${settings.url}${settings.pixelId}/events?access_token=${settings.accessToken}`
 * and `body` is the JSON-stringified `{ data: [serverEvent] }` payload.
 *
 * The public name users see when inspecting the destination is `sendServer`,
 * so each `out` tuple is `['sendServer', url, body]` with `body` as the
 * already-stringified JSON payload (mirroring the actual call signature).
 *
 * The test fixture pins `accessToken = 's3cr3t'` and `pixelId = 'p1x3l1d'`,
 * so every endpoint resolves to:
 *   https://graph.facebook.com/v22.0/p1x3l1d/events?access_token=s3cr3t
 *
 * Body fields are emitted in the order the destination constructs them
 * (insertion order matters for `JSON.stringify` string equality):
 *   1. event_name
 *   2. event_id
 *   3. event_time (unix seconds; `Math.round(event.timestamp / 1000)`)
 *   4. action_source
 *   5. ...mapped event data (currency, value, etc.)
 *   6. user_data (hashed per Meta's PII requirements)
 *   7. event_source_url (appended after hash when action_source === 'website')
 */
const ENDPOINT =
  'https://graph.facebook.com/v22.0/p1x3l1d/events?access_token=s3cr3t';

export const purchase: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000900,
    data: { id: 'ORD-300', total: 249.99, currency: 'EUR' },
    nested: [
      { entity: 'product', data: { id: 'SKU-A1', price: 129.99, quantity: 2 } },
    ],
    user: { id: 'user-123', device: 'device-456' },
    source: { type: 'server', id: 'https://shop.example.com', previous_id: '' },
  }),
  mapping: {
    name: 'Purchase',
    data: {
      map: {
        order_id: 'data.id',
        currency: { key: 'data.currency', value: 'EUR' },
        value: 'data.total',
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
        num_items: {
          fn: (event: unknown) =>
            (event as WalkerOS.Event).nested.filter(
              (item) => item.entity === 'product',
            ).length,
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
            event_id: '1700000900-gr0up-1',
            event_time: 1700001,
            action_source: 'website',
            order_id: 'ORD-300',
            currency: 'EUR',
            value: 249.99,
            contents: [{ id: 'SKU-A1', item_price: 129.99, quantity: 2 }],
            num_items: 1,
            user_data: {},
            event_source_url: 'https://shop.example.com',
          },
        ],
      }),
    ],
  ],
};

export const lead: Flow.StepExample = {
  in: getEvent('form submit', {
    timestamp: 1700000901,
    data: { type: 'newsletter' },
    user: { email: 'user@example.com' },
    source: { type: 'server', id: 'https://example.com', previous_id: '' },
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
            event_id: '1700000901-gr0up-1',
            event_time: 1700001,
            action_source: 'website',
            user_data: {},
            event_source_url: 'https://example.com',
          },
        ],
      }),
    ],
  ],
};

export const purchaseWithClickAttribution: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000902,
    data: { id: 'ORD-700', total: 89.99, currency: 'USD' },
    user: { id: 'cust-42' },
    context: { fbclid: ['abc123xyz', 0] },
    source: { type: 'server', id: 'https://shop.example.com', previous_id: '' },
  }),
  mapping: {
    name: 'Purchase',
    data: {
      map: {
        currency: { key: 'data.currency', value: 'EUR' },
        value: 'data.total',
        order_id: 'data.id',
        user_data: {
          map: {
            external_id: 'user.id',
            fbclid: 'context.fbclid',
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
            event_id: '1700000902-gr0up-1',
            event_time: 1700001,
            action_source: 'website',
            currency: 'USD',
            value: 89.99,
            order_id: 'ORD-700',
            user_data: {
              // sha256('cust-42')
              external_id:
                '8a3c5a67cad508582b5edf6b8352cea3ffbad7f44812c1a736b4444c0f5746aa',
              // formatClickId(['abc123xyz', 0], event.timestamp) — array joins
              // to 'abc123xyz,0' when coerced to string inside the template.
              fbc: 'fb.1.1700000902.abc123xyz,0',
            },
            event_source_url: 'https://shop.example.com',
          },
        ],
      }),
    ],
  ],
};
