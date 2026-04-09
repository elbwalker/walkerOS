import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Examples may optionally override destination-level settings for a test.
 * The test runner reads `settings` from the example and merges it into the
 * base destination settings (on top of the fixed `apiKey`). Used by examples
 * that exercise destination-level `settings.identify` / `settings.include`,
 * and by `command: 'consent'` examples that need `settings.consent` set.
 */
export type ClarityStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
};

/**
 * Default event forwarding — every walkerOS event becomes Clarity.event(name).
 * No mapping rule; the destination's default push behavior fires.
 */
export const defaultEventForwarding: ClarityStepExample = {
  in: getEvent('product view', { timestamp: 1700000100 }),
  out: ['clarity.event', 'product view'],
};

/**
 * Wildcard ignore pattern — the standard walkerOS way to suppress noisy events.
 * The destination forwards by default; users opt OUT via `"*": { "*": { ignore: true } }`
 * plus explicit allows. This example IS an ignored event — the destination
 * must produce zero calls.
 */
export const wildcardIgnored: ClarityStepExample = {
  in: getEvent('debug noise', { timestamp: 1700000101 }),
  mapping: { ignore: true },
  out: [],
};

/**
 * Identity via settings.identify (per-event, user login).
 * Resolves positional args for Clarity.identify(customId, sessionId, pageId, friendlyName).
 * Trailing undefined args are omitted, so all four args are passed when friendlyName is set.
 * Then fires the default Clarity.event(...) forwarding.
 */
export const userLoginIdentify: ClarityStepExample = {
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
 * Destination-level settings.identify — Clarity officially recommends calling
 * identify() on every page load. walkerOS expresses this via destination-level
 * `settings.identify`, which fires on every push.
 */
export const destinationLevelIdentify: ClarityStepExample = {
  in: getEvent('page view', { timestamp: 1700000103 }),
  settings: {
    identify: {
      map: {
        customId: 'user.id',
      },
    },
  },
  out: [
    ['clarity.identify', 'us3r'],
    ['clarity.event', 'page view'],
  ],
};

/**
 * Explicit custom tags via mapping.settings.set.
 * Each resolved key → Clarity.setTag(key, value). Tags fire after identify
 * but before the default event.
 */
export const productViewWithTags: ClarityStepExample = {
  in: getEvent('product view', { timestamp: 1700000104 }),
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
 * Array tag values — Clarity.setTag(key, value) natively accepts string[].
 * walkerOS array values are passed through unchanged (each element is
 * coerced to string, but the array shape is preserved — no flattening,
 * no splitting into multiple calls).
 */
export const arrayTagValue: ClarityStepExample = {
  in: getEvent('product view', {
    timestamp: 1700000105,
    data: {
      id: 'ers',
      name: 'Everyday Ruck Snack',
      color: 'black',
      size: 'l',
      price: 420,
      tags: ['sale', 'featured'],
    },
  }),
  mapping: {
    settings: {
      set: {
        map: {
          product_tags: 'data.tags',
        },
      },
    },
  },
  out: [
    ['clarity.setTag', 'product_tags', ['sale', 'featured']],
    ['clarity.event', 'product view'],
  ],
};

/**
 * Session priority upgrade — mark this session as important so Clarity retains
 * it beyond the sampling cap. upgrade fires before the default event.
 */
export const orderCompleteUpgrade: ClarityStepExample = {
  in: getEvent('order complete', { timestamp: 1700000106 }),
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
export const orderCompleteInclude: ClarityStepExample = {
  in: getEvent('order complete', { timestamp: 1700000107 }),
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
 * Combined-feature rule — Clarity's canonical usage pattern: identify the
 * user, set session tags, upgrade session priority, then fire the event.
 * This is the authoritative test for the push execution order
 * (identify → tags → upgrade → event).
 */
export const combinedFeatures: ClarityStepExample = {
  in: getEvent('order complete', { timestamp: 1700000108 }),
  mapping: {
    name: 'Purchase',
    settings: {
      identify: { map: { customId: 'user.id' } },
      set: { map: { order_id: 'data.id' } },
      upgrade: { value: 'purchase' },
    },
  },
  out: [
    ['clarity.identify', 'us3r'],
    ['clarity.setTag', 'order_id', '0rd3r1d'],
    ['clarity.upgrade', 'purchase'],
    ['clarity.event', 'Purchase'],
  ],
};

/**
 * mapping.skip — the rule runs (set/identify/upgrade all execute) but the
 * default Clarity.event(...) call is suppressed. Useful for page view, where
 * Clarity has its own page tracking and you only want to set tags.
 */
export const pageViewSkip: ClarityStepExample = {
  in: getEvent('page view', { timestamp: 1700000109 }),
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
export const consentGrantBoth: ClarityStepExample = {
  command: 'consent',
  in: { analytics: true, marketing: true } as WalkerOS.Consent,
  settings: {
    consent: {
      analytics: 'analytics_Storage',
      marketing: 'ad_Storage',
    },
  },
  out: [
    [
      'clarity.consentV2',
      { analytics_Storage: 'granted', ad_Storage: 'granted' },
    ],
  ],
};

/**
 * Consent revocation — denied categories call Clarity.consentV2(...) with
 * denied flags. The destination does NOT call the legacy `Clarity.consent(false)`
 * API at all — consentV2 is the single source of truth for consent state.
 */
export const consentRevoke: ClarityStepExample = {
  command: 'consent',
  in: { analytics: false, marketing: false } as WalkerOS.Consent,
  settings: {
    consent: {
      analytics: 'analytics_Storage',
      marketing: 'ad_Storage',
    },
  },
  out: [
    [
      'clarity.consentV2',
      { analytics_Storage: 'denied', ad_Storage: 'denied' },
    ],
  ],
};
