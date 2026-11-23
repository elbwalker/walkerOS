import type {
  Flow,
  Mapping as WalkerOSMapping,
  StandardEventName,
  WalkerOS,
} from '@walkeros/core';
import type { Rule, Settings } from '../types';
import { createEvent, getEvent } from '@walkeros/core';

/**
 * Matomo server step examples.
 *
 * Every event becomes one `sendServer(endpoint, body, options)` call to
 * `https://matomo.example.com/matomo.php`. The body is the HTTP Tracking API
 * bulk format, `{"requests": ["?idsite=...", ...]}`, one query string per hit
 * (a goal adds a second hit to the same request). Parameters follow a fixed
 * order: idsite, rec, apiv, the method's parameters, dimensions, then the
 * context (url, urlref, res, lang, ua, cip, cid, uid, pv_id, cdt). Each query
 * string below is written out as sent, form-encoded.
 *
 * The examples run with `{ url: 'https://matomo.example.com/', siteId: '1' }`,
 * an example's optional `settings` merged on top. Each input is a browser
 * event relayed to the server: its page url and referrer, its trace, and the
 * visitor's device id and screen size on `user`. The visitor's IP and user
 * agent on `user` are sent only where an example sets ip and userAgent.
 *
 * Functions in mappings and settings are published as source code, so they
 * must not use imported helpers.
 */
export type StepExample = Flow.StepExample & {
  in: WalkerOS.Event;
  mapping?: Rule;
  /** Destination settings merged over the url and siteId. */
  settings?: Partial<Settings>;
};

const ENDPOINT = 'https://matomo.example.com/matomo.php';
const OPTIONS = { timeout: 10000 };

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
  screenSize: '1920x1080',
};

/** The parameters every hit starts with, as sent. */
const COMMON = 'idsite=1&rec=1&apiv=1';

/**
 * Context of a hit of the relayed event, as sent: cid is the 16 hex sha256
 * of the device id c00k13, pv_id the trace's first 6 hex, cdt the event time
 * in seconds. No cip, ua or uid without the ip, userAgent and userId settings.
 */
const CONTEXT =
  'url=https%3A%2F%2Fwww.example.com%2F&urlref=https%3A%2F%2Fwww.walkeros.io%2F&res=1920x1080&cid=cc8e27118413234d&pv_id=0a1b2c&cdt=1700000000';

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

/** One sendServer call to the endpoint with these request strings. */
function call(requests: string[], endpoint = ENDPOINT): Flow.StepEffect {
  return ['sendServer', endpoint, JSON.stringify({ requests }), OPTIONS];
}

/** The order and cart items: every nested product, as Matomo's items. */
const items: WalkerOSMapping.ValueConfig = {
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
        category: 'data.category',
        price: 'data.price',
        quantity: 'data.quantity',
      },
    },
  ],
};

export const pageView: StepExample = {
  title: 'Page view',
  description:
    'A page view becomes a trackPageView hit with the page title as action_name and the page and visitor context.',
  in: event('page view'),
  out: [call([`?${COMMON}&action_name=walkerOS+documentation&${CONTEXT}`])],
};

export const pageViewWithGoal: StepExample = {
  public: false,
  title: 'Page view with goal',
  description:
    'A page view rule with a goalId still tracks the page view and adds a goal hit to the same request.',
  in: event('page view'),
  mapping: {
    settings: { goalId: 3 },
  },
  out: [
    call([
      `?${COMMON}&action_name=walkerOS+documentation&${CONTEXT}`,
      `?${COMMON}&idgoal=3&${CONTEXT}`,
    ]),
  ],
};

