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
  out: {
    pixel_code: 'PIXEL_CODE',
    partner_name: 'walkerOS',
    data: [
      {
        event: 'CompletePayment',
        event_id: '1700000900000-gr0up-1',
        timestamp: '2023-11-14T22:28:20.000Z',
        context: {
          user: {
            external_id: 'user-123',
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
  out: {
    pixel_code: 'PIXEL_CODE',
    partner_name: 'walkerOS',
    data: [
      {
        event: 'AddToCart',
        event_id: '1700000901000-gr0up-1',
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
    pixel_code: 'PIXEL_CODE',
    partner_name: 'walkerOS',
    data: [
      {
        event: 'page view',
        event_id: '1700000902000-gr0up-1',
        timestamp: '2023-11-14T22:28:22.000Z',
        context: {
          page: {
            url: 'https://example.com/docs/',
          },
        },
        properties: {},
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
  out: {
    pixel_code: 'PIXEL_CODE',
    partner_name: 'walkerOS',
    data: [
      {
        event: 'SubmitForm',
        event_id: '1700000903000-gr0up-1',
        timestamp: '2023-11-14T22:28:23.000Z',
        context: {
          user: {
            email: 'user@example.com',
          },
          page: {
            url: 'https://example.com/contact',
          },
        },
        properties: {},
      },
    ],
  },
};
