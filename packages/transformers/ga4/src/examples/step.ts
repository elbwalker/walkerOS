import type { Flow } from '@walkeros/core';

/**
 * Step examples for transformer-ga4.
 *
 * `in` is a raw `GA4Request` (`{ url, body? }`) — the shape the transformer
 * reads from `ctx.ingest`. `out` is the array of effect tuples produced by
 * pushing that request through the transformer:
 *
 *   - Mapped event (single):     `out: [['return', event]]`
 *   - Mapped events (fan-out):   `out: [['return', e1], ['return', e2], ...]`
 *   - Dropped (ignore / no en):  `out: [['return', false]]`
 *
 * Examples set `_p` (page load id), `_s` (hit sequence) and `sid` (becomes
 * `event.timestamp` in ms via `sid * 1000`) so the assertions are
 * deterministic. The synthetic walkerOS event shape mirrors what
 * `mapHitToEvents` produces in `map.ts`:
 *   - `id` derived from `tid`, `cid`, `_p`, `_s` and the event's position in
 *     the hit: 16 lowercase hex chars, unique per event, identical when the
 *     same hit is delivered twice (see `id.ts`)
 *   - `entity` + `action` derived from rule.name's first/rest words
 *   - `user.{id,device,session}` from `uid/cid/sid`
 *   - `source: { type: 'ga4', platform?, pageLoadId, hitSequence }` from
 *     `p`, `_p` and `_s`
 *   - `consent` from `gcs` (`G100` → all false, `G111` → all true)
 *   - `timing` from event `_et` (defaults to 0 if absent)
 *   - `trigger: 'ga4'` (hard-coded in v1)
 *   - `nested[]` only set when items are present (POST-only example below)
 */

// --- helpers (typed, no casts) -----------------------------------------------

const SID = '1700000000'; // → timestamp 1700000000000

function ga4Event(
  hitSequence: string,
  id: string,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id,
    timestamp: 1700000000000,
    timing: 0,
    trigger: 'ga4',
    user: { device: 'cid-1', session: SID },
    globals: {},
    source: { type: 'ga4', pageLoadId: 'p1', hitSequence },
    consent: {},
    ...overrides,
  };
}

// --- examples ---------------------------------------------------------------

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A standard GA4 page_view hit decoded to a walkerOS page view with id, title, and referrer.',
  in: {
    url:
      'https://www.google-analytics.com/g/collect' +
      '?v=2&tid=G-EXAMPLE&_p=p1&_s=1&cid=cid-1&sid=' +
      SID +
      '&en=page_view' +
      '&dl=https%3A%2F%2Fshop.example.com%2Fproducts%2Fsku-123' +
      '&dt=Trail%20Runner%20Pro' +
      '&dr=https%3A%2F%2Fshop.example.com%2F',
  },
  out: [
    [
      'return',
      ga4Event('1', '619920d96220c8f5', {
        name: 'page view',
        entity: 'page',
        action: 'view',
        data: {
          id: 'https://shop.example.com/products/sku-123',
          title: 'Trail Runner Pro',
          referrer: 'https://shop.example.com/',
        },
      }),
    ],
  ],
};

export const purchase: Flow.StepExample = {
  title: 'Purchase (canary)',
  description:
    'A GA4 purchase hit decoded to a walkerOS order complete event with id, currency, total, tax, shipping, and coupon.',
  in: {
    url:
      'https://www.google-analytics.com/g/collect' +
      '?v=2&tid=G-EXAMPLE&_p=p1&_s=2&cid=cid-1&sid=' +
      SID +
      '&en=purchase' +
      '&ep.transaction_id=T-9001' +
      '&ep.currency=EUR' +
      '&epn.value=149.97' +
      '&epn.tax=23.97' +
      '&epn.shipping=4.95' +
      '&ep.coupon=WELCOME10',
  },
  out: [
    [
      'return',
      ga4Event('2', '07590930f34326b6', {
        name: 'order complete',
        entity: 'order',
        action: 'complete',
        data: {
          id: 'T-9001',
          currency: 'EUR',
          total: 149.97,
          tax: 23.97,
          shipping: 4.95,
          coupon: 'WELCOME10',
        },
      }),
    ],
  ],
};

export const viewItem: Flow.StepExample = {
  title: 'View item',
  description:
    'A GA4 view_item hit decoded to a walkerOS product view event with currency and value.',
  in: {
    url:
      'https://www.google-analytics.com/g/collect' +
      '?v=2&tid=G-EXAMPLE&_p=p1&_s=3&cid=cid-1&sid=' +
      SID +
      '&en=view_item&ep.currency=EUR&epn.value=129.99',
  },
  out: [
    [
      'return',
      ga4Event('3', 'a6ef03f16d295aef', {
        name: 'product view',
        entity: 'product',
        action: 'view',
        data: { currency: 'EUR', value: 129.99 },
      }),
    ],
  ],
};

export const addToCart: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A GA4 add_to_cart hit decoded to a walkerOS product add event with currency and value.',
  in: {
    url:
      'https://www.google-analytics.com/g/collect' +
      '?v=2&tid=G-EXAMPLE&_p=p1&_s=4&cid=cid-1&sid=' +
      SID +
      '&en=add_to_cart&ep.currency=EUR&epn.value=129.99',
  },
  out: [
    [
      'return',
      ga4Event('4', '21854a0390595250', {
        name: 'product add',
        entity: 'product',
        action: 'add',
        data: { currency: 'EUR', value: 129.99 },
      }),
    ],
  ],
};