export const productView: StepExample = {
  title: 'Product view',
  description:
    "A product view becomes the product page's page view with the product fields, as Matomo records it; the page's plain page view is skipped (pageViewOnProductPage).",
  in: event('product view', {
    data: {
      id: 'ers',
      name: 'Everyday Ruck Snack',
      category: 'Backpacks',
      color: 'black',
      size: 'l',
      price: 420,
      currency: 'EUR',
    },
  }),
  mapping: {
    name: 'trackPageView',
    data: { set: ['data.name'] },
    settings: {
      ecommerceView: {
        map: {
          sku: 'data.id',
          name: 'data.name',
          category: 'data.category',
          price: 'data.price',
        },
      },
    },
  },
  out: [
    call([
      `?${COMMON}&action_name=Everyday+Ruck+Snack&_pks=ers&_pkn=Everyday+Ruck+Snack&_pkc=Backpacks&_pkp=420&${CONTEXT}`,
    ]),
  ],
};

export const pageViewOnProductPage: StepExample = {
  public: false,
  title: 'Page view on a product page',
  description:
    "On a product page the plain page view is skipped, so the product view sends the page's one page view, as Matomo's ecommerce FAQ advises for data-layer setups.",
  in: event('page view', { globals: { pagetype: 'product' } }),
  mapping: {
    condition: (_, context) => context.event.globals?.pagetype === 'product',
    ignore: true,
  },
  out: [],
};

export const cartView: StepExample = {
  title: 'Cart view',
  description:
    'A cart view maps to trackEcommerceCartUpdate with the cart total as revenue and the cart products as ec_items.',
  in: event('cart view'),
  mapping: {
    name: 'trackEcommerceCartUpdate',
    data: { set: ['data.value'] },
    settings: { items },
  },
  out: [
    call([
      `?${COMMON}&idgoal=0&revenue=840&ec_items=%5B%5B%22ers%22%2C%22Everyday+Ruck+Snack%22%2C%22%22%2C420%2C2%5D%5D&${CONTEXT}`,
    ]),
  ],
};

export const orderComplete: StepExample = {
  title: 'Order complete',
  description:
    'A completed order maps to trackEcommerceOrder with its order ID, grand total, subtotal, tax and shipping, and the ordered products as ec_items.',
  in: event('order complete'),
  mapping: {
    name: 'trackEcommerceOrder',
    data: {
      set: ['data.id', 'data.total', 'data.value', 'data.tax', 'data.shipping'],
    },
    settings: { items },
  },
  out: [
    call([
      `?${COMMON}&idgoal=0&ec_id=0rd3r1d&revenue=467.22&ec_st=462&ec_tx=73.76&ec_sh=5.22&ec_items=%5B%5B%22ers%22%2C%22Everyday+Ruck+Snack%22%2C%22%22%2C420%2C1%5D%2C%5B%22cc%22%2C%22Cool+Cap%22%2C%22%22%2C42%2C1%5D%5D&${CONTEXT}`,
    ]),
  ],
};

export const customEvent: StepExample = {
  public: false,
  title: 'Custom event',
  description:
    'A video play maps to trackEvent with the entity as category, the action, the video title as name and the seconds watched as value.',
  in: otherEvent('video play', {
    data: { title: 'walkerOS in 60 seconds', seconds: 30 },
  }),
  mapping: {
    name: 'trackEvent',
    data: { set: ['entity', 'action', 'data.title', 'data.seconds'] },
  },
  out: [
    call([
      `?${COMMON}&e_c=video&e_a=play&e_n=walkerOS+in+60+seconds&e_v=30&${CONTEXT}`,
    ]),
  ],
};

export const siteSearch: StepExample = {
  public: false,
  title: 'Site search',
  description:
    'A search maps to trackSiteSearch with the keyword, the search category and the result count.',
  in: otherEvent('search submit', {
    data: { term: 'rucksack', category: 'bags', results: 12 },
  }),
  mapping: {
    name: 'trackSiteSearch',
    data: { set: ['data.term', 'data.category', 'data.results'] },
  },
  out: [
    call([
      `?${COMMON}&search=rucksack&search_cat=bags&search_count=12&${CONTEXT}`,
    ]),
  ],
};

