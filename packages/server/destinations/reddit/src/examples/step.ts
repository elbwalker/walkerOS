import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

export const purchase: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000900,
    data: { id: 'ORD-300', total: 249.99, currency: 'EUR' },
    nested: [
      {
        entity: 'product',
        data: {
          id: 'SKU-A1',
          name: 'Everyday Ruck Snack',
          category: 'bags',
          price: '129.99',
          quantity: 2,
        },
      },
    ],
    user: { id: 'user-123', device: 'device-456' },
    source: { type: 'server', id: 'https://shop.example.com', previous_id: '' },
  }),
  mapping: {
    name: 'Purchase',
    data: {
      map: {
        event_metadata: {
          map: {
            value_decimal: 'data.total',
            currency: { key: 'data.currency', value: 'EUR' },
            item_count: {
              fn: (event: unknown) =>
                (event as WalkerOS.Event).nested.filter(
                  (item) => item.entity === 'product',
                ).length,
            },
            products: {
              loop: [
                'nested',
                {
                  condition: (entity: unknown) =>
                    isObject(entity) && entity.entity === 'product',
                  map: {
                    id: 'data.id',
                    name: 'data.name',
                    category: { key: 'data.category', value: 'uncategorized' },
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
    data: {
      events: [
        {
          event_at: new Date(1700000900).toISOString(),
          event_at_ms: 1700000900,
          event_type: { tracking_type: 'Purchase' },
          event_metadata: {
            conversion_id: '1700000900-gr0up-1',
            value_decimal: 249.99,
            currency: 'EUR',
            item_count: 1,
            products: [
              {
                id: 'SKU-A1',
                name: 'Everyday Ruck Snack',
                category: 'bags',
              },
            ],
          },
          user: {
            external_id: 'user-123',
          },
        },
      ],
    },
  },
};

export const addToCart: Flow.StepExample = {
  in: getEvent('product add', {
    timestamp: 1700000901,
    data: {
      id: 'SKU-B2',
      name: 'Cool Cap',
      category: 'hats',
      price: '42.00',
      quantity: 1,
    },
    user: { id: 'user-456' },
    source: {
      type: 'server',
      id: 'https://shop.example.com/products',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'AddToCart',
    data: {
      map: {
        event_metadata: {
          map: {
            value_decimal: 'data.price',
            currency: { value: 'EUR' },
            item_count: { value: 1 },
            products: {
              set: [
                {
                  map: {
                    id: 'data.id',
                    name: 'data.name',
                    category: { key: 'data.category', value: 'uncategorized' },
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
    data: {
      events: [
        {
          event_at: new Date(1700000901).toISOString(),
          event_at_ms: 1700000901,
          event_type: { tracking_type: 'AddToCart' },
          event_metadata: {
            conversion_id: '1700000901-gr0up-1',
            value_decimal: '42.00',
            currency: 'EUR',
            item_count: 1,
            products: [
              {
                id: 'SKU-B2',
                name: 'Cool Cap',
                category: 'hats',
              },
            ],
          },
          user: {
            external_id: 'user-456',
          },
        },
      ],
    },
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
    name: 'PageVisit',
  },
  out: {
    data: {
      events: [
        {
          event_at: new Date(1700000902).toISOString(),
          event_at_ms: 1700000902,
          event_type: { tracking_type: 'PageVisit' },
          event_metadata: {
            conversion_id: '1700000902-gr0up-1',
          },
          user: {
            external_id: 'user-789',
          },
        },
      ],
    },
  },
};

export const lead: Flow.StepExample = {
  in: getEvent('form submit', {
    timestamp: 1700000903,
    data: { form: 'contact' },
    user: { id: 'user-lead-1', email: 'lead@example.com' },
    source: {
      type: 'server',
      id: 'https://www.example.com/contact',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'Lead',
    data: {
      map: {
        user: {
          map: {
            email: 'user.email',
            external_id: 'user.id',
          },
        },
      },
    },
  },
  out: {
    data: {
      events: [
        {
          event_at: new Date(1700000903).toISOString(),
          event_at_ms: 1700000903,
          event_type: { tracking_type: 'Lead' },
          event_metadata: {
            conversion_id: '1700000903-gr0up-1',
          },
          user: {
            email: 'lead@example.com',
            external_id: 'user-lead-1',
          },
        },
      ],
    },
  },
};

export const signUp: Flow.StepExample = {
  in: getEvent('user signup', {
    timestamp: 1700000904,
    data: { method: 'email' },
    user: { id: 'new-user-1', email: 'new@example.com' },
    source: {
      type: 'server',
      id: 'https://www.example.com/register',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'SignUp',
    data: {
      map: {
        user: {
          map: {
            email: 'user.email',
            external_id: 'user.id',
          },
        },
      },
    },
  },
  out: {
    data: {
      events: [
        {
          event_at: new Date(1700000904).toISOString(),
          event_at_ms: 1700000904,
          event_type: { tracking_type: 'SignUp' },
          event_metadata: {
            conversion_id: '1700000904-gr0up-1',
          },
          user: {
            email: 'new@example.com',
            external_id: 'new-user-1',
          },
        },
      ],
    },
  },
};

export const search: Flow.StepExample = {
  in: getEvent('site search', {
    timestamp: 1700000905,
    data: { query: 'walkerOS destinations' },
    user: { id: 'user-101' },
    source: {
      type: 'server',
      id: 'https://www.example.com/search',
      previous_id: '',
    },
  }),
  mapping: {
    name: 'Search',
    data: {
      map: {
        event_metadata: {
          map: {
            item_count: { value: 1 },
          },
        },
      },
    },
  },
  out: {
    data: {
      events: [
        {
          event_at: new Date(1700000905).toISOString(),
          event_at_ms: 1700000905,
          event_type: { tracking_type: 'Search' },
          event_metadata: {
            conversion_id: '1700000905-gr0up-1',
            item_count: 1,
          },
          user: {
            external_id: 'user-101',
          },
        },
      ],
    },
  },
};
