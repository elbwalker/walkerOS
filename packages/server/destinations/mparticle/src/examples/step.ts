import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * mParticle Events API step examples.
 *
 * At push time, the destination calls
 * `env.sendServer(endpoint, JSON.stringify(batch), options)` where
 *   endpoint = `buildEndpoint(pod)`  (default pod `us1` → `https://s2s.mparticle.com/v2/events`)
 *   batch    = the mParticle v2 batch envelope
 *
 * Test fixture pins `apiKey = 'key'`, `apiSecret = 'secret'`, pod `us1`, so
 * every call targets that endpoint with `Authorization: Basic a2V5OnNlY3JldA==`.
 *
 * The batch keys appear in the order the destination constructs them:
 *   1. events (always a single-element array)
 *   2. environment ('production' by default)
 *   3. user_identities (only when resolved)
 *   4. user_attributes (only when resolved)
 *   5. ip (only when mapped)
 *   6. source_request_id (falls back to `event.id`)
 *   7. consent_state, context (unused here)
 *
 * `options` carries Authorization + Content-Type headers.
 */
const ENDPOINT = 'https://s2s.mparticle.com/v2/events';
const OPTIONS = {
  headers: {
    // Basic base64('key:secret')
    Authorization: 'Basic a2V5OnNlY3JldA==',
    'Content-Type': 'application/json',
  },
};

/**
 * Default custom_event - a walkerOS event with no `eventType` mapping.
 * mParticle wraps it as a `custom_event` with the default `other` category.
 * user_identities are resolved at the batch level from
 * `settings.userIdentities`.
 */
export const customEvent: Flow.StepExample = {
  title: 'Custom event',
  description:
    'A walker event is sent to mParticle as a custom_event with user identities resolved from destination settings.',
  in: getEvent('product view', {
    id: 'ev-1700000100000',
    timestamp: 1700000100000,
    data: { id: 'SKU-A1', name: 'Shoe', price: 129.99 },
    user: { id: 'user-123' },
    source: { type: 'express', platform: 'server' },
  }),
  mapping: undefined,
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        events: [
          {
            event_type: 'custom_event',
            data: {
              event_name: 'product view',
              custom_event_type: 'other',
              timestamp_unixtime_ms: 1700000100000,
              source_message_id: 'ev-1700000100000',
            },
          },
        ],
        environment: 'production',
        user_identities: {
          customer_id: 'user-123',
        },
        source_request_id: 'ev-1700000100000',
      }),
      OPTIONS,
    ],
  ],
};

/**
 * screen_view event - mapping.settings.eventType switches the mParticle
 * event shape. Uses event name as the `screen_name`.
 */
export const screenView: Flow.StepExample = {
  title: 'Screen view',
  description:
    'A page view is mapped to an mParticle screen_view event with the event name as the screen name.',
  in: getEvent('page view', {
    id: 'ev-1700000200000',
    timestamp: 1700000200000,
    data: { title: 'Checkout', path: '/checkout' },
    user: { id: 'user-123' },
    source: { type: 'express', platform: 'server' },
  }),
  mapping: {
    settings: { eventType: 'screen_view' },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        events: [
          {
            event_type: 'screen_view',
            data: {
              screen_name: 'page view',
              timestamp_unixtime_ms: 1700000200000,
              source_message_id: 'ev-1700000200000',
            },
          },
        ],
        environment: 'production',
        user_identities: {
          customer_id: 'user-123',
        },
        source_request_id: 'ev-1700000200000',
      }),
      OPTIONS,
    ],
  ],
};

/**
 * commerce_event - mapping.settings.eventType: 'commerce_event' plus a
 * `commerce` mapping resolves a ProductAction block. Products, currency,
 * and transaction metadata are all driven by the commerce mapping value.
 */
export const commercePurchase: Flow.StepExample = {
  title: 'Commerce purchase',
  description:
    'A completed order becomes an mParticle commerce_event with a purchase product_action block.',
  in: getEvent('order complete', {
    id: 'ev-1700000300000',
    timestamp: 1700000300000,
    data: { id: 'ORD-300', total: 249.99, currency: 'EUR' },
    user: { id: 'user-123' },
    source: { type: 'express', platform: 'server' },
  }),
  mapping: {
    settings: {
      eventType: 'commerce_event',
      commerce: {
        map: {
          currency_code: 'data.currency',
          product_action: {
            map: {
              action: { value: 'purchase' },
              transaction_id: 'data.id',
              total_amount: 'data.total',
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
        events: [
          {
            event_type: 'commerce_event',
            data: {
              currency_code: 'EUR',
              product_action: {
                action: 'purchase',
                transaction_id: 'ORD-300',
                total_amount: 249.99,
              },
              timestamp_unixtime_ms: 1700000300000,
              source_message_id: 'ev-1700000300000',
            },
          },
        ],
        environment: 'production',
        user_identities: {
          customer_id: 'user-123',
        },
        source_request_id: 'ev-1700000300000',
      }),
      OPTIONS,
    ],
  ],
};

/**
 * Identity + attributes - verifies `user_identities` and `user_attributes`
 * come from the batch-level settings mappings, not the event payload.
 */
export const identityAndAttributes: Flow.StepExample = {
  title: 'User identities',
  description:
    'A form submission sends a custom_event whose batch carries user_identities resolved from destination settings.',
  in: getEvent('form submit', {
    id: 'ev-1700000400000',
    timestamp: 1700000400000,
    data: { type: 'newsletter' },
    user: {
      id: 'user-123',
      email: 'user@example.com',
    },
    source: { type: 'express', platform: 'server' },
  }),
  mapping: undefined,
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        events: [
          {
            event_type: 'custom_event',
            data: {
              event_name: 'form submit',
              custom_event_type: 'other',
              timestamp_unixtime_ms: 1700000400000,
              source_message_id: 'ev-1700000400000',
            },
          },
        ],
        environment: 'production',
        user_identities: {
          customer_id: 'user-123',
          email: 'user@example.com',
        },
        source_request_id: 'ev-1700000400000',
      }),
      OPTIONS,
    ],
  ],
};
