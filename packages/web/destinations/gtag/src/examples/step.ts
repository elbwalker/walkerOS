import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent, isObject } from '@walkeros/core';

export const purchase: Flow.StepExample = {
  in: getEvent('order complete', { timestamp: 1700000100 }),
  mapping: {
    name: 'purchase',
    include: ['data', 'context'],
    data: {
      map: {
        transaction_id: 'data.id',
        value: 'data.total',
        tax: 'data.taxes',
        shipping: 'data.shipping',
        currency: { key: 'data.currency', value: 'EUR' },
        items: {
          loop: [
            'nested',
            {
              condition: (entity: unknown) =>
                isObject(entity) && entity.entity === 'product',
              map: {
                item_id: 'data.id',
                item_name: 'data.name',
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
      'gtag',
      'event',
      'purchase',
      {
        transaction_id: '0rd3r1d',
        value: 555,
        tax: 73.76,
        shipping: 5.22,
        currency: 'EUR',
        items: [
          { item_id: 'ers', item_name: 'Everyday Ruck Snack', quantity: 1 },
          { item_id: 'cc', item_name: 'Cool Cap', quantity: 1 },
        ],
        // include: ['data', 'context'] flattens both sections as prefixed params.
        data_id: '0rd3r1d',
        data_currency: 'EUR',
        data_shipping: 5.22,
        data_taxes: 73.76,
        data_total: 555,
        context_shopping: 'complete',
        send_to: 'G-XXXXXX-1',
      },
    ],
  ],
};

export const addToCart: Flow.StepExample = {
  in: getEvent('product add', { timestamp: 1700000101 }),
  mapping: {
    name: 'add_to_cart',
    include: ['data'],
    data: {
      map: {
        currency: { value: 'EUR', key: 'data.currency' },
        value: 'data.price',
        items: {
          loop: [
            'this',
            {
              map: {
                item_id: 'data.id',
                item_variant: 'data.color',
                quantity: { value: 1, key: 'data.quantity' },
              },
            },
          ],
        },
      },
    },
  },
  out: [
    [
      'gtag',
      'event',
      'add_to_cart',
      {
        currency: 'EUR',
        value: 420,
        items: [{ item_id: 'ers', item_variant: 'black', quantity: 1 }],
        // include: ['data'] flattens data as prefixed params.
        data_id: 'ers',
        data_name: 'Everyday Ruck Snack',
        data_color: 'black',
        data_size: 'l',
        data_price: 420,
        send_to: 'G-XXXXXX-1',
      },
    ],
  ],
};

export const pageView: Flow.StepExample = {
  in: getEvent('page view', { timestamp: 1700000102 }),
  mapping: undefined,
  out: [['gtag', 'event', 'page_view', { send_to: 'G-XXXXXX-1' }]],
};

/**
 * Google Ads conversion tracking.
 * Shows how settings.ads.label maps an event to an Ads conversion call.
 * The Ads push produces gtag('event', 'conversion', { send_to, currency, ...data }).
 */
export const googleAdsConversion: Flow.StepExample = {
  in: getEvent('order complete', { timestamp: 1700000103 }),
  mapping: {
    name: 'PURCHASE_CONV',
    settings: {
      ads: { label: 'PURCHASE_CONV' },
    },
    data: {
      map: {
        value: 'data.total',
      },
    },
  },
  out: [
    [
      'gtag',
      'event',
      'conversion',
      {
        send_to: 'AW-123456789/PURCHASE_CONV',
        currency: 'EUR',
        value: 555,
      },
    ],
  ],
};

/**
 * GTM dataLayer push.
 * Shows how settings.gtm triggers a window.dataLayer.push() call
 * with { event: mappedName, ...mappedData }.
 * Note: GTM pushes to dataLayer (not gtag), so the out format is a plain object.
 */
export const gtmDataLayerPush: Flow.StepExample = {
  in: getEvent('page view', { timestamp: 1700000104 }),
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
      'dataLayer.push',
      {
        event: 'page_view',
        page_title: 'walkerOS documentation',
        page_location: 'www.example.com',
      },
    ],
  ],
};

/**
 * Consent Mode v2 with marketing + functional granted.
 *
 * Uses the `command: 'consent'` field to route `in` through the
 * `elb('walker consent', in)` handler rather than pushing it as an event.
 * The default consent mapping is:
 *   marketing → ad_storage, ad_user_data, ad_personalization
 *   functional → analytics_storage
 */
export const consentModeV2: Flow.StepExample = {
  command: 'consent',
  in: { marketing: true, functional: true },
  out: [
    [
      'gtag',
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
 * GA4 event with include: ['all'] — flattens all event sections as prefixed params.
 * Each section (data, context, globals, user, source, event, version)
 * is flattened into params like data_*, context_*, user_*, etc.
 */
export const ga4WithIncludeAll: Flow.StepExample = {
  in: getEvent('page view', { timestamp: 1700000106 }),
  mapping: {
    include: ['all'],
  },
  out: [
    [
      'gtag',
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
        // user_* params from event.user
        user_id: 'us3r',
        user_device: 'c00k13',
        user_session: 's3ss10n',
        // source_* params from event.source
        source_type: 'web',
        source_id: 'https://localhost:80',
        source_previous_id: 'http://remotehost:9001',
        // event_* params from event properties
        event_entity: 'page',
        event_action: 'view',
        event_trigger: 'load',
        event_group: 'gr0up',
        event_count: 1,
        event_id: '1700000106-gr0up-1',
        event_name: 'page view',
        event_timestamp: 1700000106,
        event_timing: 3.14,
        // version_* params from event.version
        version_source: '3.3.1',
        version_tagging: 1,
        // send_to is always set for GA4
        send_to: 'G-XXXXXX-1',
      },
    ],
  ],
};

/**
 * One event pushed to GA4 + Ads + GTM simultaneously.
 * Shows settings for all three tools in a single mapping rule.
 * The out is a flat array of all observable calls in execution order:
 *
 * - GA4: gtag('event', eventName, { ...params, send_to })
 * - Ads: gtag('event', 'conversion', { send_to, currency, ...data })
 * - GTM: window.dataLayer.push({ event: eventName, ...data })
 */
export const multipleToolsSimultaneous: Flow.StepExample = {
  in: getEvent('order complete', { timestamp: 1700000107 }),
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
        value: 'data.total',
        currency: { key: 'data.currency', value: 'EUR' },
      },
    },
  },
  out: [
    [
      'gtag',
      'event',
      'purchase',
      {
        value: 555,
        currency: 'EUR',
        // include: ['data'] flattens data as prefixed params.
        data_id: '0rd3r1d',
        data_currency: 'EUR',
        data_shipping: 5.22,
        data_taxes: 73.76,
        data_total: 555,
        send_to: 'G-XXXXXX-1',
      },
    ],
    [
      'gtag',
      'event',
      'conversion',
      {
        send_to: 'AW-123456789/PURCHASE_CONV',
        currency: 'EUR',
        value: 555,
        data_id: '0rd3r1d',
        data_currency: 'EUR',
        data_shipping: 5.22,
        data_taxes: 73.76,
        data_total: 555,
      },
    ],
    [
      'dataLayer.push',
      {
        event: 'purchase',
        value: 555,
        currency: 'EUR',
        data_id: '0rd3r1d',
        data_currency: 'EUR',
        data_shipping: 5.22,
        data_taxes: 73.76,
        data_total: 555,
      },
    ],
  ],
};
