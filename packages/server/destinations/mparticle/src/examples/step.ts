import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * Default custom_event — a walkerOS event with no `eventType` mapping.
 * mParticle wraps it as a `custom_event` with the default `other` category.
 * user_identities are resolved at the batch level from
 * `settings.userIdentities`.
 */
export const customEvent: Flow.StepExample = {
  in: getEvent('product view', {
    timestamp: 1700000100000,
    data: { id: 'SKU-A1', name: 'Shoe', price: 129.99 },
    user: { id: 'user-123' },
    source: { type: 'server', id: 'https://shop.example.com', previous_id: '' },
  }),
  mapping: undefined,
  out: {
    events: [
      {
        event_type: 'custom_event',
        data: {
          event_name: 'product view',
          custom_event_type: 'other',
          custom_attributes: {
            id: 'SKU-A1',
            name: 'Shoe',
            price: 129.99,
          },
          timestamp_unixtime_ms: 1700000100000,
          source_message_id: '1700000100000-gr0up-1',
        },
      },
    ],
    user_identities: {
      customer_id: 'user-123',
    },
    environment: 'production',
  },
};

/**
 * screen_view event — mapping.settings.eventType switches the mParticle
 * event shape. Uses event name as the `screen_name`.
 */
export const screenView: Flow.StepExample = {
  in: getEvent('page view', {
    timestamp: 1700000200000,
    data: { title: 'Checkout', path: '/checkout' },
    user: { id: 'user-123' },
    source: { type: 'server', id: 'https://shop.example.com', previous_id: '' },
  }),
  mapping: {
    settings: { eventType: 'screen_view' },
  },
  out: {
    events: [
      {
        event_type: 'screen_view',
        data: {
          screen_name: 'page view',
          custom_attributes: {
            title: 'Checkout',
            path: '/checkout',
          },
          timestamp_unixtime_ms: 1700000200000,
          source_message_id: '1700000200000-gr0up-1',
        },
      },
    ],
    user_identities: {
      customer_id: 'user-123',
    },
    environment: 'production',
  },
};

/**
 * commerce_event — mapping.settings.eventType: 'commerce_event' plus a
 * `commerce` mapping resolves a ProductAction block. Products, currency,
 * and transaction metadata are all driven by the commerce mapping value.
 */
export const commercePurchase: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000300000,
    data: { id: 'ORD-300', total: 249.99, currency: 'EUR' },
    user: { id: 'user-123' },
    source: { type: 'server', id: 'https://shop.example.com', previous_id: '' },
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
  out: {
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
          custom_attributes: {
            id: 'ORD-300',
            total: 249.99,
            currency: 'EUR',
          },
          timestamp_unixtime_ms: 1700000300000,
          source_message_id: '1700000300000-gr0up-1',
        },
      },
    ],
    user_identities: {
      customer_id: 'user-123',
    },
    environment: 'production',
  },
};

/**
 * Identity + attributes — verifies `user_identities` and `user_attributes`
 * come from the batch-level settings mappings, not the event payload.
 */
export const identityAndAttributes: Flow.StepExample = {
  in: getEvent('form submit', {
    timestamp: 1700000400000,
    data: { type: 'newsletter' },
    user: {
      id: 'user-123',
      email: 'user@example.com',
    },
    source: { type: 'server', id: 'https://example.com', previous_id: '' },
  }),
  mapping: undefined,
  out: {
    events: [
      {
        event_type: 'custom_event',
        data: {
          event_name: 'form submit',
          custom_event_type: 'other',
          custom_attributes: {
            type: 'newsletter',
          },
          timestamp_unixtime_ms: 1700000400000,
          source_message_id: '1700000400000-gr0up-1',
        },
      },
    ],
    user_identities: {
      customer_id: 'user-123',
      email: 'user@example.com',
    },
    environment: 'production',
  },
};
