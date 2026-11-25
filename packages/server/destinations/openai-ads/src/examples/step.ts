import type { Flow } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';
import {
  orderComplete,
  pageView as pageViewRule,
  productAdd,
  productView,
} from '../rules';

/**
 * OpenAI Ads Conversions API step examples.
 *
 * At push time, the destination calls
 * `env.sendServer(endpoint, JSON.stringify(body), options)` where
 * `endpoint = https://bzr.openai.com/v1/events?pid=${settings.pixelId}` and
 * `body = { validate_only?, integration_source: 'walkeros', events: [conversion] }`.
 *
 * The test fixture pins `apiKey = 's3cr3t'` and `pixelId = 'px_abc123'`.
 *
 * Conversion keys are emitted in this order (insertion order matters for
 * `JSON.stringify` string equality): id, type, custom_event_name?,
 * timestamp_ms, oppref?, source_url?, action_source, user?, data.
 *
 * The four standard events run on the destination's own rules. Digests of
 * user@example.com, customer_123 and +1 (415) 555-2671 are OpenAI's published
 * ones (https://developers.openai.com/ads/conversions-api#send-user-data).
 * Functions in mappings are published as source code, so they must not use
 * imported helpers.
 */
const ENDPOINT = 'https://bzr.openai.com/v1/events?pid=px_abc123';
const OPTIONS = {
  headers: {
    Authorization: 'Bearer s3cr3t',
    'Content-Type': 'application/json',
  },
};

/** A browser event relayed to the server, from the page it happened on. */
const relayed = (url: string) => ({
  source: { type: 'browser', platform: 'web', url },
});

const SERVER = { type: 'express', platform: 'server' };

const EMAIL_SHA256 =
  'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514';
const EXTERNAL_ID_SHA256 =
  '18f69bcd2f9cc9c38195e722b2a5590429840ea5090971d2256e026926e55fa1';
const PHONE_SHA256 =
  '758fbf68945f21c416814c539ab578876c8d98fb69e6da692def92cd52417fe0';
// sha256('maryjane'), sha256('oconnor')
const FIRST_NAME_SHA256 =
  'f08f448a5e7a9dc3619bb7c129f6a7d5fc6af002cea17ad71dfdc1c68f4d4e0e';
const LAST_NAME_SHA256 =
  '7a0fbfdf40cbeb97429bdb88f512cecd27f0d44b7e57986ab578423bb61936ac';

const request = (event: Record<string, unknown>): Flow.StepEffect => [
  'sendServer',
  ENDPOINT,
  JSON.stringify({ integration_source: 'walkeros', events: [event] }),
  OPTIONS,
];

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description: 'A page view is sent to OpenAI Ads as page_viewed.',
  in: getEvent('page view', relayed('https://www.example.com/docs/')),
  mapping: pageViewRule,
  out: [
    request({
      id: 'f0cc5f6fec3d8eeb',
      type: 'page_viewed',
      timestamp_ms: 1700000000000,
      source_url: 'https://www.example.com/docs/',
      action_source: 'web',
      data: { type: 'contents' },
    }),
  ],
};

export const productViewed: Flow.StepExample = {
  title: 'Product view',
  description:
    'A product view is sent as contents_viewed with the product and its price in minor units.',
  in: getEvent('product view', relayed('https://shop.example.com/ers')),
  mapping: productView,
  out: [
    request({
      id: 'db22fb16c70f663d',
      type: 'contents_viewed',
      timestamp_ms: 1700000000000,
      source_url: 'https://shop.example.com/ers',
      action_source: 'web',
      data: {
        type: 'contents',
        contents: [
          {
            id: 'ers',
            name: 'Everyday Ruck Snack',
            amount: 42000,
            currency: 'EUR',
          },
        ],
      },
    }),
  ],
};

