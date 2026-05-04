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
 * (`track`, `identify`, `group`, `page`, `screen`) - not a raw HTTP endpoint.
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
  title: 'Default track',
  description:
    'A walker event becomes a Segment analytics.track call with userId and anonymousId resolved from the event.',
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
  title: 'Renamed event',
  description:
    "A mapping renames the event so the Segment track call uses Segment's canonical 'Order Completed' name.",
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
  title: 'Destination identify',
  description:
    'Destination-level identify fires Segment analytics.identify with traits on the first push only, then the track call follows.',
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
 * Per-event identify with silent -- user login fires identify() only.
 */
export const userLoginIdentify: SegmentStepExample = {
  title: 'User login identify',
  description:
    'A user login fires only Segment analytics.identify with the userId and traits, skipping the track.',
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
    silent: true,
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
 * Per-event group with silent -- company update fires group() only.
 */
export const companyGroup: SegmentStepExample = {
  title: 'Group company',
  description:
    'A company update fires Segment analytics.group with groupId and group traits for account-level tracking.',
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
    silent: true,
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
 * silent: true suppresses track(); settings.page fires analytics.page().
 */
export const pageView: SegmentStepExample = {
  title: 'Page view',
  description:
    'A page view fires Segment analytics.page with category, name, and properties instead of a generic track.',
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
    silent: true,
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
  title: 'Screen view',
  description:
    'A screen view fires Segment analytics.screen with name, category, and properties for mobile app tracking.',
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
    silent: true,
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
  title: 'Anonymous only',
  description:
    'When no userId is resolved Segment accepts a track call keyed solely by anonymousId.',
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
  title: 'Consent forwarding',
  description:
    'Walker consent keys are mapped to Segment categoryPreferences on the analytics context for downstream filtering.',
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
  public: false,
  in: getEvent('debug noise', {
    timestamp: 1700000109,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: { ignore: true },
  out: [],
};