export const outlink: StepExample = {
  public: false,
  title: 'Outlink',
  description:
    'A tagged link click maps to trackLink with the link address and the type link; the server cannot track outlinks on its own.',
  in: otherEvent('link click', {
    data: { href: 'https://github.com/elbwalker/walkerOS' },
  }),
  mapping: {
    name: 'trackLink',
    data: { set: ['data.href', { value: 'link' }] },
  },
  out: [
    call([
      `?${COMMON}&link=https%3A%2F%2Fgithub.com%2Felbwalker%2FwalkerOS&${CONTEXT}`,
    ]),
  ],
};

export const contentImpression: StepExample = {
  public: false,
  title: 'Content impression',
  description:
    'A visible teaser maps to trackContentImpression with the content name, piece and target.',
  in: otherEvent('teaser visible', {
    data: {
      name: 'Autumn sale',
      piece: 'banner',
      target: 'https://www.example.com/sale',
    },
  }),
  mapping: {
    name: 'trackContentImpression',
    data: { set: ['data.name', 'data.piece', 'data.target'] },
  },
  out: [
    call([
      `?${COMMON}&c_n=Autumn+sale&c_p=banner&c_t=https%3A%2F%2Fwww.example.com%2Fsale&${CONTEXT}`,
    ]),
  ],
};

