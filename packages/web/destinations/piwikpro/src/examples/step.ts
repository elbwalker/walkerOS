import type { Flow } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';

/**
 * Piwik PRO step examples. The four standard events follow the Piwik PRO
 * JavaScript API, run with the settings `{ appId: 'XXX-XXX-XXX-XXX-XXX',
 * url: 'https://your_account_name.piwik.pro/', linkTracking: false }`, so each
 * out holds only the event's own commands; `linkTrackingAfterFirstHit` runs
 * with the default instead. Each out is the call recorded on
 * `window._paq.push`, one per command.
 *
 * Functions in mappings are published as source code, so they must not use
 * imported helpers.
 */

/**
 * Destination bootstrap.
 * Given the canonical settings, init loads the PiwikPro script and configures
 * the tracker URL and app id. Link tracking follows the first hit instead
 * (see `linkTrackingAfterFirstHit`).
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
      'window._paq.push',
      ['setTrackerUrl', 'https://your_account_name.piwik.pro/ppms.php'],
    ],
    ['window._paq.push', ['setSiteId', 'XXX-XXX-XXX-XXX-XXX']],
  ],
};

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view calls Piwik PRO trackPageView with the page title from the event, without any mapping.',
  in: getEvent('page view'),
  out: [['window._paq.push', ['trackPageView', 'walkerOS documentation']]],
};

export const productDetailView: Flow.StepExample = {
  title: 'Product detail view',
  description:
    'A product view calls Piwik PRO ecommerceProductDetailView with the product and the currency code.',
  in: getEvent('product view'),
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
                quantity: { key: 'data.quantity', value: 1 },
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
        { map: { currencyCode: { key: 'data.currency', value: 'EUR' } } },
      ],
    },
  },
  out: [
    [
      'window._paq.push',
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
  ],
};

export const ecommerceAddToCart: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A product add calls Piwik PRO ecommerceAddToCart with the added product and the currency code.',
  in: getEvent('product add'),
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
                quantity: { key: 'data.quantity', value: 1 },
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
        { map: { currencyCode: { key: 'data.currency', value: 'EUR' } } },
      ],
    },
  },
  out: [
    [
      'window._paq.push',
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
  ],
};

export const ecommerceOrder: Flow.StepExample = {
  title: 'Ecommerce order',
  description:
    'A completed order calls Piwik PRO ecommerceOrder with its products, the payment information and the currency code.',
  in: getEvent('order complete'),
  mapping: {
    name: 'ecommerceOrder',
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
                price: 'data.price',
                quantity: { key: 'data.quantity', value: 1 },
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
            grandTotal: 'data.value',
            tax: 'data.taxes',
            shipping: 'data.shipping',
          },
        },
        { map: { currencyCode: { key: 'data.currency', value: 'EUR' } } },
      ],
    },
  },
  out: [
    [
      'window._paq.push',
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
        { currencyCode: 'EUR' },
      ],
    ],
  ],
};

/**
 * Runs with the default settings (linkTracking on). The other event examples
 * run with `linkTracking: false`, so their `out` holds only their own commands.
 */
export const linkTrackingAfterFirstHit: Flow.StepExample = {
  public: false,
  title: 'Link tracking after the first hit',
  description:
    'With the default linkTracking setting, the first hit is followed by enableLinkTracking for automatic outlink and download tracking.',
  in: getEvent('page view'),
  out: [
    ['window._paq.push', ['trackPageView', 'walkerOS documentation']],
    ['window._paq.push', ['enableLinkTracking']],
  ],
};

export const cartUpdate: Flow.StepExample = {
  public: false,
  title: 'Cart update',
  description:
    'A cart view fires Piwik PRO ecommerceCartUpdate with nested products, the cart total and the currency code.',
  in: getEvent('cart view'),
  mapping: {
    name: 'ecommerceCartUpdate',
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
                price: 'data.price',
                quantity: { key: 'data.quantity', value: 1 },
                variant: { key: 'data.color' },
              },
            },
          ],
        },
        'data.value',
        { map: { currencyCode: { key: 'data.currency', value: 'EUR' } } },
      ],
    },
  },
  out: [
    [
      'window._paq.push',
      [
        'ecommerceCartUpdate',
        [
          {
            sku: 'ers',
            name: 'Everyday Ruck Snack',
            price: 420,
            quantity: 2,
            variant: 'black',
          },
        ],
        840,
        { currencyCode: 'EUR' },
      ],
    ],
  ],
};

export const customEvent: Flow.StepExample = {
  public: false,
  title: 'Custom event with goal',
  description:
    'A promotion visible event fires Piwik PRO trackEvent and then trackGoal to record a goal conversion.',
  in: getEvent('promotion visible'),
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
    ['window._paq.push', ['trackEvent', 'Setting up tracking easily', 'hero']],
    ['window._paq.push', ['trackGoal', 'goal_1']],
  ],
};

export const pageViewWithTitle: Flow.StepExample = {
  public: false,
  title: 'Page view with a mapped title',
  description:
    'A page view rule with its own data sends that value as the trackPageView title.',
  in: getEvent('page view'),
  mapping: {
    data: 'data.title',
  },
  out: [['window._paq.push', ['trackPageView', 'walkerOS documentation']]],
};

