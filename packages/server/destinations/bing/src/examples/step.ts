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
  out: {
    data: [
      {
        eventType: 'custom',
        eventId: '1700000900000-gr0up-1',
        eventName: 'purchase',
        eventTime: 1700000900,
        eventSourceUrl: 'https://shop.example.com/checkout/complete',
        adStorageConsent: 'G',
        userData: {
          externalId: 'user-123',
        },
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
  },
};

export const pageView: Flow.StepExample = {
  in: getEvent('page view', {
    timestamp: 1700000901000,
    source: {
      type: 'server',
      id: 'https://example.com/docs/',
      previous_id: '',
    },
  }),
  mapping: {
    settings: { eventType: 'pageLoad' },
  },
  out: {
    data: [
      {
        eventType: 'pageLoad',
        eventId: '1700000901000-gr0up-1',
        eventTime: 1700000901,
        eventSourceUrl: 'https://example.com/docs/',
        adStorageConsent: 'G',
        userData: {},
      },
    ],
    dataProvider: 'walkerOS',
  },
};

export const lead: Flow.StepExample = {
  in: getEvent('form submit', {
    timestamp: 1700000902000,
    data: { type: 'newsletter' },
    user: { email: 'user@example.com' },
    source: {
      type: 'server',
      id: 'https://example.com/contact',
      previous_id: '',
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
  out: {
    data: [
      {
        eventType: 'custom',
        eventId: '1700000902000-gr0up-1',
        eventName: 'lead',
        eventTime: 1700000902,
        eventSourceUrl: 'https://example.com/contact',
        adStorageConsent: 'G',
        userData: {
          em: 'user@example.com',
        },
      },
    ],
    dataProvider: 'walkerOS',
  },
};

export const addToCart: Flow.StepExample = {
  in: getEvent('product add', {
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
      type: 'server',
      id: 'https://shop.example.com/products/running-shoes',
      previous_id: '',
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
  out: {
    data: [
      {
        eventType: 'custom',
        eventId: '1700000903000-gr0up-1',
        eventName: 'add_to_cart',
        eventTime: 1700000903,
        eventSourceUrl: 'https://shop.example.com/products/running-shoes',
        adStorageConsent: 'G',
        userData: {},
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
  },
};
