import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

// Build-time version define. The collector stamps source.release with this on
// push, so the include-all expectation below must track it rather than a
// literal, else it breaks whenever the fixed version group is bumped (release).
declare const __VERSION__: string;

/**
 * gtag step examples. The four standard events are the GA4 recommended
 * events from Google's reference, run with the settings
 * `{ ga4: { measurementId: 'G-XXXXXXXXXX', pageview: false } }`. Each out is
 * the call recorded on `window.gtag` or `window.dataLayer.push`.
 *
 * Functions in mappings are published as source code, so they must not use
 * imported helpers.
 */

/**
 * GA4 destination bootstrap: configures the measurementId. gtag already
 * exists here, so no `js` is sent.
 */
export const ga4Init: Flow.StepExample = {
  title: 'GA4 init',
  description:
    'Configures a GA4 property with pageview false, so gtag sends no page_view of its own next to the walkerOS page view.',
  in: {
    settings: {
      ga4: { measurementId: 'G-XXXXXXXXXX', pageview: false },
    },
  },
  out: [['window.gtag', 'config', 'G-XXXXXXXXXX', { send_page_view: false }]],
};

/**
 * Google Ads destination bootstrap.
 * Initializes gtag infrastructure and configures the Ads conversionId.
 */
export const adsInit: Flow.StepExample = {
  title: 'Google Ads init',
  description:
    'Configures a Google Ads account via its conversionId. gtag already exists here, so no `js` is sent.',
  in: {
    settings: {
      ads: { conversionId: 'AW-123456789', currency: 'EUR' },
    },
  },
  out: [['window.gtag', 'config', 'AW-123456789']],
};

/**
 * GTM destination bootstrap.
 * Loads the container and pushes the gtm.js start event.
 */
export const gtmInit: Flow.StepExample = {
  title: 'GTM init',
  description:
    'With script loading enabled the destination initializes the dataLayer, pushes the gtm.js start event, and loads the GTM container.',
  in: {
    loadScript: true,
    settings: {
      gtm: { containerId: 'GTM-XXXXXXX' },
    },
  },
  out: [
    [
      'window.dataLayer.push',
      {
        'gtm.start': 1700000000000,
        event: 'gtm.js',
      },
    ],
  ],
};

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view becomes the GA4 page_view event; gtag adds the page location and title itself, and pageview false keeps it from counting twice.',
  in: getEvent('page view'),
  out: [['window.gtag', 'event', 'page_view', { send_to: 'G-XXXXXXXXXX' }]],
};

export const productView: Flow.StepExample = {
  title: 'View item',
  description:
    'A product view becomes the GA4 view_item event with currency, value and the product as its one item.',
  in: getEvent('product view'),
  mapping: {
    name: 'view_item',
    data: {
      map: {
        currency: { key: 'data.currency', value: 'EUR' },
        value: 'data.price',
        items: {
          loop: [
            'this',
            {
              map: {
                item_id: 'data.id',
                item_name: 'data.name',
                item_variant: 'data.color',
                price: 'data.price',
                quantity: { key: 'data.quantity', value: 1 },
              },
            },
          ],
        },
      },
    },
  },
  out: [
    [
      'window.gtag',
      'event',
      'view_item',
      {
        currency: 'EUR',
        value: 420,
        items: [
          {
            item_id: 'ers',
            item_name: 'Everyday Ruck Snack',
            item_variant: 'black',
            price: 420,
            quantity: 1,
          },
        ],
        send_to: 'G-XXXXXXXXXX',
      },
    ],
  ],
};

export const addToCart: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A product add becomes the GA4 add_to_cart event with currency, value and the added product as its item.',
  in: getEvent('product add'),
  mapping: {
    name: 'add_to_cart',
    data: {
      map: {
        currency: { key: 'data.currency', value: 'EUR' },
        value: 'data.price',
        items: {
          loop: [
            'this',
            {
              map: {
                item_id: 'data.id',
                item_name: 'data.name',
                item_variant: 'data.color',
                price: 'data.price',
                quantity: { key: 'data.quantity', value: 1 },
              },
            },
          ],
        },
      },
    },
  },
  out: [
    [
      'window.gtag',
      'event',
      'add_to_cart',
      {
        currency: 'EUR',
        value: 420,
        items: [
          {
            item_id: 'ers',
            item_name: 'Everyday Ruck Snack',
            item_variant: 'black',
            price: 420,
            quantity: 1,
          },
        ],
        send_to: 'G-XXXXXXXXXX',
      },
    ],
  ],
};

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'An order complete becomes the GA4 purchase event with transaction id, value, tax, shipping, currency and one item per product.',
  in: getEvent('order complete'),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        transaction_id: 'data.id',
        value: 'data.value',
        tax: 'data.tax',
        shipping: 'data.shipping',
        currency: { key: 'data.currency', value: 'EUR' },
        items: {
          loop: [
            'nested',
            {
              condition: (entity: unknown) =>
                typeof entity === 'object' &&
                entity !== null &&
                'entity' in entity &&
                entity.entity === 'product',
              map: {
                item_id: 'data.id',
                item_name: 'data.name',
                item_variant: 'data.color',
                price: 'data.price',
                quantity: { key: 'data.quantity', value: 1 },
              },
            },
          ],
        },
      },
    },
  },
  out: [
    [
      'window.gtag',
      'event',
      'purchase',
      {
        transaction_id: '0rd3r1d',
        value: 462,
        tax: 73.76,
        shipping: 5.22,
        currency: 'EUR',
        items: [
          {
            item_id: 'ers',
            item_name: 'Everyday Ruck Snack',
            item_variant: 'black',
            price: 420,
            quantity: 1,
          },
          { item_id: 'cc', item_name: 'Cool Cap', price: 42, quantity: 1 },
        ],
        send_to: 'G-XXXXXXXXXX',
      },
    ],
  ],
};

