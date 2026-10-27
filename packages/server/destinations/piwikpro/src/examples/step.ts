import type {
  Flow,
  Mapping as WalkerOSMapping,
  StandardEventName,
  WalkerOS,
} from '@walkeros/core';
import type { Rule, Settings } from '../types';
import { createEvent, getEvent } from '@walkeros/core';

// Build-time version define, sent as ts_v on every hit.
declare const __VERSION__: string;

/**
 * Piwik PRO server step examples.
 *
 * Every event becomes one `sendServer(url, body, options)` call to
 * `${settings.url}ppms.php`. The body is the Tracking API bulk format,
 * `{"requests": ["?idsite=...", ...]}`, one query string per hit (a goal adds
 * a second hit to the same request). Parameters follow a fixed order: common,
 * method, dimensions, context, then the anonymous flags. Each query string
 * below is written out as sent, form-encoded.
 *
 * The examples run with `{ url: 'https://your_account_name.piwik.pro/',
 * appId: APP_ID }`, an example's optional `settings` merged on top. Each input
 * is a browser event relayed to the server: its page url and referrer, its
 * trace, and the request's IP and user agent on `user` (read by default when
 * no ingest carries them).
 *
 * Functions in mappings are published as source code, so they must not use
 * imported helpers.
 */
export type StepExample = Flow.StepExample & {
  in: WalkerOS.Event;
  mapping?: Rule;
  /** Destination settings merged over the url and appId. */
  settings?: Partial<Settings>;
};

const ENDPOINT = 'https://your_account_name.piwik.pro/ppms.php';
const OPTIONS = { timeout: 5000 };
const GOAL_ID = '6a0f4c1e-3b2d-4e8f-a7c9-1d2e3f4a5b6c';

const SOURCE = {
  type: 'browser',
  platform: 'web',
  url: 'https://www.example.com/',
  referrer: 'https://www.walkeros.io/',
};

const USER = {
  id: 'us3r',
  device: 'c00k13',
  session: 's3ss10n',
  ip: '192.0.2.1',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
};

/** Common parameters of every hit, as sent. */
const COMMON = `idsite=e8f3a1c2-0b4d-4e5f-9a6b-7c8d9e0f1a2b&rec=1&send_image=0&ts_n=walkerOS&ts_v=${__VERSION__}`;

/**
 * Context of an identified hit of the relayed event, as sent: _id is the
 * 16 hex sha256 of the device id c00k13, pv_id the trace's first 6 hex.
 */
const CONTEXT =
  'url=https%3A%2F%2Fwww.example.com%2F&urlref=https%3A%2F%2Fwww.walkeros.io%2F&cip=192.0.2.1&ua=Mozilla%2F5.0+%28Windows+NT+10.0%3B+Win64%3B+x64%29&_id=cc8e27118413234d&uid=us3r&pv_id=0a1b2c&cdt=1700000000';

/** ec_products of the one product ers, as sent. */
const ERS =
  '%5B%5B%22ers%22%2C%22Everyday+Ruck+Snack%22%2Cnull%2C420%2C1%2Cnull%2C%22black%22%2C%7B%221%22%3A%22l%22%7D%5D%5D';

function event(
  name: StandardEventName,
  props: WalkerOS.DeepPartialEvent = {},
): WalkerOS.Event {
  return getEvent(name, { source: SOURCE, user: USER, ...props });
}

/** An event outside the standard set, with the same source and user. */
function otherEvent(
  name: string,
  props: WalkerOS.DeepPartialEvent = {},
): WalkerOS.Event {
  return createEvent({ source: SOURCE, user: USER, ...props, name });
}

/** The web destination's product mapping. */
const productMap: WalkerOSMapping.ValueConfig = {
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
};

const currencyCode: WalkerOSMapping.ValueConfig = {
  map: { currencyCode: { key: 'data.currency', value: 'EUR' } },
};

export const pageView: StepExample = {
  title: 'Page view',
  description:
    'A page view becomes a trackPageView hit with the page title as action_name and the page, client and visitor context.',
  in: event('page view'),
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        requests: [`?${COMMON}&action_name=walkerOS+documentation&${CONTEXT}`],
      }),
      OPTIONS,
    ],
  ],
};

