import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * Output convention:
 *   - Single SDK call: out = [['pintrk', 'track', 'checkout', { ... }]]
 *   - Multiple SDK calls: out = [['pintrk', ...], ['pintrk', ...]]
 *   - Zero SDK calls: out = []
 */

/**
 * Default event forwarding - no rule. Without a mapping.name, the walkerOS
 * event name is forwarded as-is. Pinterest accepts it but won't match a
 * standard conversion event. event_id is auto-attached for deduplication.
 */
export const defaultForward: Flow.StepExample = {
  title: 'Default forward',
  description:
    'Without a mapping the walker event name is forwarded as-is to pintrk track with an event_id for dedup.',
  in: getEvent('page view', { timestamp: 1700000100, id: 'ev-1700000100' }),
  mapping: undefined,
  out: [['pintrk', 'track', 'page view', { event_id: 'ev-1700000100' }]],
};

/**
 * Wildcard ignore pattern - the standard walkerOS way to suppress noisy
 * events. `mapping.ignore: true` at rule level produces zero SDK calls.
 */
export const wildcardIgnored: Flow.StepExample = {
  public: false,
  in: getEvent('debug noise', { timestamp: 1700000101 }),
  mapping: { ignore: true },
  out: [],
};

/**
 * Standard Pinterest event rename via mapping.name. walkerOS "page view"
 * → Pinterest "pagevisit". The ONLY way to get Pinterest to recognize
 * a conversion event - the destination never auto-maps.
 */
export const pageViewRename: Flow.StepExample = {
  title: 'Page visit',
  description:
    'A mapping renames the walker event to the Pinterest standard pagevisit event for conversion tracking.',
  in: getEvent('page view', { timestamp: 1700000102, id: 'ev-1700000102' }),
  mapping: { name: 'pagevisit' },
  out: [['pintrk', 'track', 'pagevisit', { event_id: 'ev-1700000102' }]],
};

/**
 * Search - walkerOS site search → Pinterest "search" with search_query.
 * Illustrates single-field mapping.data resolution.
 */
export const siteSearch: Flow.StepExample = {
  title: 'Search',
  description:
    'A site search fires Pinterest search with the search_query field resolved from event data.',
  in: getEvent('site search', {
    timestamp: 1700000103,
    id: 'ev-1700000103',
    data: { query: 'leather jacket' },
  }),
  mapping: {
    name: 'search',
    data: {
      map: {
        search_query: 'data.query',
      },
    },
  },
  out: [
    [
      'pintrk',
      'track',
      'search',
      {
        search_query: 'leather jacket',
        event_id: 'ev-1700000103',
      },
    ],
  ],
};

/**
 * Single-product viewcontent.
 */
export const productViewContent: Flow.StepExample = {
  title: 'View content',
  description:
    'A product view fires Pinterest viewcontent with value, currency, product_id, and product_name.',
  in: getEvent('product view', {
    timestamp: 1700000104,
    id: 'ev-1700000104',
  }),
  mapping: {
    name: 'viewcontent',
    data: {
      map: {
        value: 'data.price',
        currency: { key: 'data.currency', value: 'EUR' },
        product_id: 'data.id',
        product_name: 'data.color',
      },
    },
  },
  out: [
    [
      'pintrk',
      'track',
      'viewcontent',
      {
        value: 420,
        currency: 'EUR',
        product_id: 'ers',
        product_name: 'black',
        event_id: 'ev-1700000104',
      },
    ],
  ],
};

/**
 * Add-to-cart with an inline line_items array.
 */
export const productAddToCart: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A product add fires Pinterest addtocart with value, currency, and a single-item line_items array.',
  in: getEvent('product add', {
    timestamp: 1700000105,
    id: 'ev-1700000105',
  }),
  mapping: {
    name: 'addtocart',
    data: {
      map: {
        value: 'data.price',
        order_quantity: { value: 1 },
        currency: { key: 'data.currency', value: 'EUR' },
        line_items: {
          set: [
            {
              map: {
                product_id: 'data.id',
                product_name: 'data.color',
                product_price: 'data.price',
                product_quantity: { value: 1 },
              },
            },
          ],
        },
      },
    },
  },
  out: [
    [
      'pintrk',
      'track',
      'addtocart',
      {
        value: 420,
        order_quantity: 1,
        currency: 'EUR',
        line_items: [
          {
            product_id: 'ers',
            product_name: 'black',
            product_price: 420,
            product_quantity: 1,
          },
        ],
        event_id: 'ev-1700000105',
      },
    ],
  ],
};

