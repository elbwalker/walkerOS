import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * Default event forwarding — every walkerOS event becomes Clarity.event(name).
 * No mapping rule; the destination's default push behavior fires.
 */
export const defaultEventForwarding: Flow.StepExample = {
  in: getEvent('product view', { timestamp: 1700000100 }),
  out: ['clarity.event', 'product view'],
};

/**
 * Wildcard ignore pattern — the standard walkerOS way to suppress noisy events.
 * The destination forwards by default; users opt OUT via `"*": { "*": { ignore: true } }`
 * plus explicit allows. This example IS an ignored event — the destination
 * must produce zero calls.
 */
export const wildcardIgnored: Flow.StepExample = {
  in: getEvent('debug noise', { timestamp: 1700000101 }),
  mapping: { ignore: true },
  out: [],
};

/**
 * Identity via settings.identify (per-event, user login).
 * Resolves positional args for Clarity.identify(customId, sessionId, pageId, friendlyName).
 * Then fires the default Clarity.event(...) forwarding.
 */
export const userLoginIdentify: Flow.StepExample = {
  in: getEvent('user login', {
    timestamp: 1700000102,
    data: { id: 'u-123', name: 'Jane Doe' },
  }),
  mapping: {
    settings: {
      identify: {
        map: {
          customId: 'data.id',
          friendlyName: 'data.name',
        },
      },
    },
  },
  out: [
    ['clarity.identify', 'u-123', undefined, undefined, 'Jane Doe'],
    ['clarity.event', 'user login'],
  ],
};

/**
 * Explicit custom tags via mapping.settings.set.
 * Each resolved key → Clarity.setTag(key, value). Tags fire BEFORE the default event.
 */
export const productViewWithTags: Flow.StepExample = {
  in: getEvent('product view', { timestamp: 1700000103 }),
  mapping: {
    settings: {
      set: {
        map: {
          product_color: 'data.color',
          product_id: 'data.id',
        },
      },
    },
  },
  out: [
    ['clarity.setTag', 'product_color', 'black'],
    ['clarity.setTag', 'product_id', 'ers'],
    ['clarity.event', 'product view'],
  ],
};

/**
 * Session priority upgrade — mark this session as important so Clarity retains it
 * beyond the sampling cap. upgrade fires before the default event.
 */
export const orderCompleteUpgrade: Flow.StepExample = {
  in: getEvent('order complete', { timestamp: 1700000104 }),
  mapping: {
    name: 'Purchase',
    settings: {
      upgrade: { value: 'purchase' },
    },
  },
  out: [
    ['clarity.upgrade', 'purchase'],
    ['clarity.event', 'Purchase'],
  ],
};

/**
 * settings.include flattens a walkerOS event section into Clarity.setTag calls.
 * Primitives coerce to strings; arrays pass through as string[].
 * The example includes `data` only; keys become `data_<field>`.
 */
export const orderCompleteInclude: Flow.StepExample = {
  in: getEvent('order complete', { timestamp: 1700000105 }),
  mapping: {
    settings: {
      include: ['data'],
    },
  },
  out: [
    ['clarity.setTag', 'data_id', '0rd3r1d'],
    ['clarity.setTag', 'data_currency', 'EUR'],
    ['clarity.setTag', 'data_shipping', '5.22'],
    ['clarity.setTag', 'data_taxes', '73.76'],
    ['clarity.setTag', 'data_total', '555'],
    ['clarity.event', 'order complete'],
  ],
};

/**
 * mapping.skip — the rule runs (set/identify/upgrade all execute) but the
 * default Clarity.event(...) call is suppressed. Useful for page view, where
 * Clarity has its own page tracking and you only want to set tags.
 */
export const pageViewSkip: Flow.StepExample = {
  in: getEvent('page view', { timestamp: 1700000106 }),
  mapping: {
    skip: true,
    settings: {
      set: {
        map: {
          page_id: 'data.id',
        },
      },
    },
  },
  out: [['clarity.setTag', 'page_id', '/docs/']],
};

/**
 * Consent translation via settings.consent.
 * walkerOS consent { analytics: true, marketing: true } with the mapping
 * { analytics: 'analytics_Storage', marketing: 'ad_Storage' } fires:
 *   Clarity.consentV2({ analytics_Storage: 'granted', ad_Storage: 'granted' })
 *
 * Uses the canonical StepExample.command='consent' pattern: the test runner
 * dispatches via elb('walker consent', in) instead of pushing an event.
 */
export const consentGrantBoth: Flow.StepExample = {
  command: 'consent',
  in: { analytics: true, marketing: true } as WalkerOS.Consent,
  out: [
    [
      'clarity.consentV2',
      { analytics_Storage: 'granted', ad_Storage: 'granted' },
    ],
  ],
};

/**
 * Consent revocation — denied consent calls Clarity.consentV2(...) with denied
 * flags AND Clarity.consent(false) (the legacy v1 API that erases cookies
 * and ends the session).
 */
export const consentRevoke: Flow.StepExample = {
  command: 'consent',
  in: { analytics: false, marketing: false } as WalkerOS.Consent,
  out: [
    [
      'clarity.consentV2',
      { analytics_Storage: 'denied', ad_Storage: 'denied' },
    ],
    ['clarity.consent', false],
  ],
};
