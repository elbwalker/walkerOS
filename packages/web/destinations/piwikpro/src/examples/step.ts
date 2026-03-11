import type { Flow } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

export const ecommerceOrder: Flow.StepExample = {
  in: getEvent('order complete', { timestamp: 1700000300 }),
  mapping: {
    name: 'ecommerceOrder',
    data: {
      set: [
        {
          loop: [
            'nested',
            {
              condition: (entity: unknown) =>
                isObject(entity) && entity.entity === 'product',
              map: {
                sku: 'data.id',
                name: 'data.name',
                price: 'data.price',
                quantity: { value: 1 },
                variant: { key: 'data.color' },
                customDimensions: {
                  map: {
                    1: 'data.size',
                  },
                },
              },
            },
          ],
        },
        {
          map: {
            orderId: 'data.id',
            grandTotal: 'data.total',
            tax: 'data.taxes',
            shipping: 'data.shipping',
          },
        },
        {
          map: {
            currencyCode: { value: 'EUR' },
          },
        },
      ],
    },
  },
  out: [
    [
      'ecommerceOrder',
      [
        {
          sku: 'ers',
          name: 'Everyday Ruck Snack',
          price: 420,
          quantity: 1,
          variant: 'black',
          customDimensions: { 1: 'l' },
        },
        {
          sku: 'cc',
          name: 'Cool Cap',
          price: 42,
          quantity: 1,
          variant: undefined,
          customDimensions: { 1: 'one size' },
        },
      ],
      {
        orderId: '0rd3r1d',
        grandTotal: 555,
        tax: 73.76,
        shipping: 5.22,
      },
      { currencyCode: 'EUR' },
    ],
  ],
};

export const ecommerceAddToCart: Flow.StepExample = {
  in: getEvent('product add', { timestamp: 1700000301 }),
  mapping: {
    name: 'ecommerceAddToCart',
    data: {
      set: [
        {
          set: [
            {
              map: {
                sku: 'data.id',
                name: 'data.name',
                price: 'data.price',
                quantity: { value: 1 },
                variant: { key: 'data.color' },
                customDimensions: {
                  map: {
                    1: 'data.size',
                  },
                },
              },
            },
          ],
        },
        {
          map: {
            currencyCode: { value: 'EUR' },
          },
        },
      ],
    },
  },
  out: [
    [
      'ecommerceAddToCart',
      [
        {
          sku: 'ers',
          name: 'Everyday Ruck Snack',
          price: 420,
          quantity: 1,
          variant: 'black',
          customDimensions: { 1: 'l' },
        },
      ],
      { currencyCode: 'EUR' },
    ],
  ],
};

export const productDetailView: Flow.StepExample = {
  in: getEvent('product view', { timestamp: 1700000302 }),
  mapping: {
    name: 'ecommerceProductDetailView',
    data: {
      set: [
        {
          set: [
            {
              map: {
                sku: 'data.id',
                name: 'data.name',
                price: 'data.price',
                quantity: { value: 1 },
                variant: { key: 'data.color' },
                customDimensions: {
                  map: {
                    1: 'data.size',
                  },
                },
              },
            },
          ],
        },
        {
          map: {
            currencyCode: { value: 'EUR' },
          },
        },
      ],
    },
  },
  out: [
    [
      'ecommerceProductDetailView',
      [
        {
          sku: 'ers',
          name: 'Everyday Ruck Snack',
          price: 420,
          quantity: 1,
          variant: 'black',
          customDimensions: { 1: 'l' },
        },
      ],
      { currencyCode: 'EUR' },
    ],
  ],
};

export const cartUpdate: Flow.StepExample = {
  in: getEvent('cart view', { timestamp: 1700000303 }),
  mapping: {
    name: 'ecommerceCartUpdate',
    data: {
      set: [
        {
          loop: [
            'nested',
            {
              condition: (entity: unknown) =>
                isObject(entity) && entity.entity === 'product',
              map: {
                sku: 'data.id',
                name: 'data.name',
                price: 'data.price',
                quantity: { value: 1 },
                variant: { key: 'data.color' },
                customDimensions: {
                  map: {
                    1: 'data.size',
                  },
                },
              },
            },
          ],
        },
        'data.value',
        {
          map: {
            currencyCode: { value: 'EUR' },
          },
        },
      ],
    },
  },
  out: [
    [
      'ecommerceCartUpdate',
      [
        {
          sku: 'ers',
          name: 'Everyday Ruck Snack',
          price: 420,
          quantity: 1,
          variant: 'black',
          customDimensions: { 1: 'l' },
        },
      ],
      840,
      { currencyCode: 'EUR' },
    ],
  ],
};

export const customEvent: Flow.StepExample = {
  in: getEvent('promotion visible', { timestamp: 1700000304 }),
  mapping: {
    name: 'trackEvent',
    settings: {
      goalId: 'goal_1',
    },
    data: {
      set: ['data.name', 'data.position'],
    },
  },
  out: [
    ['trackEvent', 'Setting up tracking easily', 'hero'],
    ['trackGoal', 'goal_1', undefined],
  ],
};

export const pageViewWithTitle: Flow.StepExample = {
  in: getEvent('page view', { timestamp: 1700000305 }),
  mapping: {
    data: 'data.title',
  },
  out: [['trackPageView', 'walkerOS documentation']],
};