export const productAdded: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A product add is sent as items_added with the product, its quantity and its price in minor units.',
  in: getEvent('product add', relayed('https://shop.example.com/ers')),
  mapping: productAdd,
  out: [
    request({
      id: '83e860384d50953f',
      type: 'items_added',
      timestamp_ms: 1700000000000,
      source_url: 'https://shop.example.com/ers',
      action_source: 'web',
      data: {
        type: 'contents',
        contents: [
          {
            id: 'ers',
            name: 'Everyday Ruck Snack',
            quantity: 1,
            amount: 42000,
            currency: 'EUR',
          },
        ],
      },
    }),
  ],
};

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'An order complete is sent as order_created with the total in minor units and one content per product.',
  in: getEvent('order complete', relayed('https://shop.example.com/thanks')),
  mapping: orderComplete,
  out: [
    request({
      id: '235d0d7bd7a213f2',
      type: 'order_created',
      timestamp_ms: 1700000000000,
      source_url: 'https://shop.example.com/thanks',
      action_source: 'web',
      data: {
        type: 'contents',
        amount: 46722,
        currency: 'EUR',
        contents: [
          { id: 'ers', name: 'Everyday Ruck Snack', amount: 42000 },
          { id: 'cc', name: 'Cool Cap', amount: 4200 },
        ],
      },
    }),
  ],
};

export const purchaseWithMatchKeys: Flow.StepExample = {
  title: 'Purchase with click and match keys',
  description:
    "An order with its own order id for deduplication, the oppref click reference, the pixel's obref and match keys: OpenAI's example event.",
  in: createEvent({
    name: 'order complete',
    id: 'ev-1773892800',
    timestamp: 1773892800000,
    data: { id: 'order_12345', total: 25.99, currency: 'USD' },
    nested: [
      {
        entity: 'product',
        data: { id: 'sku_123', name: 'Starter bundle', quantity: 1 },
      },
    ],
    user: {
      id: 'customer_123',
      email: 'user@example.com',
      country: 'US',
      city: 'San Francisco',
      zip: '94107',
      ip: '203.0.113.1',
      userAgent: 'Mozilla/5.0',
    },
    globals: {
      oppref: 'oppref_abc',
      obref: '123e4567-e89b-42d3-a456-426614174000',
    },
    source: {
      ...SERVER,
      url: 'https://shop.example.com/checkout/confirmation',
    },
  }),
  mapping: {
    name: 'order_created',
    data: {
      map: {
        id: 'data.id',
        oppref: 'globals.oppref',
        obref: 'globals.obref',
        email: 'user.email',
        external_id: 'user.id',
        country: 'user.country',
        city: 'user.city',
        postal_code: 'user.zip',
        amount: 'data.total',
        currency: 'data.currency',
        contents: {
          loop: [
            'nested',
            {
              map: {
                id: 'data.id',
                name: 'data.name',
                content_type: { value: 'product' },
                quantity: 'data.quantity',
              },
            },
          ],
        },
      },
    },
  },
  out: [
    request({
      id: 'order_12345',
      type: 'order_created',
      timestamp_ms: 1773892800000,
      oppref: 'oppref_abc',
      source_url: 'https://shop.example.com/checkout/confirmation',
      action_source: 'web',
      user: {
        emails_sha256: [EMAIL_SHA256],
        external_ids_sha256: [EXTERNAL_ID_SHA256],
        obref: '123e4567-e89b-42d3-a456-426614174000',
        countries: ['US'],
        cities: ['San Francisco'],
        postal_codes: ['94107'],
        user_agent: 'Mozilla/5.0',
        ip_address: '203.0.113.1',
      },
      data: {
        type: 'contents',
        amount: 2599,
        currency: 'USD',
        contents: [
          {
            id: 'sku_123',
            name: 'Starter bundle',
            content_type: 'product',
            quantity: 1,
          },
        ],
      },
    }),
  ],
};

