import type { Flow } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';
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
    id: 'ev1700000100',
    timestamp: 1700000100,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  out: [
    [
      'analytics.track',
      {
        messageId: 'ev1700000100',
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
    id: 'ev1700000101',
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
        messageId: 'ev1700000101',
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
    id: 'ev1700000102',
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
        messageId: 'ev1700000102-identify',
        userId: 'us3r',
        anonymousId: 's3ss10n',
        traits: { email: 'user@example.com' },
        timestamp: new Date(1700000102),
      },
    ],
    [
      'analytics.track',
      {
        messageId: 'ev1700000102',
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
  in: createEvent({
    name: 'user login',
    id: 'ev1700000103',
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
        messageId: 'ev1700000103-identify',
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
  in: createEvent({
    name: 'company update',
    id: 'ev1700000104',
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
        messageId: 'ev1700000104-group',
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
    id: 'ev1700000105',
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
        messageId: 'ev1700000105-page',
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
  in: createEvent({
    name: 'screen view',
    id: 'ev1700000106',
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
        messageId: 'ev1700000106-screen',
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
    id: 'ev1700000107',
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
        messageId: 'ev1700000107',
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
    id: 'ev1700000108',
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
        messageId: 'ev1700000108',
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
 * No identity -- neither userId nor anonymousId resolves from the event, so
 * Segment cannot take it: the push fails with missing-input instead of
 * counting as delivered. One per event name above, so every example's event
 * without identity has its declared outcome.
 */
function withoutIdentity(name: string, timestamp: number): SegmentStepExample {
  const [entity, action] = name.split(' ');
  return {
    public: false,
    description: `A ${name} event without userId or anonymousId cannot be sent to Segment: the push fails with missing-input instead of counting as delivered.`,
    in: { name, entity, action, timestamp },
    out: [],
    outcome: { status: 'failed', code: 'missing-input', retryable: false },
  };
}

export const noIdentityProduct = withoutIdentity('product view', 1700000110);
export const noIdentityOrder = withoutIdentity('order complete', 1700000111);
export const noIdentityPage = withoutIdentity('page view', 1700000112);
export const noIdentityLogin = withoutIdentity('user login', 1700000113);
export const noIdentityCompany = withoutIdentity('company update', 1700000114);
export const noIdentityScreen = withoutIdentity('screen view', 1700000115);

/** A silent rule without identify, group, page or screen calls nothing. */
export const silentRule: SegmentStepExample = {
  public: false,
  description:
    'A rule with silent: true and no identify, group, page or screen mapping sends nothing to Segment.',
  in: getEvent('page view', {
    timestamp: 1700000116,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: { silent: true },
  out: [],
};

/**
 * Wildcard ignore -- the event matches a mapping rule with ignore: true.
 * The destination fires zero SDK calls.
 */
export const wildcardIgnored: SegmentStepExample = {
  public: false,
  in: createEvent({
    name: 'debug noise',
    timestamp: 1700000109,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: { ignore: true },
  out: [],
};

/**
 * The silent group rule of companyGroup on an event without company data: no
 * groupId resolves and the rule suppresses the track, so nothing is sent.
 */
export const companyGroupWithoutData: SegmentStepExample = {
  public: false,
  description:
    'A silent group rule whose groupId finds no data sends nothing: an unmet mapping, not a failure, so the push returns normally.',
  in: {
    name: 'company update',
    entity: 'company',
    action: 'update',
    timestamp: 1700000120,
    user: { id: 'us3r', session: 's3ss10n' },
  },
  mapping: companyGroup.mapping,
  out: [],
};
