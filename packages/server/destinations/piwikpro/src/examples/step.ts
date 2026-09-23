import type {
  Flow,
  Mapping as WalkerOSMapping,
  WalkerOS,
} from '@walkeros/core';
import type { Hit, Rule, Settings } from '../types';
import { getEvent, isObject } from '@walkeros/core';

// Build-time version define, sent as ts_v on every hit.
declare const __VERSION__: string;

/**
 * Piwik PRO server step examples.
 *
 * Every event becomes one `sendServer(url, body, options)` call to
 * `${settings.url}ppms.php`. The body is the Tracking API bulk format,
 * `{"requests": ["?idsite=...", ...]}`, one request string per hit (a goal adds
 * a second hit to the same request). Parameters follow a fixed order: common,
 * method, dimensions, context, then the anonymous flags.
 *
 * The test runner registers the destination with
 * `{ url: 'https://your_account_name.piwik.pro/', appId: APP_ID }`, merges an
 * example's optional `settings` on top, and pushes `in` without ingest. So
 * cip, ua and lang stay empty, and every context value below comes from the
 * event: a web relay (platform web, its own trace) with the default user.
 */
export type StepExample = Flow.StepExample & {
  in: WalkerOS.Event;
  mapping?: Rule;
  /** Destination settings merged over the runner's url and appId. */
  settings?: Partial<Settings>;
};

const ENDPOINT = 'https://your_account_name.piwik.pro/ppms.php';
const APP_ID = 'e8f3a1c2-0b4d-4e5f-9a6b-7c8d9e0f1a2b';
const GOAL_ID = '6a0f4c1e-3b2d-4e8f-a7c9-1d2e3f4a5b6c';
const PAGE_URL = 'https://www.example.com/';
const TIMESTAMP = 1700000300000;

const SOURCE = {
  type: 'browser',
  platform: 'web',
  url: PAGE_URL,
  referrer: 'https://www.walkeros.io/',
};

const COMMON: Hit = [
  ['idsite', APP_ID],
  ['rec', '1'],
  ['send_image', '0'],
  ['ts_n', 'walkerOS'],
  ['ts_v', __VERSION__],
];

/** Context of an identified hit; _id is the 16 hex sha256 of the device id c00k13. */
const IDENTIFIED: Hit = [
  ['url', PAGE_URL],
  ['urlref', 'https://www.walkeros.io/'],
  ['_id', 'cc8e27118413234d'],
  ['uid', 'us3r'],
  ['pv_id', '0a1b2c'],
  ['cdt', '1700000300'],
];

function event(
  name: string,
  props: WalkerOS.DeepPartialEvent = {},
): WalkerOS.Event {
  return getEvent(name, { timestamp: TIMESTAMP, source: SOURCE, ...props });
}

/** The one sendServer call for these hits, each already in parameter order. */
function send(...hits: Hit[]): Flow.StepOut {
  const requests = hits.map((hit) => `?${new URLSearchParams(hit).toString()}`);
  return [
    ['sendServer', ENDPOINT, JSON.stringify({ requests }), { timeout: 5000 }],
  ];
}

/** Common parameters, method parameters, then the identified context. */
function hit(...params: Hit): Hit {
  return [...COMMON, ...params, ...IDENTIFIED];
}

/** The web destination's product mapping, without the currency argument. */
const productMap: WalkerOSMapping.ValueConfig = {
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
};

const nestedProducts: WalkerOSMapping.ValueConfig = {
  loop: [
    'nested',
    {
      condition: (entity: unknown) =>
        isObject(entity) && entity.entity === 'product',
      ...productMap,
    },
  ],
};

const ERS = '["ers","Everyday Ruck Snack",null,420,1,null,"black",{"1":"l"}]';
const CC = '["cc","Cool Cap",null,42,1,null,null,{"1":"one size"}]';

export const pageView: StepExample = {
  title: 'Page view',
  description:
    'A page view becomes a trackPageView hit with the page title as action_name and the page context.',
  in: event('page view'),
  mapping: {
    data: 'data.title',
  },
  out: send(hit(['action_name', 'walkerOS documentation'])),
};

export const pageViewWithGoal: StepExample = {
  title: 'Page view with goal',
  description:
    'A page view rule with a goalId still tracks the page view and adds a trackGoal hit to the same request.',
  in: event('page view'),
  mapping: {
    settings: { goalId: GOAL_ID },
  },
  out: send(
    hit(['action_name', 'walkerOS documentation']),
    hit(['idgoal', GOAL_ID]),
  ),
};

export const customEvent: StepExample = {
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
  out: send(
    hit(
      ['e_c', 'promotion'],
      ['e_a', 'visible'],
      ['e_n', 'Setting up tracking easily'],
    ),
  ),
};

export const eventWithGoalValue: StepExample = {
  title: 'Event with goal value',
  description:
    'An order event tracks a custom event and a goal conversion whose revenue resolves from the order total.',
  in: event('order complete'),
  mapping: {
    name: 'trackEvent',
    settings: { goalId: GOAL_ID, goalValue: 'data.total' },
    data: {
      set: [{ value: 'order' }, { value: 'complete' }, 'data.id', 'data.total'],
    },
  },
  out: send(
    hit(
      ['e_c', 'order'],
      ['e_a', 'complete'],
      ['e_n', '0rd3r1d'],
      ['e_v', '555'],
    ),
    hit(['idgoal', GOAL_ID], ['revenue', '555']),
  ),
};