/**
 * Consent Mode v2 with marketing + analytics granted.
 *
 * Uses the `command: 'consent'` field to route `in` through the
 * `elb('walker consent', in)` handler rather than pushing it as an event.
 * The default consent mapping is:
 *   marketing → ad_storage, ad_user_data, ad_personalization
 *   analytics → analytics_storage
 */
export const consentModeV2: Flow.StepExample = {
  title: 'Consent Mode v2',
  description:
    'A walker consent command with marketing and analytics granted updates gtag Consent Mode v2 parameters.',
  command: 'consent',
  in: { marketing: true, analytics: true },
  out: [
    // First consent call sets default to denied for all mapped parameters.
    [
      'window.gtag',
      'consent',
      'default',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
      },
    ],
    [
      'window.gtag',
      'consent',
      'update',
      {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        analytics_storage: 'granted',
      },
    ],
  ],
};

/**
 * Google Ads conversion tracking, with the settings
 * `{ ads: { conversionId: 'AW-123456789', currency: 'EUR' } }`.
 * The Ads push produces gtag('event', 'conversion', { send_to, currency, ...data }).
 */
export const googleAdsConversion: Flow.StepExample = {
  public: false,
  title: 'Ads conversion',
  description:
    'An order complete event is sent as a Google Ads conversion with a configured label and transaction value.',
  in: getEvent('order complete'),
  mapping: {
    name: 'PURCHASE_CONV',
    settings: {
      ads: { label: 'PURCHASE_CONV' },
    },
    data: {
      map: {
        value: 'data.value',
      },
    },
  },
  out: [
    [
      'window.gtag',
      'event',
      'conversion',
      {
        send_to: 'AW-123456789/PURCHASE_CONV',
        currency: 'EUR',
        value: 462,
      },
    ],
  ],
};

/**
 * Google Ads conversion with Enhanced Conversions, with
 * `enhancedConversions: { email: 'data.customerEmail', phone_number:
 * 'data.customerPhone' }` on the Ads settings. The destination resolves each
 * mapping value and calls gtag('set', 'user_data', {...}) before
 * gtag('event', 'conversion', {...}).
 */
export const adsEnhancedConversions: Flow.StepExample = {
  public: false,
  title: 'Enhanced conversions',
  description:
    'enhancedConversions maps event fields into a gtag set user_data call sent immediately before the conversion event.',
  in: getEvent('order complete', {
    data: {
      id: '0rd3r1d',
      currency: 'EUR',
      value: 462,
      tax: 73.76,
      shipping: 5.22,
      total: 467.22,
      customerEmail: 'buyer@example.com',
      customerPhone: '+1234567890',
    },
  }),
  mapping: {
    name: 'PURCHASE_EC2',
    settings: {
      ads: { label: 'PURCHASE_EC2' },
    },
    data: {
      map: {
        value: 'data.value',
      },
    },
  },
  out: [
    [
      'window.gtag',
      'set',
      'user_data',
      {
        email: 'buyer@example.com',
        phone_number: '+1234567890',
      },
    ],
    [
      'window.gtag',
      'event',
      'conversion',
      {
        send_to: 'AW-123456789/PURCHASE_EC2',
        currency: 'EUR',
        value: 462,
      },
    ],
  ],
};

/**
 * GTM dataLayer push, with the settings `{ gtm: { containerId:
 * 'GTM-XXXXXXX' } }`: window.dataLayer.push({ event: mappedName, ...mappedData }).
 */
export const gtmDataLayerPush: Flow.StepExample = {
  public: false,
  title: 'GTM dataLayer push',
  description:
    'A page view event is pushed to window.dataLayer for GTM with the mapped event name and parameters.',
  in: getEvent('page view'),
  mapping: {
    name: 'page_view',
    settings: {
      gtm: {},
    },
    data: {
      map: {
        page_title: 'data.title',
        page_location: 'data.domain',
      },
    },
  },
  out: [
    [
      'window.dataLayer.push',
      {
        event: 'page_view',
        page_title: 'walkerOS documentation',
        page_location: 'www.example.com',
      },
    ],
  ],
};

