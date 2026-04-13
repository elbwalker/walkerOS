import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

export const checkout: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000900,
    data: { id: 'ORD-300', total: 249.99, currency: 'EUR' },
    nested: [
      {
        entity: 'product',
        data: {
          id: 'SKU-A1',
          name: 'Everyday Ruck Snack',
          price: '129.99',
          quantity: 2,
        },
      },
    ],
    user: { id: 'user-123', device: 'device-456' },
    source: { type: 'server', id: 'https://shop.example.com', previous_id: '' },
  }),
  mapping: {
    name: 'checkout',
    data: {
      map: {
        custom_data: {
          map: {
            value: 'data.total',
            currency: { key: 'data.currency', value: 'EUR' },
            order_id: 'data.id',
            num_items: {
              fn: (event: unknown) =>
                (event as WalkerOS.Event).nested.filter(
                  (item) => item.entity === 'product',
                ).length,
            },
            contents: {
              loop: [
                'nested',
                {
                  condition: (entity: unknown) =>
                    isObject(entity) && entity.entity === 'product',
                  map: {
                    id: 'data.id',
                    item_name: 'data.name',
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
        event_name: 'checkout',
        event_time: 1700000900,
        event_id: '1700000900-gr0up-1',
        event_source_url: 'https://shop.example.com',
        action_source: 'web',
        user_data: {
          external_id: ['user-123'],
        },
        custom_data: {
          value: 249.99,
          currency: 'EUR',
          order_id: 'ORD-300',
          num_items: 1,
          contents: [
            {
              id: 'SKU-A1',
              item_name: 'Everyday Ruck Snack',
              item_price: '129.99',
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
    timestamp: 1700000901,
    data: { id: 'SKU-B2', name: 'Cool Cap', price: '42.00', quantity: 1 },
    user: { id: 'user-456' },
    source: {
      type: 'server',
      id: 'https://shop.example.com/products',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'add_to_cart',
    data: {
      map: {
        custom_data: {
          map: {
            value: 'data.price',
            currency: { value: 'EUR' },
            contents: {
              set: [
                {
                  map: {
                    id: 'data.id',
                    item_name: 'data.name',
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
        event_name: 'add_to_cart',
        event_time: 1700000901,
        event_id: '1700000901-gr0up-1',
        event_source_url: 'https://shop.example.com/products',
        action_source: 'web',
        user_data: {
          external_id: ['user-456'],
        },
        custom_data: {
          value: '42.00',
          currency: 'EUR',
          contents: [
            {
              id: 'SKU-B2',
              item_name: 'Cool Cap',
              item_price: '42.00',
              quantity: 1,
            },
          ],
        },
      },
    ],
  },
};

export const pageVisit: Flow.StepExample = {
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
    name: 'page_visit',
  },
  out: {
    data: [
      {
        event_name: 'page_visit',
        event_time: 1700000902,
        event_id: '1700000902-gr0up-1',
        event_source_url: 'https://www.example.com/docs/',
        action_source: 'web',
        user_data: {
          external_id: ['user-789'],
        },
      },
    ],
  },
};

export const search: Flow.StepExample = {
  in: getEvent('entity action', {
    timestamp: 1700000903,
    name: 'site search',
    data: { query: 'walkerOS destinations' },
    user: { id: 'user-101' },
    source: {
      type: 'server',
      id: 'https://www.example.com/search',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'search',
    data: {
      map: {
        custom_data: {
          map: {
            search_string: 'data.query',
          },
        },
      },
    },
  },
  out: {
    data: [
      {
        event_name: 'search',
        event_time: 1700000903,
        event_id: '1700000903-gr0up-1',
        event_source_url: 'https://www.example.com/search',
        action_source: 'web',
        user_data: {
          external_id: ['user-101'],
        },
        custom_data: {
          search_string: 'walkerOS destinations',
        },
      },
    ],
  },
};

export const signup: Flow.StepExample = {
  in: getEvent('entity action', {
    timestamp: 1700000904,
    name: 'user signup',
    data: { method: 'email' },
    user: { id: 'new-user-1', email: 'new@example.com' },
    source: {
      type: 'server',
      id: 'https://www.example.com/register',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'signup',
    data: {
      map: {
        user_data: {
          map: {
            em: { set: ['user.email'] },
            external_id: { set: ['user.id'] },
          },
        },
      },
    },
  },
  out: {
    data: [
      {
        event_name: 'signup',
        event_time: 1700000904,
        event_id: '1700000904-gr0up-1',
        event_source_url: 'https://www.example.com/register',
        action_source: 'web',
        user_data: {
          em: ['new@example.com'],
          external_id: ['new-user-1'],
        },
      },
    ],
  },
};