export const beginCheckout: Flow.StepExample = {
  title: 'Begin checkout',
  description:
    'A GA4 begin_checkout hit decoded to a walkerOS order start event with currency, value, and coupon.',
  in: {
    url:
      'https://www.google-analytics.com/g/collect' +
      '?v=2&tid=G-EXAMPLE&_p=p1&_s=5&cid=cid-1&sid=' +
      SID +
      '&en=begin_checkout' +
      '&ep.currency=EUR&epn.value=149.97&ep.coupon=WELCOME10',
  },
  out: [
    [
      'return',
      ga4Event('5', '04a3521d6259b559', {
        name: 'order start',
        entity: 'order',
        action: 'start',
        data: {
          currency: 'EUR',
          value: 149.97,
          coupon: 'WELCOME10',
        },
      }),
    ],
  ],
};

export const scroll: Flow.StepExample = {
  title: 'Scroll',
  description:
    'A GA4 scroll hit decoded to a walkerOS page scroll event with the percent_scrolled value.',
  in: {
    url:
      'https://www.google-analytics.com/g/collect' +
      '?v=2&tid=G-EXAMPLE&_p=p1&_s=6&cid=cid-1&sid=' +
      SID +
      '&en=scroll&epn.percent_scrolled=90',
  },
  out: [
    [
      'return',
      ga4Event('6', 'f4211610dcdb861a', {
        name: 'page scroll',
        entity: 'page',
        action: 'scroll',
        data: { percent: 90 },
      }),
    ],
  ],
};

export const search: Flow.StepExample = {
  title: 'Search',
  description:
    'A GA4 search hit decoded to a walkerOS search submit event carrying the search term.',
  in: {
    url:
      'https://www.google-analytics.com/g/collect' +
      '?v=2&tid=G-EXAMPLE&_p=p1&_s=7&cid=cid-1&sid=' +
      SID +
      '&en=search&ep.search_term=trail%20runner',
  },
  out: [
    [
      'return',
      ga4Event('7', '697710c0b9b403d3', {
        name: 'search submit',
        entity: 'search',
        action: 'submit',
        data: { term: 'trail runner' },
      }),
    ],
  ],
};

export const login: Flow.StepExample = {
  title: 'Login',
  description:
    'A GA4 login hit decoded to a walkerOS session login event with the auth method.',
  in: {
    url:
      'https://www.google-analytics.com/g/collect' +
      '?v=2&tid=G-EXAMPLE&_p=p1&_s=8&cid=cid-1&sid=' +
      SID +
      '&en=login&ep.method=google',
  },
  out: [
    [
      'return',
      ga4Event('8', 'e6aa65225205bcf4', {
        name: 'session login',
        entity: 'session',
        action: 'login',
        data: { method: 'google' },
      }),
    ],
  ],
};

export const customEvent: Flow.StepExample = {
  title: 'Custom event (* fallback)',
  description:
    'Unknown GA4 event names hit the * fallback rule and surface as a ga4 track event carrying the original name.',
  in: {
    url:
      'https://www.google-analytics.com/g/collect' +
      '?v=2&tid=G-EXAMPLE&_p=p1&_s=9&cid=cid-1&sid=' +
      SID +
      '&en=newsletter_subscribe&ep.source=footer',
  },
  out: [
    [
      'return',
      ga4Event('9', 'd7dff1eae9d981dd', {
        name: 'ga4 track',
        entity: 'ga4',
        action: 'track',
        data: { event_name: 'newsletter_subscribe' },
      }),
    ],
  ],
};

export const consentDenied: Flow.StepExample = {
  title: 'Consent denied (gcs=G100)',
  description:
    'A page_view hit with gcs=G100 still maps, with consent.{marketing,analytics} both false on the resulting event.',
  in: {
    url:
      'https://www.google-analytics.com/g/collect' +
      '?v=2&tid=G-EXAMPLE&_p=p1&_s=10&cid=cid-1&sid=' +
      SID +
      '&gcs=G100' +
      '&en=page_view&dl=https%3A%2F%2Fx&dt=X',
  },
  out: [
    [
      'return',
      ga4Event('10', 'eeb7b2eaa3880daf', {
        name: 'page view',
        entity: 'page',
        action: 'view',
        data: { id: 'https://x', title: 'X' },
        consent: { marketing: false, analytics: false },
      }),
    ],
  ],
};

export const userEngagementIgnored: Flow.StepExample = {
  title: 'user_engagement (ignored)',
  description:
    'Auto-fired GA4 user_engagement events are dropped by default — the transformer returns false.',
  in: {
    url:
      'https://www.google-analytics.com/g/collect' +
      '?v=2&tid=G-EXAMPLE&_p=p1&_s=11&cid=cid-1&sid=' +
      SID +
      '&en=user_engagement&_et=1500',
  },
  out: [['return', false]],
};

export const batchPost: Flow.StepExample = {
  title: 'Batched POST (fan-out)',
  description:
    'A single POST request carrying two newline-separated events fans out into two walkerOS events, each with its own id.',
  in: {
    url:
      'https://www.google-analytics.com/g/collect' +
      '?v=2&tid=G-EXAMPLE&_p=p1&_s=12&cid=cid-1&sid=' +
      SID,
    body: [
      'en=add_to_cart&ep.currency=EUR&epn.value=19.99',
      'en=add_to_cart&ep.currency=EUR&epn.value=29.99',
    ].join('\n'),
  },
  out: [
    [
      'return',
      ga4Event('12', 'fa7fa5554916cbb5', {
        name: 'product add',
        entity: 'product',
        action: 'add',
        data: { currency: 'EUR', value: 19.99 },
      }),
    ],
    [
      'return',
      ga4Event('12', 'fa82615549188e00', {
        name: 'product add',
        entity: 'product',
        action: 'add',
        data: { currency: 'EUR', value: 29.99 },
      }),
    ],
  ],
};
