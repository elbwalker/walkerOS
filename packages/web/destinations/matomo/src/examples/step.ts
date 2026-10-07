import type { Flow } from '@walkeros/core';
import type { Settings } from '../types';
import { getEvent } from '@walkeros/core';

/**
 * Matomo step example. The test runner registers the destination with the
 * init example's config and merges an example's optional `settings` on top.
 */
export type StepExample = Flow.StepExample & {
  /** Destination settings merged over the init example's settings. */
  settings?: Settings;
};

/**
 * Destination bootstrap.
 * Given the canonical settings, init loads the Matomo script and configures
 * the tracker URL, site ID, and link tracking. Reproduce by passing the same
 * settings to `startFlow` as the destination config.
 */
export const init: StepExample = {
  title: 'Initialization',
  description:
    'Destination bootstrap loads the Matomo tracker script and configures the tracker URL and site id.',
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
export const pageView: StepExample = {
  title: 'Page view',
  description:
    'A page view is tracked in Matomo via trackPageView with the page title from event data.',
  in: getEvent('page view', { timestamp: 1700000400 }),
  mapping: {
    data: 'data.title',
  },
  out: [['_paq.push', ['trackPageView', 'walkerOS documentation']]],
};

/**
 * Page view rule with a goal -- the default trackPageView stays and the goal
 * follows it.
 */
export const pageViewWithGoal: StepExample = {
  title: 'Page view with goal',
  description:
    'A page view rule with a goal keeps the default trackPageView and adds a trackGoal conversion.',
  in: getEvent('page view', { timestamp: 1700000407 }),
  mapping: {
    settings: {
      goalId: '1',
    },
  },
  out: [
    ['_paq.push', ['trackPageView', 'walkerOS documentation']],
    ['_paq.push', ['trackGoal', '1', undefined]],
  ],
};

/**
 * Custom event tracking with goal conversion.
 * Uses trackEvent with mapped name, followed by trackGoal.
 */
export const customEvent: StepExample = {
  title: 'Custom event with goal',
  description:
    'A promotion visible event fires Matomo trackEvent and then trackGoal to record a goal conversion.',
  in: getEvent('promotion visible', { timestamp: 1700000401 }),
  mapping: {
    name: 'trackEvent',
    settings: {
      goalId: '1',
    },
    data: {
      set: ['data.name', 'data.position'],
    },
  },
  out: [
    ['_paq.push', ['trackEvent', 'Setting up tracking easily', 'hero']],
    ['_paq.push', ['trackGoal', '1', undefined]],
  ],
};

/**
 * Ecommerce order -- one call with cart items array and order totals.
 * Not public: Matomo records an order's products only after an
 * addEcommerceItem call per product, which one rule cannot send, so this
 * shows mapping mechanics only.
 */
export const ecommerceOrder: StepExample = {
  public: false,
  title: 'Ecommerce order',
  description:
    "Test fixture for nested product mapping, not a valid Matomo call: Matomo records an order's products only after an addEcommerceItem call per product.",
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
                typeof entity === 'object' &&
                entity !== null &&
                'entity' in entity &&
                entity.entity === 'product',
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
 * Ecommerce cart update -- nested products and the cart total in one call.
 * Not public: Matomo takes trackEcommerceCartUpdate(grandTotal) after an
 * addEcommerceItem call per product, which one rule cannot send.
 */
export const ecommerceCartUpdate: StepExample = {
  public: false,
  title: 'Cart update',
  description:
    'Test fixture for nested product mapping, not a valid Matomo call: Matomo takes trackEcommerceCartUpdate(grandTotal) after an addEcommerceItem call per product.',
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
                typeof entity === 'object' &&
                entity !== null &&
                'entity' in entity &&
                entity.entity === 'product',
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
 * Product detail view with a single product array.
 * Not public: Matomo has no ecommerceProductDetailView; it tracks a product
 * view with setEcommerceView followed by trackPageView, two commands.
 */
export const productDetailView: StepExample = {
  public: false,
  title: 'Product detail view',
  description:
    'Test fixture for a single-product mapping, not a valid Matomo call: Matomo tracks a product view with setEcommerceView followed by trackPageView.',
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
export const siteSearch: StepExample = {
  title: 'Site search',
  description:
    'A search submit fires Matomo trackSiteSearch with the keyword, category, and number of results.',
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
export const goalTracking: StepExample = {
  title: 'Goal with value',
  description:
    'A promotion event fires Matomo trackEvent and then trackGoal with a monetary goal value from event data.',
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

/**
 * Destination and rule custom dimensions, resolved per event. The destination
 * dimensions come from `settings`, which the docs do not show, so this
 * example stays out of them.
 */
export const customDimensions: StepExample = {
  title: 'Custom dimensions',
  description:
    'Destination and rule custom dimensions are set right before the page view; afterwards the rule-only dimension is deleted and the destination value is set again.',
  public: false,
  in: getEvent('page view', { timestamp: 1700000408 }),
  settings: {
    customDimensions: { '1': 'globals.pagegroup' },
  },
  mapping: {
    settings: {
      customDimensions: { '2': 'data.id' },
    },
  },
  out: [
    ['_paq.push', ['setCustomDimension', 1, 'docs']],
    ['_paq.push', ['setCustomDimension', 2, '/docs/']],
    ['_paq.push', ['trackPageView', 'walkerOS documentation']],
    ['_paq.push', ['deleteCustomDimension', 2]],
    ['_paq.push', ['setCustomDimension', 1, 'docs']],
  ],
};