/**
 * GA4 event flattening selected event sections into prefixed params.
 * Each listed section (data, context, globals, user, source, event) is
 * flattened into params like data_*, context_*, user_*, etc.
 * The `version` section is intentionally omitted - version_source is baked
 * in at build time from @walkeros/core's package.json, so asserting on it
 * would couple the fixture to the release version.
 */
export const ga4WithIncludeAll: Flow.StepExample = {
  public: false,
  title: 'GA4 include all',
  description:
    'Include flattens every event section into prefixed GA4 params, exposing data, context, user, source, and event fields.',
  in: getEvent('page view', {
    id: 'ev-1700000106',
    timestamp: 1700000106,
    source: {
      type: 'collector',
      schema: '4',
      count: 1,
      trace: '1700000106abcdef1700000106abcdef',
    },
  }),
  mapping: {
    include: ['data', 'context', 'globals', 'user', 'source', 'event'],
  },
  out: [
    [
      'window.gtag',
      'event',
      'page_view',
      {
        // data_* params from event.data
        data_domain: 'www.example.com',
        data_title: 'walkerOS documentation',
        data_referrer: 'https://www.walkeros.io/',
        data_search: '?foo=bar',
        data_hash: '#hash',
        data_id: '/docs/',
        // context_* params from event.context
        context_dev: 'test',
        // globals_* params from event.globals
        globals_pagegroup: 'docs',
        // user_* params from event.user. `user_id` is absent on purpose: GA4
        // reserves the name for identity set via gtag config and ignores it as
        // an event parameter, so the destination drops it.
        user_device: 'c00k13',
        user_session: 's3ss10n',
        // source_* params from event.source
        source_type: 'collector',
        source_schema: '4',
        source_count: 1,
        source_trace: '1700000106abcdef1700000106abcdef',
        source_release_default: __VERSION__,
        // event_* params from event properties
        event_entity: 'page',
        event_action: 'view',
        event_trigger: 'load',
        event_id: 'ev-1700000106',
        event_name: 'page view',
        event_timestamp: 1700000106,
        event_timing: 3.14,
        // send_to is always set for GA4
        send_to: 'G-XXXXXXXXXX',
      },
    ],
  ],
};

/**
 * One event pushed to GA4 + Ads + GTM simultaneously, with all three tools
 * in the settings. The out is a flat array of all observable calls in
 * execution order:
 *
 * - GA4: gtag('event', eventName, { ...params, send_to })
 * - Ads: gtag('event', 'conversion', { send_to, currency, ...data })
 * - GTM: window.dataLayer.push({ event: eventName, ...data })
 */
export const multipleToolsSimultaneous: Flow.StepExample = {
  public: false,
  title: 'Multi-tool push',
  description:
    'A single order event fans out to GA4, Google Ads, and GTM from one mapping rule with per-tool settings.',
  in: getEvent('order complete'),
  mapping: {
    name: 'purchase',
    include: ['data'],
    settings: {
      ga4: {},
      ads: { label: 'PURCHASE_CONV' },
      gtm: {},
    },
    data: {
      map: {
        value: 'data.value',
        currency: { key: 'data.currency', value: 'EUR' },
      },
    },
  },
  out: [
    [
      'window.gtag',
      'event',
      'purchase',
      {
        value: 462,
        currency: 'EUR',
        // include: ['data'] flattens data as prefixed params.
        data_id: '0rd3r1d',
        data_currency: 'EUR',
        data_value: 462,
        data_tax: 73.76,
        data_shipping: 5.22,
        data_total: 467.22,
        send_to: 'G-XXXXXXXXXX',
      },
    ],
    [
      'window.gtag',
      'event',
      'conversion',
      {
        send_to: 'AW-123456789/PURCHASE_CONV',
        currency: 'EUR',
        value: 462,
        data_id: '0rd3r1d',
        data_currency: 'EUR',
        data_value: 462,
        data_tax: 73.76,
        data_shipping: 5.22,
        data_total: 467.22,
      },
    ],
    [
      'window.dataLayer.push',
      {
        event: 'purchase',
        value: 462,
        currency: 'EUR',
        data_id: '0rd3r1d',
        data_currency: 'EUR',
        data_value: 462,
        data_tax: 73.76,
        data_shipping: 5.22,
        data_total: 467.22,
      },
    ],
  ],
};

/** A silent rule sends none of the default gtag or dataLayer calls. */
export const silentRule: Flow.StepExample = {
  public: false,
  description:
    'A rule with silent: true sends no GA4 event, no Ads conversion and no GTM push.',
  in: getEvent('page view'),
  mapping: { silent: true },
  out: [],
};

/**
 * A revocation updates Consent Mode: with config.consent { marketing: true },
 * granted first, revoking marketing denies the ad parameters the default
 * mapping assigns to it.
 */
export const consentRevoke: Flow.StepExample = {
  public: false,
  description:
    'Revoking marketing updates gtag Consent Mode v2 with the ad parameters denied.',
  command: 'consent',
  in: { marketing: false },
  out: [
    [
      'window.gtag',
      'consent',
      'update',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ],
  ],
};
