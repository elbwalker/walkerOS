import type { Flow, WalkerOS } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Extended step example that may carry destination-level settings overrides.
 */
export type OptimizelyStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
  /** Consent granted before `in` so a gated destination is loaded first. */
  before?: WalkerOS.Consent;
};

/**
 * Default event forwarding -- every walkerOS event becomes
 * userContext.trackEvent(event.name). No mapping, no eventTags.
 */
export const defaultEventForwarding: OptimizelyStepExample = {
  title: 'Default event',
  description:
    'A walker event becomes an Optimizely trackEvent call with the event name and empty eventTags.',
  in: getEvent('page view', { timestamp: 1700000100000 }),
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
  in: getEvent('product view', { timestamp: 1700000101000 }),
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
    timestamp: 1700000102000,
    data: {
      revenue_cents: 55500,
      value: 555,
      currency: 'EUR',
      item_count: 3,
    },
  }),
  mapping: {
    name: 'purchase',
    settings: {
      revenue: 'data.revenue_cents',
      value: 'data.value',
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
  in: createEvent({
    name: 'user signup',
    timestamp: 1700000103000,
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
  in: createEvent({ name: 'debug noise', timestamp: 1700000104000 }),
  mapping: { ignore: true },
  out: [],
};

/**
 * Skip track with attributes only -- fires setAttribute calls but no
 * trackEvent. Useful for enriching user context without a conversion.
 */
export const attributesOnlySilent: OptimizelyStepExample = {
  title: 'Attributes only',
  description:
    'A profile update sets Optimizely user attributes without firing a trackEvent for user enrichment.',
  in: createEvent({
    name: 'profile update',
    timestamp: 1700000105000,
    data: {
      plan: 'premium',
      country: 'DE',
    },
  }),
  mapping: {
    silent: true,
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
 * Consent revoked: no vendor call. Optimizely sends only what walkerOS tracks,
 * which the consent gate stops, so the client keeps running.
 */
export const consentRevoked: OptimizelyStepExample = {
  title: 'Consent revoked',
  description:
    'For a destination with config.consent { analytics: true }, a walker consent command with analytics denied makes no Optimizely call: walkerOS stops tracking for the destination, and the client stays ready for the next grant.',
  command: 'consent',
  before: { analytics: true },
  in: { analytics: false },
  out: [],
};

/**
 * Consent granted: no SDK call. The client kept running, so the next push
 * after a grant tracks again.
 */
export const consentGranted: OptimizelyStepExample = {
  public: false,
  description:
    'A walker consent grant makes no Optimizely call: the client kept running, so the next push tracks again.',
  command: 'consent',
  in: { analytics: true },
  out: [],
};

/** A silent rule sends no trackEvent. */
export const silentRule: OptimizelyStepExample = {
  public: false,
  description:
    'A rule with silent: true sends no trackEvent call; the user context the rule settings run on is still created.',
  in: getEvent('page view', { timestamp: 1700000106000 }),
  mapping: { silent: true },
  out: [['optimizely.createInstance.createUserContext', 'us3r', {}]],
};

/** Page view without a user: settings.userId resolves to nothing, nothing is sent. */
export const missingUserOnPageView: OptimizelyStepExample = {
  public: false,
  description:
    'Without a user id, settings.userId resolves to nothing: no user context can be created, so the push fails with missing-input instead of counting as delivered.',
  in: { name: 'page view', entity: 'page', action: 'view' },
  out: [],
  outcome: { status: 'failed', code: 'missing-input' },
};

/** Product view without a user: settings.userId resolves to nothing, nothing is sent. */
export const missingUserOnProductView: OptimizelyStepExample = {
  public: false,
  description:
    'Without a user id, settings.userId resolves to nothing: no user context can be created, so the push fails with missing-input instead of counting as delivered.',
  in: { name: 'product view', entity: 'product', action: 'view' },
  out: [],
  outcome: { status: 'failed', code: 'missing-input' },
};

/** Order complete without a user: settings.userId resolves to nothing, nothing is sent. */
export const missingUserOnOrderComplete: OptimizelyStepExample = {
  public: false,
  description:
    'Without a user id, settings.userId resolves to nothing: no user context can be created, so the push fails with missing-input instead of counting as delivered.',
  in: { name: 'order complete', entity: 'order', action: 'complete' },
  out: [],
  outcome: { status: 'failed', code: 'missing-input' },
};

/** User signup without a user: settings.userId resolves to nothing, nothing is sent. */
export const missingUserOnUserSignup: OptimizelyStepExample = {
  public: false,
  description:
    'Without a user id, settings.userId resolves to nothing: no user context can be created, so the push fails with missing-input instead of counting as delivered.',
  in: { name: 'user signup', entity: 'user', action: 'signup' },
  out: [],
  outcome: { status: 'failed', code: 'missing-input' },
};

/** Profile update without a user: settings.userId resolves to nothing, nothing is sent. */
export const missingUserOnProfileUpdate: OptimizelyStepExample = {
  public: false,
  description:
    'Without a user id, settings.userId resolves to nothing: no user context can be created, so the push fails with missing-input instead of counting as delivered.',
  in: { name: 'profile update', entity: 'profile', action: 'update' },
  out: [],
  outcome: { status: 'failed', code: 'missing-input' },
};