export const customDimensions: StepExample = {
  title: 'Custom dimensions',
  description:
    'Destination and rule custom dimensions, keyed by bare id, are sent as dimension parameters on the hit.',
  public: false,
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
  out: send(
    hit(
      ['e_c', 'product'],
      ['e_a', 'view'],
      ['e_n', 'Everyday Ruck Snack'],
      ['dimension1', 'shop'],
      ['dimension2', 'black'],
    ),
  ),
};

export const siteSearch: StepExample = {
  title: 'Site search',
  description:
    'A search event maps to trackSiteSearch with keyword, category and result count.',
  in: event('search submit', {
    data: { query: 'rucksack', category: 'bags', results: 12 },
  }),
  mapping: {
    name: 'trackSiteSearch',
    data: {
      set: ['data.query', 'data.category', 'data.results'],
    },
  },
  out: send(
    hit(
      ['search', 'rucksack'],
      ['search_cats', '["bags"]'],
      ['search_count', '12'],
    ),
  ),
};

export const trackLink: StepExample = {
  title: 'Download link',
  description:
    'A tagged download maps to trackLink, which sends the file address as download and as the hit url.',
  in: event('file download', {
    data: { url: 'https://www.example.com/whitepaper.pdf' },
  }),
  mapping: {
    name: 'trackLink',
    data: {
      set: ['data.url', { value: 'download' }],
    },
  },
  out: send([
    ...COMMON,
    ['download', 'https://www.example.com/whitepaper.pdf'],
    ['url', 'https://www.example.com/whitepaper.pdf'],
    ...IDENTIFIED.filter(([key]) => key !== 'url'),
  ]),
};

export const ping: StepExample = {
  title: 'Ping',
  description:
    'A heartbeat event maps to ping, which extends the session without counting as a page view.',
  in: event('page ping'),
  mapping: {
    name: 'ping',
  },
  out: send(hit(['ping', '6'])),
};

export const ecommerceProductDetailView: StepExample = {
  title: 'Product detail view',
  description:
    'A product view maps to ecommerceProductDetailView with the product as a single-item array.',
  in: event('product view'),
  mapping: {
    name: 'ecommerceProductDetailView',
    data: {
      set: [{ set: [productMap] }],
    },
  },
  out: send(hit(['e_t', 'product-detail-view'], ['ec_products', `[${ERS}]`])),
};

export const ecommerceAddToCart: StepExample = {
  title: 'Add to cart',
  description:
    'A product add maps to ecommerceAddToCart with the added product.',
  in: event('product add'),
  mapping: {
    name: 'ecommerceAddToCart',
    data: {
      set: [{ set: [productMap] }],
    },
  },
  out: send(hit(['e_t', 'add-to-cart'], ['ec_products', `[${ERS}]`])),
};

export const ecommerceRemoveFromCart: StepExample = {
  title: 'Remove from cart',
  description:
    'A product remove maps to ecommerceRemoveFromCart with the removed product.',
  in: event('product remove', {
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
      set: [{ set: [productMap] }],
    },
  },
  out: send(hit(['e_t', 'remove-from-cart'], ['ec_products', `[${ERS}]`])),
};

export const ecommerceCartUpdate: StepExample = {
  title: 'Cart update',
  description:
    'A cart view maps to ecommerceCartUpdate with the cart products and the cart total as revenue.',
  in: event('cart view'),
  mapping: {
    name: 'ecommerceCartUpdate',
    data: {
      set: [nestedProducts, 'data.value'],
    },
  },
  out: send(
    hit(
      ['e_t', 'cart-update'],
      ['ec_products', `[${ERS}]`],
      ['revenue', '840'],
    ),
  ),
};

export const ecommerceOrder: StepExample = {
  title: 'Ecommerce order',
  description:
    'A completed order maps to ecommerceOrder with its products, order id, total, tax and shipping.',
  in: event('order complete'),
  mapping: {
    name: 'ecommerceOrder',
    data: {
      set: [
        nestedProducts,
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
  out: send(
    hit(
      ['e_t', 'order'],
      ['ec_id', '0rd3r1d'],
      ['revenue', '555'],
      ['ec_tx', '73.76'],
      ['ec_sh', '5.22'],
      ['ec_products', `[${ERS},${CC}]`],
    ),
  ),
};

export const anonymous: StepExample = {
  title: 'Anonymous hit',
  description:
    'With identified false the hit is anonymous: uia and dda are set, and the visitor and user ids are dropped.',
  public: false,
  in: event('page view'),
  settings: { identified: false },
  out: send([
    ...COMMON,
    ['action_name', 'walkerOS documentation'],
    ...IDENTIFIED.filter(([key]) => key !== '_id' && key !== 'uid'),
    ['uia', '1'],
    ['dda', '1'],
  ]),
};

export const unmappedSkip: StepExample = {
  title: 'Unmapped event',
  description:
    'An event without a rule name that is not a page view is skipped, so nothing is sent.',
  public: false,
  in: event('promotion visible'),
  out: [],
};