export const pageViewWithGoal: Flow.StepExample = {
  public: false,
  title: 'Page view with goal',
  description:
    'A page view rule with a goal keeps the default trackPageView and adds a trackGoal conversion.',
  in: getEvent('page view'),
  mapping: {
    settings: {
      goalId: 'goal_1',
    },
  },
  out: [
    ['window._paq.push', ['trackPageView', 'walkerOS documentation']],
    ['window._paq.push', ['trackGoal', 'goal_1']],
  ],
};

export const eventWithGoalValue: Flow.StepExample = {
  public: false,
  title: 'Event with goal value',
  description:
    'An order complete fires Piwik PRO trackEvent and then trackGoal with the order total as the conversion value.',
  in: getEvent('order complete'),
  mapping: {
    name: 'trackEvent',
    data: {
      set: [{ value: 'order' }, { value: 'complete' }, 'data.id'],
    },
    settings: {
      goalId: 'goal_1',
      goalValue: 'data.value',
    },
  },
  out: [
    ['window._paq.push', ['trackEvent', 'order', 'complete', '0rd3r1d']],
    ['window._paq.push', ['trackGoal', 'goal_1', 555]],
  ],
};

export const ecommerceRemoveFromCart: Flow.StepExample = {
  public: false,
  title: 'Remove from cart',
  description:
    'A product remove fires Piwik PRO ecommerceRemoveFromCart with the removed item and the currency code.',
  in: createEvent({
    name: 'product remove',
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
                quantity: { key: 'data.quantity', value: 1 },
                variant: { key: 'data.color' },
              },
            },
          ],
        },
        { map: { currencyCode: { key: 'data.currency', value: 'EUR' } } },
      ],
    },
  },
  out: [
    [
      'window._paq.push',
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
        { currencyCode: 'EUR' },
      ],
    ],
  ],
};

export const siteSearch: Flow.StepExample = {
  public: false,
  title: 'Site search',
  description:
    'A search submit fires Piwik PRO trackSiteSearch with the keyword, category, and result count.',
  in: createEvent({
    name: 'search submit',
    timestamp: 1700000309,
    data: { query: 'rucksack', category: 'bags', results: 12 },
  }),
  mapping: {
    name: 'trackSiteSearch',
    data: {
      set: ['data.query', 'data.category', 'data.results'],
    },
  },
  out: [['window._paq.push', ['trackSiteSearch', 'rucksack', 'bags', 12]]],
};

export const linkDownload: Flow.StepExample = {
  public: false,
  title: 'Download link',
  description:
    'A file download fires Piwik PRO trackLink with the file URL and the download link type.',
  in: createEvent({
    name: 'file download',
    timestamp: 1700000310,
    data: { url: 'https://www.example.com/whitepaper.pdf' },
  }),
  mapping: {
    name: 'trackLink',
    data: {
      set: ['data.url', { value: 'download' }],
    },
  },
  out: [
    [
      'window._paq.push',
      ['trackLink', 'https://www.example.com/whitepaper.pdf', 'download'],
    ],
  ],
};

export const ping: Flow.StepExample = {
  public: false,
  title: 'Ping',
  description:
    'A pulse-triggered event fires Piwik PRO ping to extend the time spent on the page.',
  in: createEvent({
    name: 'page ping',
    timestamp: 1700000311,
    trigger: 'pulse',
  }),
  mapping: {
    name: 'ping',
  },
  out: [['window._paq.push', ['ping']]],
};

export const customDimensionsEvent: Flow.StepExample = {
  public: false,
  title: 'Event with custom dimensions',
  description:
    'A product add fires Piwik PRO trackEvent with rule-level custom dimensions as its dimensions argument, values percent-encoded.',
  in: getEvent('product add'),
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
      'window._paq.push',
      [
        'trackEvent',
        'product',
        'add',
        'Everyday Ruck Snack',
        420,
        { dimension1: 'l', dimension2: 'Everyday%20Ruck%20Snack' },
      ],
    ],
  ],
};

export const customDimensionsPageView: Flow.StepExample = {
  public: false,
  title: 'Page view with custom dimensions',
  description:
    'trackPageView has no dimensions argument, so rule-level custom dimensions are set right before the hit and deleted right after it.',
  in: getEvent('page view'),
  mapping: {
    settings: {
      customDimensions: {
        1: 'globals.pagegroup',
      },
    },
  },
  out: [
    ['window._paq.push', ['setCustomDimensionValue', 1, 'docs']],
    ['window._paq.push', ['trackPageView', 'walkerOS documentation']],
    ['window._paq.push', ['deleteCustomDimension', 1]],
  ],
};

/** A silent rule without a goal sends nothing. */
export const silentRule: Flow.StepExample = {
  public: false,
  description:
    'A rule with silent: true and no goal sends no command, no identification change either.',
  in: getEvent('page view'),
  mapping: { silent: true },
  out: [],
};

/**
 * An event no rule maps: Piwik PRO has no method for it, so the push fails
 * instead of counting as delivered.
 */
export const unmappedEvent: Flow.StepExample = {
  public: false,
  description:
    'An event without a rule name or a goal, and not a page view, has no Piwik PRO method: the push fails with missing-input.',
  in: getEvent('product view'),
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

/**
 * A revocation of the consent the destination requires turns off the link
 * tracking it enabled: config.consent { marketing: true }, granted first,
 * then revoked.
 */
export const consentRevoke: Flow.StepExample = {
  public: false,
  description:
    'For a destination with config.consent { marketing: true }, revoking marketing pushes disableLinkTracking, so the tracker stops sending link clicks on its own.',
  command: 'consent',
  in: { marketing: false },
  out: [['window._paq.push', ['disableLinkTracking']]],
};