export const lead: Flow.StepExample = {
  title: 'Lead',
  description:
    'A demo request form is sent as lead_created with the hashed email and phone.',
  in: createEvent({
    name: 'form submit',
    id: 'ev-1700000901',
    timestamp: 1700000901000,
    data: {
      type: 'demo',
      email: 'user@example.com',
      phone: '+1 (415) 555-2671',
    },
    source: { ...SERVER, url: 'https://shop.example.com/demo' },
  }),
  mapping: {
    name: 'lead_created',
    data: { map: { email: 'data.email', phone: 'data.phone' } },
  },
  out: [
    request({
      id: 'ev-1700000901',
      type: 'lead_created',
      timestamp_ms: 1700000901000,
      source_url: 'https://shop.example.com/demo',
      action_source: 'web',
      user: {
        emails_sha256: [EMAIL_SHA256],
        phone_numbers_sha256: [PHONE_SHA256],
      },
      data: { type: 'customer_action' },
    }),
  ],
};

export const registration: Flow.StepExample = {
  title: 'Registration',
  description:
    'A sign-up is sent as registration_completed with the hashed user id as external id and the hashed names.',
  in: createEvent({
    name: 'user register',
    id: 'ev-1700000902',
    timestamp: 1700000902000,
    data: {
      id: 'customer_123',
      first_name: 'Mary Jane',
      last_name: "O'Connor",
    },
    source: { ...SERVER, url: 'https://shop.example.com/signup' },
  }),
  mapping: {
    name: 'registration_completed',
    data: {
      map: {
        external_id: 'data.id',
        first_name: 'data.first_name',
        last_name: 'data.last_name',
      },
    },
  },
  out: [
    request({
      id: 'ev-1700000902',
      type: 'registration_completed',
      timestamp_ms: 1700000902000,
      source_url: 'https://shop.example.com/signup',
      action_source: 'web',
      user: {
        external_ids_sha256: [EXTERNAL_ID_SHA256],
        first_names_sha256: [FIRST_NAME_SHA256],
        last_names_sha256: [LAST_NAME_SHA256],
      },
      data: { type: 'customer_action' },
    }),
  ],
};

export const subscription: Flow.StepExample = {
  title: 'Subscription',
  description:
    'A paid subscription is sent as subscription_created with its plan and amount.',
  in: createEvent({
    name: 'subscription start',
    id: 'ev-1700000903',
    timestamp: 1700000903000,
    data: { plan: 'business_yearly', price: 990, currency: 'USD' },
    source: { ...SERVER, url: 'https://shop.example.com/billing' },
  }),
  mapping: {
    name: 'subscription_created',
    data: {
      map: {
        plan_id: 'data.plan',
        amount: 'data.price',
        currency: 'data.currency',
      },
    },
  },
  out: [
    request({
      id: 'ev-1700000903',
      type: 'subscription_created',
      timestamp_ms: 1700000903000,
      source_url: 'https://shop.example.com/billing',
      action_source: 'web',
      data: {
        type: 'plan_enrollment',
        amount: 99000,
        currency: 'USD',
        plan_id: 'business_yearly',
      },
    }),
  ],
};

export const appInstall: Flow.StepExample = {
  title: 'App install',
  description:
    'An app install is sent as app_installed with action_source mobile_app, mapped per event, and the Android advertising id.',
  in: createEvent({
    name: 'app install',
    id: 'app_installed_123',
    timestamp: 1700000905000,
    data: { gaid: '38400000-8cf0-11bd-b23e-10b96e40000d' },
    source: SERVER,
  }),
  mapping: {
    name: 'app_installed',
    data: {
      map: {
        action_source: { value: 'mobile_app' },
        android_advertising_id: 'data.gaid',
      },
    },
  },
  out: [
    request({
      id: 'app_installed_123',
      type: 'app_installed',
      timestamp_ms: 1700000905000,
      action_source: 'mobile_app',
      user: {
        android_advertising_id: '38400000-8cf0-11bd-b23e-10b96e40000d',
      },
      data: { type: 'customer_action' },
    }),
  ],
};