export const pageHide: StepExample = {
  public: false,
  title: 'Page hide',
  description:
    'A page hide becomes one ping hit with the page view id and the page view time in seconds (pv_time): Matomo 5 counts it as visit duration, Matomo 6 as the time of that page view.',
  in: otherEvent('page hide', {
    source: { ...SOURCE, type: 'signals' },
    data: { engagement: 12000, total: 42500 },
  }),
  out: [call([`?${COMMON}&ping=1&pv_time=43&${CONTEXT}`])],
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

export const withToken: StepExample = {
  public: false,
  title: 'Visitor IP, user agent and user ID',
  description:
    'With ip, userAgent and userId set and credentials.token, the hit carries cip, ua and uid, and the bulk body carries the token as token_auth.',
  in: event('page view'),
  settings: {
    ip: ['ingest.ip', 'event.user.ip'],
    userAgent: ['ingest.userAgent', 'event.user.userAgent'],
    userId: 'event.user.id',
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        requests: [
          `?${COMMON}&action_name=walkerOS+documentation&url=https%3A%2F%2Fwww.example.com%2F&urlref=https%3A%2F%2Fwww.walkeros.io%2F&res=1920x1080&ua=Mozilla%2F5.0+%28Windows+NT+10.0%3B+Win64%3B+x64%29&cip=192.0.2.1&cid=cc8e27118413234d&uid=us3r&pv_id=0a1b2c&cdt=1700000000`,
        ],
        token_auth: 'TOKEN',
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
  in: event('page view'),
  settings: {
    customDimensions: { '1': 'globals.pagegroup' },
  },
  mapping: {
    settings: { customDimensions: { '2': 'data.domain' } },
  },
  out: [
    call([
      `?${COMMON}&action_name=walkerOS+documentation&dimension1=docs&dimension2=www.example.com&${CONTEXT}`,
    ]),
  ],
};

/** Each shop's page views go to its own Matomo and site, by the page's host. */
const TWO_SITES: Partial<Settings> = {
  url: {
    fn: (_, context) => {
      const urls: Record<string, string> = {
        'shop-a.example': 'https://a.matomo.example/',
        'shop-b.example': 'https://b.matomo.example/',
      };
      const page = context.event.source?.url;
      return page ? urls[new URL(page).hostname] : undefined;
    },
  },
  siteId: {
    fn: (_, context) => {
      const sites: Record<string, string> = {
        'shop-a.example': '1',
        'shop-b.example': '2',
      };
      const page = context.event.source?.url;
      return page ? sites[new URL(page).hostname] : undefined;
    },
  },
};

export const twoSitesA: StepExample = {
  public: false,
  title: 'Several sites: shop A',
  description:
    'With url and siteId as fn maps of the page host, a page view of shop A goes to its own Matomo as site 1.',
  in: event('page view', {
    source: { ...SOURCE, url: 'https://shop-a.example/' },
  }),
  settings: TWO_SITES,
  out: [
    call(
      [
        '?idsite=1&rec=1&apiv=1&action_name=walkerOS+documentation&url=https%3A%2F%2Fshop-a.example%2F&urlref=https%3A%2F%2Fwww.walkeros.io%2F&res=1920x1080&cid=cc8e27118413234d&pv_id=0a1b2c&cdt=1700000000',
      ],
      'https://a.matomo.example/matomo.php',
    ),
  ],
};

export const twoSitesB: StepExample = {
  public: false,
  title: 'Several sites: shop B',
  description:
    'The same settings send a page view of shop B to its own Matomo as site 2.',
  in: event('page view', {
    source: { ...SOURCE, url: 'https://shop-b.example/' },
  }),
  settings: TWO_SITES,
  out: [
    call(
      [
        '?idsite=2&rec=1&apiv=1&action_name=walkerOS+documentation&url=https%3A%2F%2Fshop-b.example%2F&urlref=https%3A%2F%2Fwww.walkeros.io%2F&res=1920x1080&cid=cc8e27118413234d&pv_id=0a1b2c&cdt=1700000000',
      ],
      'https://b.matomo.example/matomo.php',
    ),
  ],
};

export const unmappedEvent: StepExample = {
  public: false,
  title: 'Unmapped event',
  description:
    'An event without a rule name that is not a page view or a page hide has nothing to send: the push fails with missing-input. To keep such events out without a failure, ignore them with a rule.',
  in: event('promotion visible'),
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

export const eventWithoutCategory: StepExample = {
  public: false,
  title: 'Event without a category',
  description:
    'Matomo needs a category and an action for trackEvent: an event whose rule resolves no category fails with missing-input instead of counting as delivered.',
  in: otherEvent('video play', { data: { title: 'walkerOS in 60 seconds' } }),
  mapping: {
    name: 'trackEvent',
    data: { set: ['data.category', 'action'] },
  },
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

export const ipWithoutToken: StepExample = {
  public: false,
  title: 'Visitor IP without a token',
  description:
    'Matomo records the visitor IP (cip) only with token_auth: an ip setting without credentials.token fails the start with config, so no event is sent until it is fixed.',
  in: event('page view'),
  settings: { ip: 'ingest.ip' },
  out: [],
  outcome: { status: 'failed', code: 'config', retryable: false },
};

export const serverError: StepExample = {
  public: false,
  title: 'Matomo server error',
  description:
    'Matomo answers 500: the push fails with transport and its status, and the event is retried.',
  in: event('page view'),
  respond: { status: 500 },
  out: [call([`?${COMMON}&action_name=walkerOS+documentation&${CONTEXT}`])],
  outcome: { status: 'failed', code: 'transport', retryable: true },
};

export const forbidden: StepExample = {
  public: false,
  title: 'Request refused',
  description:
    'Matomo answers 403: the push fails with transport and its status, and the event is not retried.',
  in: event('page view'),
  respond: { status: 403 },
  out: [call([`?${COMMON}&action_name=walkerOS+documentation&${CONTEXT}`])],
  outcome: { status: 'failed', code: 'transport', retryable: false },
};

/**
 * The event of a mapped example without the data its rule reads: Matomo
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

export const cartViewWithoutInput = withoutInput(cartView);
export const orderCompleteWithoutInput = withoutInput(orderComplete);
export const siteSearchWithoutInput = withoutInput(siteSearch);
export const outlinkWithoutInput = withoutInput(outlink);
export const contentImpressionWithoutInput = withoutInput(contentImpression);
