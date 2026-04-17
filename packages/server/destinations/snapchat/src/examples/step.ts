import type { Flow } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

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
    name: 'PURCHASE',
    data: {
      map: {
        custom_data: {
          map: {
            value: 'data.total',
            currency: { key: 'data.currency', value: 'EUR' },
            transaction_id: 'data.id',
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
          },
        },
        user_data: {
          map: {
            external_id: 'user.id',
          },
        },
      },
    },
  },
  out: {
    data: [
      {
        event_name: 'PURCHASE',
        event_time: 1700000900,
        action_source: 'WEB',
        event_source_url: 'https://shop.example.com/checkout/complete',
        event_id: '1700000900000-gr0up-1',
        user_data: {
          external_id: 'user-123',
        },
        custom_data: {
          value: 249.99,
          currency: 'EUR',
          transaction_id: 'ORD-300',
          contents: [
            {
              id: 'SKU-A1',
              item_price: 124.99,
              quantity: 2,
            },
          ],
        },
      },
    ],
  },
};

export const addToCart: Flow.StepExample = {
  in: getEvent('product add', {
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
      type: 'server',
      id: 'https://shop.example.com/products/running-shoes',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'ADD_CART',
    data: {
      map: {
        custom_data: {
          map: {
            value: 'data.price',
            currency: { value: 'EUR' },
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
          },
        },
      },
    },
  },
  out: {
    data: [
      {
        event_name: 'ADD_CART',
        event_time: 1700000901,
        action_source: 'WEB',
        event_source_url: 'https://shop.example.com/products/running-shoes',
        event_id: '1700000901000-gr0up-1',
        user_data: {},
        custom_data: {
          value: 89.99,
          currency: 'EUR',
          contents: [
            {
              id: 'SKU-B2',
              item_price: 89.99,
              quantity: 1,
            },
          ],
        },
      },
    ],
  },
};

export const pageView: Flow.StepExample = {
  in: getEvent('page view', {
    timestamp: 1700000902000,
    source: {
      type: 'server',
      id: 'https://example.com/docs/',
      previous_id: '',
    },
  }),
  mapping: undefined,
  out: {
    data: [
      {
        event_name: 'page view',
        event_time: 1700000902,
        action_source: 'WEB',
        event_source_url: 'https://example.com/docs/',
        event_id: '1700000902000-gr0up-1',
        user_data: {},
        custom_data: {},
      },
    ],
  },
};

export const lead: Flow.StepExample = {
  in: getEvent('form submit', {
    timestamp: 1700000903000,
    data: { type: 'newsletter' },
    user: { email: 'user@example.com' },
    source: {
      type: 'server',
      id: 'https://example.com/contact',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'SIGN_UP',
    data: {
      map: {
        user_data: {
          map: {
            em: 'user.email',
          },
        },
        custom_data: {
          map: {
            sign_up_method: { value: 'newsletter' },
          },
        },
      },
    },
  },
  out: {
    data: [
      {
        event_name: 'SIGN_UP',
        event_time: 1700000903,
        action_source: 'WEB',
        event_source_url: 'https://example.com/contact',
        event_id: '1700000903000-gr0up-1',
        user_data: {
          em: 'user@example.com',
        },
        custom_data: {
          sign_up_method: 'newsletter',
        },
      },
    ],
  },
};