export const custom: Flow.StepExample = {
  title: 'Custom event',
  description:
    'A rule name that is not a standard type is sent as a custom event with that name.',
  in: createEvent({
    name: 'demo booked',
    id: 'ev-1700000904',
    timestamp: 1700000904000,
    data: {},
    source: { ...SERVER, url: 'https://shop.example.com/demo/booked' },
  }),
  mapping: { name: 'demo_booked' },
  out: [
    request({
      id: 'ev-1700000904',
      type: 'custom',
      custom_event_name: 'demo_booked',
      timestamp_ms: 1700000904000,
      source_url: 'https://shop.example.com/demo/booked',
      action_source: 'web',
      data: { type: 'custom' },
    }),
  ],
};

/** An event the destination's own rules do not name is ignored. */
export const otherEvent: Flow.StepExample = {
  public: false,
  description:
    'Without a mapping in the config, an event other than page view, product view, product add and order complete is ignored: nothing is sent.',
  in: createEvent({
    name: 'page click',
    id: 'ev-1700000906',
    timestamp: 1700000906000,
    source: { ...SERVER, url: 'https://www.example.com/' },
  }),
  out: [],
};

/** A silent rule sends nothing to OpenAI Ads. */
export const silentRule: Flow.StepExample = {
  public: false,
  description: 'A rule with silent: true sends no request to OpenAI Ads.',
  in: getEvent('page view', { timestamp: 1700000990000 }),
  mapping: { silent: true },
  out: [],
};

export const unnamedEvent: Flow.StepExample = {
  public: false,
  description:
    'A rule without a name gives the event no OpenAI type: the push fails with missing-input and nothing is sent.',
  in: getEvent('session start', relayed('https://www.example.com/')),
  mapping: { data: { map: { email: 'user.email' } } },
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

export const webEventWithoutUrl: Flow.StepExample = {
  public: false,
  description:
    'A web event (action_source web, the default) without a source URL fails with missing-input and nothing is sent.',
  in: createEvent({
    name: 'form submit',
    id: 'ev-1700000907',
    timestamp: 1700000907000,
    source: SERVER,
  }),
  mapping: { name: 'lead_created' },
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

export const invalidCustomName: Flow.StepExample = {
  public: false,
  description:
    'A custom event name with other characters than letters, digits, _ and - fails with missing-input and nothing is sent.',
  in: createEvent({
    name: 'demo booked',
    id: 'ev-1700000908',
    timestamp: 1700000908000,
    source: { ...SERVER, url: 'https://shop.example.com/demo/booked' },
  }),
  mapping: { name: 'demo booked!' },
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

export const unknownCurrency: Flow.StepExample = {
  public: false,
  description:
    'An amount whose currency is not an ISO 4217 code cannot be sent in minor units: the push fails with missing-input and nothing is sent.',
  in: getEvent('order complete', {
    data: { total: 25.99, currency: 'EURO' },
    ...relayed('https://shop.example.com/thanks'),
  }),
  mapping: orderComplete,
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

export const amountWithoutCurrency: Flow.StepExample = {
  public: false,
  description:
    'Prices without a currency cannot be sent in minor units: an order without a currency fails with missing-input and nothing is sent.',
  in: {
    ...getEvent('order complete', relayed('https://shop.example.com/thanks')),
    data: {},
    user: {},
    globals: {},
    context: {},
  },
  mapping: orderComplete,
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

export const appEventFromWeb: Flow.StepExample = {
  public: false,
  description:
    'An app event without action_source mobile_app fails with missing-input and nothing is sent.',
  in: createEvent({
    name: 'app open',
    id: 'ev-1700000909',
    timestamp: 1700000909000,
    source: { ...SERVER, url: 'https://www.example.com/' },
  }),
  mapping: { name: 'app_opened' },
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

export const badRequest: Flow.StepExample = {
  public: false,
  description:
    'OpenAI answers HTTP 400 (an invalid field, or a list with more than three values): the push fails with transport, not retryable, and the event goes to the dead-letter queue.',
  in: getEvent('page view', relayed('https://www.example.com/docs/')),
  mapping: pageViewRule,
  respond: { status: 400 },
  outcome: { status: 'failed', code: 'transport', retryable: false },
};
