import type { Flow } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

/**
 * Destination bootstrap.
 * Given the canonical settings, init loads the Matomo script and configures
 * the tracker URL, site ID, and link tracking. Reproduce by passing the same
 * settings to `startFlow` as the destination config.
 */
export const init: Flow.StepExample = {
  in: {
    loadScript: true,
    settings: {
      siteId: '1',
      url: 'https://analytics.example.com/',
    },
  },
  out: [
    [
      '_paq.push',
      ['setTrackerUrl', 'https://analytics.example.com/matomo.php'],
    ],
    ['_paq.push', ['setSiteId', '1']],
    ['_paq.push', ['enableLinkTracking']],
  ],
};

/**
 * Default page view -- no mapping name needed.
 * Destination auto-calls trackPageView with the page title.
 */
export const pageView: Flow.StepExample = {
  in: getEvent('page view', { timestamp: 1700000400 }),
  mapping: {
    data: 'data.title',
  },
  out: [['_paq.push', ['trackPageView', 'walkerOS documentation']]],
};

/**
 * Custom event tracking with goal conversion.
 * Uses trackEvent with mapped name, followed by trackGoal.
 */
export const customEvent: Flow.StepExample = {
  in: getEvent('promotion visible', { timestamp: 1700000401 }),
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
    ['_paq.push', ['trackEvent', 'Setting up tracking easily', 'hero']],
    ['_paq.push', ['trackGoal', 'goal_1', undefined]],
  ],
};

/**
 * Ecommerce order -- one call with cart items array and order totals.
 */
export const ecommerceOrder: Flow.StepExample = {
  in: getEvent('order complete', { timestamp: 1700000402 }),
  mapping: {
    name: 'trackEcommerceOrder',
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
                category: { value: '' },
                price: 'data.price',
                quantity: { value: 1 },
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
      ],
    },
  },
  out: [
    [
      '_paq.push',
      [
        'trackEcommerceOrder',
        [
          {
            sku: 'ers',
            name: 'Everyday Ruck Snack',
            category: '',
            price: 420,
            quantity: 1,
          },
          {
            sku: 'cc',
            name: 'Cool Cap',
            category: '',
            price: 42,
            quantity: 1,
          },
        ],
        {
          orderId: '0rd3r1d',
          grandTotal: 555,
          tax: 73.76,
          shipping: 5.22,
        },
      ],
    ],
  ],
};

/**
 * Ecommerce cart update -- addEcommerceItem per nested product,
 * then trackEcommerceCartUpdate with cart total.
 */
export const ecommerceCartUpdate: Flow.StepExample = {
  in: getEvent('cart view', { timestamp: 1700000403 }),
  mapping: {
    name: 'trackEcommerceCartUpdate',
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
                category: { value: '' },
                price: 'data.price',
                quantity: { value: 1 },
              },
            },
          ],
        },
        'data.value',
      ],
    },
  },
  out: [
    [
      '_paq.push',
      [
        'trackEcommerceCartUpdate',
        [
          {
            sku: 'ers',
            name: 'Everyday Ruck Snack',
            category: '',
            price: 420,
            quantity: 1,
          },
        ],
        840,
      ],
    ],
  ],
};

/**
 * Product detail view -- setEcommerceView equivalent with a single product array.
 */
export const productDetailView: Flow.StepExample = {
  in: getEvent('product view', { timestamp: 1700000404 }),
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
              },
            },
          ],
        },
      ],
    },
  },
  out: [
    [
      '_paq.push',
      [
        'ecommerceProductDetailView',
        [
          {
            sku: 'ers',
            name: 'Everyday Ruck Snack',
            price: 420,
            quantity: 1,
          },
        ],
      ],
    ],
  ],
};

/**
 * Site search -- trackSiteSearch with keyword, category, result count.
 */
export const siteSearch: Flow.StepExample = {
  in: getEvent('search submit', {
    timestamp: 1700000405,
    data: { query: 'shoes', category: 'products', resultsCount: 42 },
  }),
  mapping: {
    name: 'trackSiteSearch',
    settings: {
      siteSearch: true,
    },
    data: {
      set: ['data.query', 'data.category', 'data.resultsCount'],
    },
  },
  out: [['_paq.push', ['trackSiteSearch', 'shoes', 'products', 42]]],
};

/**
 * Goal tracking alongside a tracked event.
 * Uses a known fixture event (promotion visible) so data paths resolve.
 */
export const goalTracking: Flow.StepExample = {
  in: getEvent('promotion visible', {
    timestamp: 1700000406,
    data: { name: 'Setting up tracking easily', position: 'hero', value: 50 },
  }),
  mapping: {
    name: 'trackEvent',
    settings: {
      goalId: '1',
      goalValue: 'data.value',
    },
    data: {
      set: ['data.name'],
    },
  },
  out: [
    ['_paq.push', ['trackEvent', 'Setting up tracking easily']],
    ['_paq.push', ['trackGoal', '1', 50]],
  ],
};
