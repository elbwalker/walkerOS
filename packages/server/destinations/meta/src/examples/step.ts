import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

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
  out: {
    data: [
      {
        event_name: 'Purchase',
        event_time: 1700000900,
        event_id: '1700000900-gr0up-1',
        event_source_url: 'https://shop.example.com',
        action_source: 'website',
        user_data: {
          external_id: ['user-123'],
        },
        currency: 'EUR',
        value: 249.99,
        contents: [{ id: 'SKU-A1', quantity: 2, item_price: 129.99 }],
      },
    ],
  },
};

export const lead: Flow.StepExample = {
  in: getEvent('form submit', {
    timestamp: 1700000901,
    data: { type: 'newsletter' },
    user: { email: 'user@example.com' },
    source: { type: 'server', id: 'https://example.com', previous_id: '' },
  }),
  mapping: undefined,
  out: {
    data: [
      {
        event_name: 'Lead',
        event_time: 1700000901,
        event_id: '1700000901-gr0up-1',
        event_source_url: 'https://example.com',
        action_source: 'website',
        user_data: {
          email: ['user@example.com'],
        },
      },
    ],
  },
};