/**
 * Multi-product checkout - the canonical Pinterest ecommerce pattern.
 */
export const orderCompleteCheckout: Flow.StepExample = {
  title: 'Checkout',
  description:
    'A completed order fires Pinterest checkout with value, order_id, currency, and a nested line_items array.',
  in: getEvent('order complete', {
    timestamp: 1700000106,
    id: 'ev-1700000106',
  }),
  mapping: {
    name: 'checkout',
    data: {
      map: {
        value: 'data.total',
        order_id: 'data.id',
        currency: { key: 'data.currency', value: 'EUR' },
        line_items: {
          loop: [
            'nested',
            {
              condition: (value: unknown) => {
                const v = value as { data?: { price?: unknown } };
                return typeof v?.data?.price === 'number';
              },
              map: {
                product_id: 'data.id',
                product_name: 'data.color',
                product_price: 'data.price',
                product_quantity: { value: 1 },
              },
            },
          ],
        },
      },
    },
  },
  out: [
    [
      'pintrk',
      'track',
      'checkout',
      {
        value: 555,
        order_id: '0rd3r1d',
        currency: 'EUR',
        line_items: [
          {
            product_id: 'ers',
            product_name: 'black',
            product_price: 420,
            product_quantity: 1,
          },
          {
            product_id: 'cc',
            product_price: 42,
            product_quantity: 1,
          },
        ],
        event_id: 'ev-1700000106',
      },
    ],
  ],
};

/**
 * Lead conversion with per-event enhanced matching update.
 */
export const userLoginLead: Flow.StepExample = {
  title: 'Lead with matching',
  description:
    'A user login fires pintrk set for enhanced matching and then a lead conversion track call.',
  in: getEvent('user login', {
    timestamp: 1700000107,
    id: 'ev-1700000107',
    data: {
      id: 'usr_123',
      email: 'jane@example.com',
    },
  }),
  mapping: {
    name: 'lead',
    settings: {
      identify: {
        map: {
          em: 'data.email',
          external_id: 'data.id',
        },
      },
    },
    data: {
      map: {
        lead_type: { value: 'login' },
      },
    },
  },
  out: [
    ['pintrk', 'set', { em: 'jane@example.com', external_id: 'usr_123' }],
    [
      'pintrk',
      'track',
      'lead',
      {
        lead_type: 'login',
        event_id: 'ev-1700000107',
      },
    ],
  ],
};

/**
 * mapping.silent - processes side effects (identify set) but suppresses
 * the default pintrk('track', ...) call.
 */
export const identifyOnlySilent: Flow.StepExample = {
  title: 'Identify only',
  description:
    'A user update fires pintrk set for enhanced matching without a track call via mapping silent.',
  in: getEvent('user update', {
    timestamp: 1700000108,
    id: 'ev-1700000108',
    data: {
      id: 'usr_456',
      email: 'new@example.com',
    },
  }),
  mapping: {
    silent: true,
    settings: {
      identify: {
        map: {
          em: 'data.email',
          external_id: 'data.id',
        },
      },
    },
  },
  out: [['pintrk', 'set', { em: 'new@example.com', external_id: 'usr_456' }]],
};

/**
 * Consent revocation - walkerOS walker consent { marketing: false }.
 * The destination's on('consent') handler flips the runtime state flag
 * and stops calling pintrk('track', ...) for subsequent events.
 */
export const consentRevoke: Flow.StepExample = {
  public: false,
  command: 'consent',
  in: { marketing: false } as WalkerOS.Consent,
  out: [],
};

/**
 * Consent grant - explicit opt-in.
 */
export const consentGrant: Flow.StepExample = {
  public: false,
  command: 'consent',
  in: { marketing: true } as WalkerOS.Consent,
  out: [],
};
