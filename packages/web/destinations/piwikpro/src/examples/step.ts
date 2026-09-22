import type { Flow } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

/**
 * Destination bootstrap.
 * Given the canonical settings, init loads the PiwikPro script and configures
 * the tracker URL and app id. Link tracking follows the first hit instead
 * (see `linkTrackingAfterFirstHit`). Reproduce by passing the same settings to
 * `startFlow` as the destination config.
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
  ],
};

/**
 * Runs with the default settings (linkTracking on). The other event examples
 * run with `linkTracking: false`, so their `out` holds only their own commands.
 */
export const linkTrackingAfterFirstHit: Flow.StepExample = {
  title: 'Link tracking after the first hit',
  description:
    'With the default linkTracking setting, the first hit is followed by enableLinkTracking for automatic outlink and download tracking.',
  in: getEvent('page view', { timestamp: 1700000312 }),
  out: [['trackPageView', 'walkerOS documentation'], ['enableLinkTracking']],
};

export const ecommerceOrder: Flow.StepExample = {
  title: 'Ecommerce order',
  description:
    'A completed order calls Piwik PRO ecommerceOrder with line items and order totals.',
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
          customDimensions: { 1: 'one size' },
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
};

export const ecommerceAddToCart: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A product add fires Piwik PRO ecommerceAddToCart with the added item.',
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
    ],
  ],
};

export const productDetailView: Flow.StepExample = {
  title: 'Product detail view',
  description:
    'A product view fires Piwik PRO ecommerceProductDetailView with a single-item array.',
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
    ],
  ],
};

export const cartUpdate: Flow.StepExample = {
  title: 'Cart update',
  description:
    'A cart view fires Piwik PRO ecommerceCartUpdate with nested products and the cart total.',
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
    ['trackGoal', 'goal_1'],
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

export const pageViewWithGoal: Flow.StepExample = {
  title: 'Page view with goal',
  description:
    'A page view rule with a goal keeps the default trackPageView and adds a trackGoal conversion.',
  in: getEvent('page view', { timestamp: 1700000306 }),
  mapping: {
    settings: {
      goalId: 'goal_1',
    },
  },
  out: [
    ['trackPageView', 'walkerOS documentation'],
    ['trackGoal', 'goal_1'],
  ],
};

export const eventWithGoalValue: Flow.StepExample = {
  title: 'Event with goal value',
  description:
    'An order complete fires Piwik PRO trackEvent and then trackGoal with the order total as the conversion value.',
  in: getEvent('order complete', { timestamp: 1700000307 }),
  mapping: {
    name: 'trackEvent',
    data: {
      set: [{ value: 'order' }, { value: 'complete' }, 'data.id'],
    },
    settings: {
      goalId: 'goal_1',
      goalValue: 'data.total',
    },
  },
  out: [
    ['trackEvent', 'order', 'complete', '0rd3r1d'],
    ['trackGoal', 'goal_1', 555],
  ],
};

export const ecommerceRemoveFromCart: Flow.StepExample = {
  title: 'Remove from cart',
  description:
    'A product remove fires Piwik PRO ecommerceRemoveFromCart with the removed item.',
  in: getEvent('product remove', {
    timestamp: 1700000308,
    data: {
      id: 'ers',
      name: 'Everyday Ruck Snack',
      color: 'black',
      size: 'l',
      price: 420,
    },
  }),
  mapping: {
    name: 'ecommerceRemoveFromCart',
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
              },
            },
          ],
        },
      ],
    },
  },
  out: [
    [
      'ecommerceRemoveFromCart',
      [
        {
          sku: 'ers',
          name: 'Everyday Ruck Snack',
          price: 420,
          quantity: 1,
          variant: 'black',
        },
      ],
    ],
  ],
};

export const siteSearch: Flow.StepExample = {
  title: 'Site search',
  description:
    'A search submit fires Piwik PRO trackSiteSearch with the keyword, category, and result count.',
  in: getEvent('search submit', {
    timestamp: 1700000309,
    data: { query: 'rucksack', category: 'bags', results: 12 },
  }),
  mapping: {
    name: 'trackSiteSearch',
    data: {
      set: ['data.query', 'data.category', 'data.results'],
    },
  },
  out: [['trackSiteSearch', 'rucksack', 'bags', 12]],
};

export const linkDownload: Flow.StepExample = {
  title: 'Download link',
  description:
    'A file download fires Piwik PRO trackLink with the file URL and the download link type.',
  in: getEvent('file download', {
    timestamp: 1700000310,
    data: { url: 'https://www.example.com/whitepaper.pdf' },
  }),
  mapping: {
    name: 'trackLink',
    data: {
      set: ['data.url', { value: 'download' }],
    },
  },
  out: [['trackLink', 'https://www.example.com/whitepaper.pdf', 'download']],
};

export const ping: Flow.StepExample = {
  title: 'Ping',
  description:
    'A pulse-triggered event fires Piwik PRO ping to extend the time spent on the page.',
  in: getEvent('page ping', { timestamp: 1700000311, trigger: 'pulse' }),
  mapping: {
    name: 'ping',
  },
  out: [['ping']],
};

export const customDimensionsEvent: Flow.StepExample = {
  title: 'Event with custom dimensions',
  description:
    'A product add fires Piwik PRO trackEvent with rule-level custom dimensions as its dimensions argument, values percent-encoded.',
  in: getEvent('product add', { timestamp: 1700000313 }),
  mapping: {
    name: 'trackEvent',
    data: {
      set: ['entity', 'action', 'data.name', 'data.price'],
    },
    settings: {
      customDimensions: {
        1: 'data.size',
        2: 'data.name',
      },
    },
  },
  out: [
    [
      'trackEvent',
      'product',
      'add',
      'Everyday Ruck Snack',
      420,
      { dimension1: 'l', dimension2: 'Everyday%20Ruck%20Snack' },
    ],
  ],
};

export const customDimensionsPageView: Flow.StepExample = {
  title: 'Page view with custom dimensions',
  description:
    'trackPageView has no dimensions argument, so rule-level custom dimensions are set right before the hit and deleted right after it.',
  in: getEvent('page view', { timestamp: 1700000314 }),
  mapping: {
    settings: {
      customDimensions: {
        1: 'globals.pagegroup',
      },
    },
  },
  out: [
    ['setCustomDimensionValue', 1, 'docs'],
    ['trackPageView', 'walkerOS documentation'],
    ['deleteCustomDimension', 1],
  ],
};
