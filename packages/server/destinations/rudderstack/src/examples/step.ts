import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Extended step example that may carry destination-level settings overrides.
 */
export type RudderStackStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
};

/**
 * RudderStack server destination invokes the injected `env.analytics` SDK
 * methods (`track`, `identify`, `group`, `page`, `screen`, `alias`) — not a
 * raw HTTP endpoint. Each `out` entry is therefore
 * `[callable, params]` where `callable` is the dotted method name
 * (e.g. `'analytics.track'`) and `params` is the object passed to the SDK.
 *
 * Examples may emit multiple calls in order (e.g. identify + track), so
 * every `out` is wrapped as `[[callable, params], ...]`.
 */

/**
 * Default event forwarding -- analytics.track() with event name and empty
 * properties. userId resolved from default settings.userId = 'user.id'.
 */
export const defaultTrack: RudderStackStepExample = {
  title: 'Default track',
  description:
    'A walker event becomes a RudderStack analytics.track call with userId and anonymousId resolved from the event.',
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
 * Mapped event name -- mapping.name renames the event for RudderStack.
 */
export const mappedEventName: RudderStackStepExample = {
  title: 'Renamed event',
  description:
    'A mapping renames the event so the RudderStack track call uses a canonical name such as Order Completed.',
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
export const destinationIdentify: RudderStackStepExample = {
  title: 'Destination identify',
  description:
    'Destination-level identify fires analytics.identify with traits before each track call.',
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
export const userLoginIdentify: RudderStackStepExample = {
  title: 'User login identify',
  description:
    'A user login fires only an analytics.identify call with the resolved userId and traits, skipping the track.',
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
export const companyGroup: RudderStackStepExample = {
  title: 'Group company',
  description:
    'A company update fires analytics.group with the groupId and group traits for B2B account tracking.',
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
 * Explicit page() call with properties. RudderStack requires name -- resolved
 * from mapping. skip: true suppresses track().
 */
export const pageView: RudderStackStepExample = {
  title: 'Page view',
  description:
    'A page view fires analytics.page with a resolved page name and properties instead of a generic track.',
  in: getEvent('page view', {
    timestamp: 1700000105,
    user: { id: 'us3r', session: 's3ss10n' },
    data: {
      title: 'Getting Started',
      section: 'tutorials',
    },
  }),
  mapping: {
    skip: true,
    settings: {
      page: {
        map: {
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
        name: 'Getting Started',
        properties: { section: 'tutorials' },
        timestamp: new Date(1700000105),
      },
    ],
  ],
};

/**
 * Screen call -- server-only method for mobile app backends.
 * RudderStack requires name -- resolved from mapping.
 */
export const screenView: RudderStackStepExample = {
  title: 'Screen view',
  description:
    'A screen view from a mobile app backend fires analytics.screen with a screen name and properties.',
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
        properties: { build: '1.2.3' },
        timestamp: new Date(1700000106),
      },
    ],
  ],
};

/**
 * Alias call -- links anonymous user identity to registered user.
 * skip: true suppresses track(). Requires previousId from mapping.
 */
export const aliasUser: RudderStackStepExample = {
  title: 'Alias user',
  description:
    'An identity merge fires analytics.alias to link a previous anonymous id to the newly registered user id.',
  in: getEvent('identity merge', {
    timestamp: 1700000107,
    user: { id: 'registered-456', session: 's3ss10n' },
    data: {
      anonymous_id: 'anonymous-123',
    },
  }),
  mapping: {
    skip: true,
    settings: {
      alias: {
        map: {
          previousId: 'data.anonymous_id',
        },
      },
    },
  },
  out: [
    [
      'analytics.alias',
      {
        userId: 'registered-456',
        previousId: 'anonymous-123',
        timestamp: new Date(1700000107),
      },
    ],
  ],
};

/**
 * AnonymousId only -- no userId resolved. RudderStack accepts anonymousId alone.
 */
export const anonymousOnly: RudderStackStepExample = {
  title: 'Anonymous only',
  description:
    'When no userId is resolved RudderStack accepts the track call keyed solely by anonymousId.',
  in: getEvent('product view', {
    timestamp: 1700000108,
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
        timestamp: new Date(1700000108),
      },
    ],
  ],
};

/**
 * Wildcard ignore -- the event matches a mapping rule with ignore: true.
 * The destination fires zero SDK calls.
 */
export const wildcardIgnored: RudderStackStepExample = {
  public: false,
  in: getEvent('debug noise', {
    timestamp: 1700000109,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: { ignore: true },
  out: [],
};
