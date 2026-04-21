import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Extended step example that may carry destination-level settings overrides.
 */
export type SegmentStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
};

/**
 * Segment server destination invokes the injected `env.analytics` SDK methods
 * (`track`, `identify`, `group`, `page`, `screen`) — not a raw HTTP endpoint.
 * Each `out` entry is therefore `[callable, params]` where `callable` is the
 * dotted method name (e.g. `'analytics.track'`) and `params` is the object
 * passed to the SDK.
 *
 * Examples may emit multiple calls in order (e.g. identify + track), so
 * every `out` is wrapped as `[[callable, params], ...]`.
 */

/**
 * Default event forwarding -- analytics.track() with event name and empty
 * properties. userId resolved from default settings.userId = 'user.id'.
 */
export const defaultTrack: SegmentStepExample = {
  in: getEvent('product view', {
    timestamp: 1700000100,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  out: [
    [
      'analytics.track',
      {
        userId: 'us3r',
        anonymousId: 's3ss10n',
        event: 'product view',
        properties: {},
        timestamp: new Date(1700000100),
      },
    ],
  ],
};

/**
 * Mapped event name -- mapping.name renames the event for Segment.
 */
export const mappedEventName: SegmentStepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000101,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: {
    name: 'Order Completed',
  },
  out: [
    [
      'analytics.track',
      {
        userId: 'us3r',
        anonymousId: 's3ss10n',
        event: 'Order Completed',
        properties: {},
        timestamp: new Date(1700000101),
      },
    ],
  ],
};

/**
 * Destination-level identify -- fires analytics.identify() on first push
 * when settings.identify mapping resolves. Then fires analytics.track().
 */
export const destinationIdentify: SegmentStepExample = {
  in: getEvent('page view', {
    timestamp: 1700000102,
    user: { id: 'us3r', session: 's3ss10n', email: 'user@example.com' },
  }),
  settings: {
    identify: {
      map: {
        traits: {
          map: {
            email: 'user.email',
          },
        },
      },
    },
  },
  out: [
    [
      'analytics.identify',
      {
        userId: 'us3r',
        anonymousId: 's3ss10n',
        traits: { email: 'user@example.com' },
        timestamp: new Date(1700000102),
      },
    ],
    [
      'analytics.track',
      {
        userId: 'us3r',
        anonymousId: 's3ss10n',
        event: 'page view',
        properties: {},
        timestamp: new Date(1700000102),
      },
    ],
  ],
};

/**
 * Per-event identify with skip -- user login fires identify() only.
 */
export const userLoginIdentify: SegmentStepExample = {
  in: getEvent('user login', {
    timestamp: 1700000103,
    user: { id: 'us3r', session: 's3ss10n' },
    data: {
      user_id: 'new-user-123',
      email: 'user@acme.com',
      name: 'Jane Doe',
      plan: 'premium',
    },
  }),
  mapping: {
    skip: true,
    settings: {
      identify: {
        map: {
          userId: 'data.user_id',
          traits: {
            map: {
              email: 'data.email',
              name: 'data.name',
              plan: 'data.plan',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'analytics.identify',
      {
        userId: 'new-user-123',
        anonymousId: 's3ss10n',
        traits: { email: 'user@acme.com', name: 'Jane Doe', plan: 'premium' },
        timestamp: new Date(1700000103),
      },
    ],
  ],
};

/**
 * Per-event group with skip -- company update fires group() only.
 */
export const companyGroup: SegmentStepExample = {
  in: getEvent('company update', {
    timestamp: 1700000104,
    user: { id: 'us3r', session: 's3ss10n' },
    data: {
      company_id: 'comp-456',
      company_name: 'Acme',
      industry: 'tech',
      employees: 50,
    },
  }),
  mapping: {
    skip: true,
    settings: {
      group: {
        map: {
          groupId: 'data.company_id',
          traits: {
            map: {
              name: 'data.company_name',
              industry: 'data.industry',
              employees: 'data.employees',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'analytics.group',
      {
        userId: 'us3r',
        anonymousId: 's3ss10n',
        groupId: 'comp-456',
        traits: { name: 'Acme', industry: 'tech', employees: 50 },
        timestamp: new Date(1700000104),
      },
    ],
  ],
};

/**
 * Explicit page() call with properties -- the canonical Segment page view.
 * skip: true suppresses track(); settings.page fires analytics.page().
 */
export const pageView: SegmentStepExample = {
  in: getEvent('page view', {
    timestamp: 1700000105,
    user: { id: 'us3r', session: 's3ss10n' },
    data: {
      category: 'docs',
      title: 'Getting Started',
      section: 'tutorials',
    },
  }),
  mapping: {
    skip: true,
    settings: {
      page: {
        map: {
          category: 'data.category',
          name: 'data.title',
          properties: {
            map: {
              section: 'data.section',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'analytics.page',
      {
        userId: 'us3r',
        anonymousId: 's3ss10n',
        category: 'docs',
        name: 'Getting Started',
        properties: { section: 'tutorials' },
        timestamp: new Date(1700000105),
      },
    ],
  ],
};

/**
 * Screen call -- server-only method for mobile app backends.
 */
export const screenView: SegmentStepExample = {
  in: getEvent('screen view', {
    timestamp: 1700000106,
    user: { id: 'us3r', session: 's3ss10n' },
    data: {
      screen_name: 'Welcome',
      section: 'onboarding',
      build: '1.2.3',
    },
  }),
  mapping: {
    skip: true,
    settings: {
      screen: {
        map: {
          name: 'data.screen_name',
          category: 'data.section',
          properties: {
            map: {
              build: 'data.build',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'analytics.screen',
      {
        userId: 'us3r',
        anonymousId: 's3ss10n',
        name: 'Welcome',
        category: 'onboarding',
        properties: { build: '1.2.3' },
        timestamp: new Date(1700000106),
      },
    ],
  ],
};

/**
 * AnonymousId only -- no userId resolved. Segment accepts anonymousId alone.
 */
export const anonymousOnly: SegmentStepExample = {
  in: getEvent('product view', {
    timestamp: 1700000107,
    user: { session: 's3ss10n' },
  }),
  settings: {
    userId: undefined,
  },
  out: [
    [
      'analytics.track',
      {
        anonymousId: 's3ss10n',
        event: 'product view',
        properties: {},
        timestamp: new Date(1700000107),
      },
    ],
  ],
};

/**
 * Consent context forwarding -- settings.consent maps walkerOS consent
 * keys to Segment categoryPreferences on the context object.
 */
export const consentForwarding: SegmentStepExample = {
  in: getEvent('product view', {
    timestamp: 1700000108,
    user: { id: 'us3r', session: 's3ss10n' },
    consent: { analytics: true, marketing: true },
  }),
  settings: {
    consent: {
      analytics: 'Analytics',
      marketing: 'Advertising',
    },
  },
  out: [
    [
      'analytics.track',
      {
        userId: 'us3r',
        anonymousId: 's3ss10n',
        event: 'product view',
        properties: {},
        timestamp: new Date(1700000108),
        context: {
          consent: {
            categoryPreferences: {
              Analytics: true,
              Advertising: true,
            },
          },
        },
      },
    ],
  ],
};

/**
 * Wildcard ignore -- the event matches a mapping rule with ignore: true.
 * The destination fires zero SDK calls.
 */
export const wildcardIgnored: SegmentStepExample = {
  in: getEvent('debug noise', {
    timestamp: 1700000109,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: { ignore: true },
  out: [],
};