export const ecommerceProductDetailView: StepExample = {
  title: 'Product detail view',
  description:
    'A product view maps to ecommerceProductDetailView with the product and its currency, sent as ec_products and cur.',
  in: event('product view'),
  mapping: {
    name: 'ecommerceProductDetailView',
    data: {
      set: [{ set: [productMap] }, currencyCode],
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        requests: [
          `?${COMMON}&e_t=product-detail-view&ec_products=${ERS}&cur=EUR&${CONTEXT}`,
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const ecommerceAddToCart: StepExample = {
  title: 'Add to cart',
  description:
    'A product add maps to ecommerceAddToCart with the added product and its currency.',
  in: event('product add'),
  mapping: {
    name: 'ecommerceAddToCart',
    data: {
      set: [{ set: [productMap] }, currencyCode],
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        requests: [
          `?${COMMON}&e_t=add-to-cart&ec_products=${ERS}&cur=EUR&${CONTEXT}`,
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const ecommerceOrder: StepExample = {
  title: 'Ecommerce order',
  description:
    'A completed order maps to ecommerceOrder with its products, order id, grand total, tax, shipping and currency.',
  in: event('order complete'),
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
              ...productMap,
            },
          ],
        },
        {
          map: {
            orderId: 'data.id',
            grandTotal: ['data.total', 'data.value'],
            tax: 'data.tax',
            shipping: 'data.shipping',
          },
        },
        currencyCode,
      ],
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        requests: [
          `?${COMMON}&e_t=order&ec_id=0rd3r1d&revenue=467.22&ec_tx=73.76&ec_sh=5.22&ec_products=%5B%5B%22ers%22%2C%22Everyday+Ruck+Snack%22%2Cnull%2C420%2C1%2Cnull%2C%22black%22%2C%7B%221%22%3A%22l%22%7D%5D%2C%5B%22cc%22%2C%22Cool+Cap%22%2Cnull%2C42%2C1%2Cnull%2Cnull%2C%7B%221%22%3A%22one+size%22%7D%5D%5D&cur=EUR&${CONTEXT}`,
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const pageViewWithGoal: StepExample = {
  public: false,
  title: 'Page view with goal',
  description:
    'A page view rule with a goalId still tracks the page view and adds a trackGoal hit to the same request.',
  in: event('page view'),
  mapping: {
    settings: { goalId: GOAL_ID },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        requests: [
          `?${COMMON}&action_name=walkerOS+documentation&${CONTEXT}`,
          `?${COMMON}&idgoal=${GOAL_ID}&${CONTEXT}`,
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const customEvent: StepExample = {
  public: false,
  title: 'Custom event',
  description:
    'A promotion visible event maps to trackEvent with category, action and name as positional arguments.',
  in: event('promotion visible'),
  mapping: {
    name: 'trackEvent',
    data: {
      set: [{ value: 'promotion' }, { value: 'visible' }, 'data.name'],
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        requests: [
          `?${COMMON}&e_c=promotion&e_a=visible&e_n=Setting+up+tracking+easily&${CONTEXT}`,
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const eventWithGoalValue: StepExample = {
  public: false,
  title: 'Event with goal value',
  description:
    'An order event tracks a custom event and a goal conversion whose revenue resolves from the order total.',
  in: event('order complete'),
  mapping: {
    name: 'trackEvent',
    settings: { goalId: GOAL_ID, goalValue: 'data.value' },
    data: {
      set: [{ value: 'order' }, { value: 'complete' }, 'data.id', 'data.value'],
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        requests: [
          `?${COMMON}&e_c=order&e_a=complete&e_n=0rd3r1d&e_v=462&${CONTEXT}`,
          `?${COMMON}&idgoal=${GOAL_ID}&revenue=462&${CONTEXT}`,
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const customDimensions: StepExample = {
  public: false,
  title: 'Custom dimensions',
  description:
    'Destination and rule custom dimensions, keyed by bare id, are sent as dimension parameters on the hit.',
  in: event('product view'),
  settings: {
    customDimensions: { '1': 'globals.pagegroup' },
  },
  mapping: {
    name: 'trackEvent',
    settings: { customDimensions: { '2': 'data.color' } },
    data: {
      set: [{ value: 'product' }, { value: 'view' }, 'data.name'],
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        requests: [
          `?${COMMON}&e_c=product&e_a=view&e_n=Everyday+Ruck+Snack&dimension1=shop&dimension2=black&${CONTEXT}`,
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const siteSearch: StepExample = {
  public: false,
  title: 'Site search',
  description:
    'A search event maps to trackSiteSearch with keyword, category and result count.',
  in: otherEvent('search submit', {
    data: { term: 'rucksack', category: 'bags', results: 12 },
  }),
  mapping: {
    name: 'trackSiteSearch',
    data: {
      set: ['data.term', 'data.category', 'data.results'],
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        requests: [
          `?${COMMON}&search=rucksack&search_cats=%5B%22bags%22%5D&search_count=12&${CONTEXT}`,
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const trackLink: StepExample = {
  public: false,
  title: 'Download link',
  description:
    'A tagged download maps to trackLink, which sends the file address as download and as the hit url.',
  in: otherEvent('file download', {
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
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        requests: [
          `?${COMMON}&download=https%3A%2F%2Fwww.example.com%2Fwhitepaper.pdf&url=https%3A%2F%2Fwww.example.com%2Fwhitepaper.pdf&urlref=https%3A%2F%2Fwww.walkeros.io%2F&cip=192.0.2.1&ua=Mozilla%2F5.0+%28Windows+NT+10.0%3B+Win64%3B+x64%29&_id=cc8e27118413234d&uid=us3r&pv_id=0a1b2c&cdt=1700000000`,
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const ping: StepExample = {
  public: false,
  title: 'Ping',
  description:
    'A heartbeat event maps to ping, which extends the session without counting as a page view.',
  in: otherEvent('page ping'),
  mapping: {
    name: 'ping',
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({ requests: [`?${COMMON}&ping=6&${CONTEXT}`] }),
      OPTIONS,
    ],
  ],
};

export const ecommerceRemoveFromCart: StepExample = {
  public: false,
  title: 'Remove from cart',
  description:
    'A product remove maps to ecommerceRemoveFromCart with the removed product and its currency.',
  in: otherEvent('product remove', {
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
      set: [{ set: [productMap] }, currencyCode],
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        requests: [
          `?${COMMON}&e_t=remove-from-cart&ec_products=${ERS}&cur=EUR&${CONTEXT}`,
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const ecommerceCartUpdate: StepExample = {
  public: false,
  title: 'Cart update',
  description:
    'A cart view maps to ecommerceCartUpdate with the cart products, the cart total as revenue and the currency.',
  in: event('cart view'),
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
              ...productMap,
            },
          ],
        },
        'data.value',
        currencyCode,
      ],
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        requests: [
          `?${COMMON}&e_t=cart-update&ec_products=%5B%5B%22ers%22%2C%22Everyday+Ruck+Snack%22%2Cnull%2C420%2C2%2Cnull%2C%22black%22%2C%7B%221%22%3A%22l%22%7D%5D%5D&revenue=840&cur=EUR&${CONTEXT}`,
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const anonymous: StepExample = {
  public: false,
  title: 'Anonymous hit',
  description:
    'With identified false the hit is anonymous: uia and dda are set, and the visitor and user ids are dropped.',
  in: event('page view'),
  settings: { identified: false },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        requests: [
          `?${COMMON}&action_name=walkerOS+documentation&url=https%3A%2F%2Fwww.example.com%2F&urlref=https%3A%2F%2Fwww.walkeros.io%2F&cip=192.0.2.1&ua=Mozilla%2F5.0+%28Windows+NT+10.0%3B+Win64%3B+x64%29&pv_id=0a1b2c&cdt=1700000000&uia=1&dda=1`,
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const unmappedEvent: StepExample = {
  public: false,
  title: 'Unmapped event',
  description:
    'An event without a rule name that is not a page view has nothing to send: the push fails with missing-input. To keep such events out without a failure, ignore them with a rule.',
  in: event('promotion visible'),
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

export const silentRule: StepExample = {
  public: false,
  title: 'Silent rule',
  description:
    'A rule with silent: true and no goal sends no request: nothing is left to send, and that is not a failure.',
  in: event('page view'),
  mapping: { silent: true },
  out: [],
};

export const missingUrl: StepExample = {
  public: false,
  title: 'Event without a page url',
  description:
    'An event without a page url cannot become a Tracking API request: the push fails with missing-input instead of counting as delivered.',
  in: event('page view', { source: { type: 'collector' } }),
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

/**
 * The event of a mapped example without the data its rule reads: Piwik PRO
 * cannot build the request, so the push fails with missing-input instead of
 * counting as delivered.
 */
function withoutInput(target: StepExample): StepExample {
  const { name } = target.in;
  return {
    title: `${target.title ?? name} without input`,
    description: `A ${name} event without the data its rule reads cannot become a Tracking API request: the push fails with missing-input instead of counting as delivered.`,
    public: false,
    in: { ...target.in, data: {}, user: {}, globals: {}, context: {} },
    mapping: target.mapping,
    out: [],
    outcome: { status: 'failed', code: 'missing-input', retryable: false },
  };
}

export const siteSearchWithoutInput = withoutInput(siteSearch);
export const trackLinkWithoutInput = withoutInput(trackLink);
export const productViewWithoutInput = withoutInput(ecommerceProductDetailView);
export const addToCartWithoutInput = withoutInput(ecommerceAddToCart);
export const removeFromCartWithoutInput = withoutInput(ecommerceRemoveFromCart);
export const cartUpdateWithoutInput = withoutInput(ecommerceCartUpdate);
export const orderWithoutInput = withoutInput(ecommerceOrder);
