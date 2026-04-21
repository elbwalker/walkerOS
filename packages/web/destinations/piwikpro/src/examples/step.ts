import type { Flow } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

/**
 * Destination bootstrap.
 * Given the canonical settings, init loads the PiwikPro script and configures
 * the tracker URL, app id, and link tracking. Reproduce by passing the same
 * settings to `startFlow` as the destination config.
 */
export const init: Flow.StepExample = {
  title: 'Initialization',
  description:
    'Destination bootstrap loads the Piwik PRO tracker and configures the tracker URL and app id.',
  in: {
    loadScript: true,
    settings: {
      appId: 'XXX-XXX-XXX-XXX-XXX',
      url: 'https://your_account_name.piwik.pro/',
    },
  },
  out: [
    [
      '_paq.push',
      ['setTrackerUrl', 'https://your_account_name.piwik.pro/ppms.php'],
    ],
    ['_paq.push', ['setSiteId', 'XXX-XXX-XXX-XXX-XXX']],
    ['_paq.push', ['enableLinkTracking']],
  ],
};

export const ecommerceOrder: Flow.StepExample = {
  title: 'Ecommerce order',
  description:
    'A completed order calls Piwik PRO ecommerceOrder with line items, order totals, and currency code.',
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
  title: 'Add to cart',
  description:
    'A product add fires Piwik PRO ecommerceAddToCart with the added item and currency code.',
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
  title: 'Product detail view',
  description:
    'A product view fires Piwik PRO ecommerceProductDetailView with a single-item array and currency code.',
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
  title: 'Cart update',
  description:
    'A cart view fires Piwik PRO ecommerceCartUpdate with nested products, total value, and currency code.',
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
  title: 'Custom event with goal',
  description:
    'A promotion visible event fires Piwik PRO trackEvent and then trackGoal to record a goal conversion.',
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
  title: 'Page view',
  description:
    'A page view fires Piwik PRO trackPageView with the page title resolved from event data.',
  in: getEvent('page view', { timestamp: 1700000305 }),
  mapping: {
    data: 'data.title',
  },
  out: [['trackPageView', 'walkerOS documentation']],
};
