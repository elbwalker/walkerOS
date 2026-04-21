import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Extended step example that may carry destination-level settings overrides.
 */
export type OptimizelyStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
};

/**
 * Default event forwarding -- every walkerOS event becomes
 * userContext.trackEvent(event.name). No mapping, no eventTags.
 */
export const defaultEventForwarding: OptimizelyStepExample = {
  title: 'Default event',
  description:
    'A walker event becomes an Optimizely trackEvent call with the event name and empty eventTags.',
  in: getEvent('page view', { timestamp: 1700000100 }),
  out: [['optimizely.trackEvent', 'page view', {}]],
};

/**
 * Mapped event name -- mapping.name renames the event key for Optimizely.
 * The eventKey must match an event created in the Optimizely project.
 */
export const mappedEventName: OptimizelyStepExample = {
  title: 'Mapped event key',
  description:
    'A mapping renames the walker event to an Optimizely event key defined in the project.',
  in: getEvent('product view', { timestamp: 1700000101 }),
  mapping: {
    name: 'product_viewed',
  },
  out: [['optimizely.trackEvent', 'product_viewed', {}]],
};

/**
 * Revenue tracking -- mapping.settings.revenue resolves to an integer
 * (cents). Passed as eventTags.revenue. The value is a pass-through;
 * the user must provide cents (e.g. 55500 = $555.00).
 */
export const orderCompleteRevenue: OptimizelyStepExample = {
  title: 'Purchase revenue',
  description:
    'An order fires an Optimizely purchase event with revenue in cents, value, and additional event tags.',
  in: getEvent('order complete', {
    timestamp: 1700000102,
    data: {
      revenue_cents: 55500,
      total: 555,
      currency: 'EUR',
      item_count: 3,
    },
  }),
  mapping: {
    name: 'purchase',
    settings: {
      revenue: 'data.revenue_cents',
      value: 'data.total',
      eventTags: {
        map: {
          currency: 'data.currency',
          item_count: 'data.item_count',
        },
      },
    },
  },
  out: [
    [
      'optimizely.trackEvent',
      'purchase',
      { revenue: 55500, value: 555, currency: 'EUR', item_count: 3 },
    ],
  ],
};

/**
 * Per-event attributes -- mapping.settings.attributes resolves to
 * key-value pairs that are applied via setAttribute() before trackEvent().
 */
export const signupWithAttributes: OptimizelyStepExample = {
  title: 'Signup with attributes',
  description:
    'A user signup sets per-event Optimizely attributes via setAttribute before firing the trackEvent.',
  in: getEvent('user signup', {
    timestamp: 1700000103,
    data: {
      method: 'google',
      source: 'referral',
    },
  }),
  mapping: {
    name: 'signup',
    settings: {
      attributes: {
        map: {
          signup_method: 'data.method',
          referral_source: 'data.source',
        },
      },
    },
  },
  out: [
    ['optimizely.setAttribute', 'signup_method', 'google'],
    ['optimizely.setAttribute', 'referral_source', 'referral'],
    ['optimizely.trackEvent', 'signup', {}],
  ],
};

/**
 * Wildcard ignore -- walkerOS's standard way to drop events. The rule
 * matches but does nothing. The destination fires zero SDK calls.
 */
export const wildcardIgnored: OptimizelyStepExample = {
  public: false,
  in: getEvent('debug noise', { timestamp: 1700000104 }),
  mapping: { ignore: true },
  out: [],
};

/**
 * Skip track with attributes only -- fires setAttribute calls but no
 * trackEvent. Useful for enriching user context without a conversion.
 */
export const attributesOnlySkipTrack: OptimizelyStepExample = {
  title: 'Attributes only',
  description:
    'A profile update sets Optimizely user attributes without firing a trackEvent for user enrichment.',
  in: getEvent('profile update', {
    timestamp: 1700000105,
    data: {
      plan: 'premium',
      country: 'DE',
    },
  }),
  mapping: {
    skip: true,
    settings: {
      attributes: {
        map: {
          plan: 'data.plan',
          country: 'data.country',
        },
      },
    },
  },
  out: [
    ['optimizely.setAttribute', 'plan', 'premium'],
    ['optimizely.setAttribute', 'country', 'DE'],
  ],
};

/**
 * Consent revoked -- the destination closes the Optimizely client,
 * flushing queued events and stopping datafile polling.
 */
export const consentRevoked: OptimizelyStepExample = {
  title: 'Consent revoked',
  description:
    'A walker consent command with analytics denied closes the Optimizely client and flushes queued events.',
  command: 'consent',
  in: { analytics: false } as WalkerOS.Consent,
  settings: {} as Partial<Settings>,
  out: [['optimizely.close']],
};

/**
 * Consent granted -- no immediate SDK action needed. The destination
 * re-initializes on the next push (walkerOS queues events until consent
 * is granted, then re-inits). No calls expected.
 */
export const consentGranted: OptimizelyStepExample = {
  public: false,
  command: 'consent',
  in: { analytics: true } as WalkerOS.Consent,
  settings: {} as Partial<Settings>,
  out: [],
};
