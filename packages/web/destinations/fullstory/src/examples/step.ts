import type { Flow, WalkerOS } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Extended step example that may carry destination-level settings overrides.
 */
export type FullStoryStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
  /** Consent granted before `in` so a gated destination is loaded first. */
  before?: WalkerOS.Consent;
};

/**
 * Default event forwarding -- every walkerOS event becomes
 * FullStory('trackEvent', { name, properties }). No mapping rule needed.
 */
export const defaultEventForwarding: FullStoryStepExample = {
  title: 'Default event',
  description:
    'A walker event becomes a FullStory trackEvent call with the event name and empty properties.',
  in: getEvent('product view', { timestamp: 1700000100 }),
  out: [['fullstory.trackEvent', { name: 'product view', properties: {} }]],
};

/**
 * Wildcard ignore -- the event matches a mapping rule with ignore: true.
 * The destination fires zero SDK calls.
 */
export const wildcardIgnored: FullStoryStepExample = {
  public: false,
  in: createEvent({ name: 'debug noise', timestamp: 1700000101 }),
  mapping: { ignore: true },
  out: [],
};

/**
 * Event name mapping -- mapping.name renames the walkerOS event for FullStory.
 */
export const mappedEventName: FullStoryStepExample = {
  title: 'Renamed event',
  description:
    'A mapping renames the event so the FullStory trackEvent uses Purchase instead of the walker name.',
  in: getEvent('order complete', { timestamp: 1700000102 }),
  mapping: {
    name: 'Purchase',
  },
  out: [['fullstory.trackEvent', { name: 'Purchase', properties: {} }]],
};

/**
 * Per-event identify via mapping.settings.identify.
 * Resolves { uid, properties } and calls FullStory('setIdentity', ...).
 * Then fires the default trackEvent.
 */
export const userLoginIdentify: FullStoryStepExample = {
  title: 'User login identify',
  description:
    'A user login fires FullStory setIdentity with uid and profile properties before tracking the event.',
  in: createEvent({
    name: 'user login',
    timestamp: 1700000103,
    data: { id: 'u-123', name: 'Jane Doe', email: 'jane@example.com' },
  }),
  mapping: {
    settings: {
      identify: {
        map: {
          uid: 'data.id',
          properties: {
            map: {
              displayName: 'data.name',
              email: 'data.email',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'fullstory.setIdentity',
      {
        uid: 'u-123',
        properties: { displayName: 'Jane Doe', email: 'jane@example.com' },
      },
    ],
    ['fullstory.trackEvent', { name: 'user login', properties: {} }],
  ],
};

/**
 * Destination-level settings.identify -- fires setIdentity on every push.
 * Uses user.id from the standard getEvent fixture.
 */
export const destinationLevelIdentify: FullStoryStepExample = {
  title: 'Destination identify',
  description:
    "With settings.identify mapping uid to 'user.id', the destination fires FullStory setIdentity before every track call.",
  in: getEvent('page view', { timestamp: 1700000104 }),
  settings: {
    identify: {
      map: {
        uid: 'user.id',
      },
    },
  },
  out: [
    ['fullstory.setIdentity', { uid: 'us3r' }],
    ['fullstory.trackEvent', { name: 'page view', properties: {} }],
  ],
};

/**
 * User properties via mapping.settings.set with default setType ('user').
 * Calls FullStory('setProperties', { type: 'user', properties }).
 */
export const setUserProperties: FullStoryStepExample = {
  title: 'Set user properties',
  description:
    'A purchase sets user-level FullStory properties such as revenue and currency alongside the tracked event.',
  in: getEvent('order complete', { timestamp: 1700000105 }),
  mapping: {
    name: 'Purchase',
    settings: {
      set: {
        map: {
          revenue: 'data.value',
          currency: 'data.currency',
        },
      },
    },
  },
  out: [
    [
      'fullstory.setProperties',
      { type: 'user', properties: { revenue: 462, currency: 'EUR' } },
    ],
    ['fullstory.trackEvent', { name: 'Purchase', properties: {} }],
  ],
};

/**
 * Page properties via mapping.settings.set with setType: 'page'.
 * silent: true suppresses trackEvent -- useful for page views where
 * FullStory already auto-captures navigation.
 */
export const setPageProperties: FullStoryStepExample = {
  title: 'Set page properties',
  description:
    'A page view sets FullStory page-type properties without firing a track, since FullStory auto-captures navigation.',
  in: getEvent('page view', {
    timestamp: 1700000106,
    data: { id: '/docs/', title: 'Getting Started' },
  }),
  mapping: {
    silent: true,
    settings: {
      set: {
        map: {
          pageName: 'data.title',
        },
      },
      setType: 'page',
    },
  },
  out: [
    [
      'fullstory.setProperties',
      { type: 'page', properties: { pageName: 'Getting Started' } },
    ],
  ],
};

/**
 * Combined features -- identify the user, set user properties, then fire
 * the event. Tests push execution order: identify -> setProperties -> trackEvent.
 */
export const combinedFeatures: FullStoryStepExample = {
  title: 'Combined features',
  description:
    'A purchase fires FullStory setIdentity, setProperties, and trackEvent in the canonical execution order.',
  in: getEvent('order complete', { timestamp: 1700000107 }),
  mapping: {
    name: 'Purchase',
    settings: {
      identify: { map: { uid: 'user.id' } },
      set: { map: { order_id: 'data.id' } },
    },
  },
  out: [
    ['fullstory.setIdentity', { uid: 'us3r' }],
    [
      'fullstory.setProperties',
      { type: 'user', properties: { order_id: '0rd3r1d' } },
    ],
    ['fullstory.trackEvent', { name: 'Purchase', properties: {} }],
  ],
};

/**
 * silent: true with identify -- mapping.silent suppresses trackEvent but
 * still executes identify and set from the mapping rule.
 */
export const silentWithIdentify: FullStoryStepExample = {
  public: false,
  description: 'A silent rule still runs its identify.',
  in: createEvent({
    name: 'user login',
    timestamp: 1700000108,
    data: { id: 'u-123', name: 'Jane Doe' },
  }),
  mapping: {
    silent: true,
    settings: {
      identify: {
        map: {
          uid: 'data.id',
          properties: {
            map: {
              displayName: 'data.name',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'fullstory.setIdentity',
      { uid: 'u-123', properties: { displayName: 'Jane Doe' } },
    ],
  ],
};

/**
 * Consent grant -- settings.consent maps walkerOS consent key "analytics"
 * to FullStory "capture" action. Granting consent calls FullStory('start').
 *
 * Uses command='consent' so the test runner dispatches via
 * elb('walker consent', in) instead of pushing an event.
 */
export const consentGrantCapture: FullStoryStepExample = {
  title: 'Start capture',
  description:
    "With settings.consent mapping analytics to 'capture', a walker consent grant for analytics calls FullStory start to begin session recording.",
  command: 'consent',
  in: { analytics: true } as WalkerOS.Consent,
  settings: {
    consent: {
      analytics: 'capture',
    },
  },
  out: [['fullstory.start']],
};

/**
 * Consent revoke -- after analytics consent is granted (FullStory starts
 * capture), revoking it calls FullStory('shutdown'). The destination is never
 * loaded under denied consent, so the shutdown is a real revocation of an
 * already-granted destination.
 */
export const consentRevokeCapture: FullStoryStepExample = {
  title: 'Shutdown capture',
  description:
    "With settings.consent mapping analytics to 'capture', a walker consent revoke for analytics calls FullStory shutdown to stop session recording.",
  command: 'consent',
  before: { analytics: true },
  in: { analytics: false } as WalkerOS.Consent,
  settings: {
    consent: {
      analytics: 'capture',
    },
  },
  out: [['fullstory.start'], ['fullstory.shutdown']],
};

/**
 * Consent flag -- settings.consent maps walkerOS consent key to FullStory
 * "consent" action. Granting calls setIdentity({ consent: true }).
 */
export const consentGrantFlag: FullStoryStepExample = {
  title: 'Consent flag granted',
  description:
    "With settings.consent mapping marketing to 'consent', a walker consent grant for marketing sets the FullStory identity consent flag to true.",
  command: 'consent',
  in: { marketing: true } as WalkerOS.Consent,
  settings: {
    consent: {
      marketing: 'consent',
    },
  },
  out: [['fullstory.setIdentity', { consent: true }]],
};

/**
 * Consent flag revoke -- after marketing consent is granted (the destination
 * loads), revoking it calls setIdentity({ consent: false }). The destination is
 * never loaded under denied consent, so the revoke acts on an already-granted
 * destination.
 */
export const consentRevokeFlag: FullStoryStepExample = {
  title: 'Consent flag revoked',
  description:
    "With settings.consent mapping marketing to 'consent', a walker consent revoke for marketing sets the FullStory identity consent flag to false.",
  command: 'consent',
  before: { marketing: true },
  in: { marketing: false } as WalkerOS.Consent,
  settings: {
    consent: {
      marketing: 'consent',
    },
  },
  out: [
    ['fullstory.setIdentity', { consent: true }],
    ['fullstory.setIdentity', { consent: false }],
  ],
};

/** A silent rule without settings of its own calls nothing. */
export const silentRule: FullStoryStepExample = {
  public: false,
  description: 'A rule with silent: true and no settings calls nothing.',
  in: getEvent('page view', { timestamp: 1700000120 }),
  mapping: { silent: true },
  out: [],
};

/** The FullStory SDK throws while it starts, so the push reports it. */
export const fullstoryUnreachable: FullStoryStepExample = {
  public: false,
  description:
    'The FullStory SDK throws while it starts, so the destination does not start and the push can be retried. A blocked or unreachable fs.js script throws nothing, so it is not reported.',
  in: getEvent('product view', { timestamp: 1700000121 }),
  respond: { error: 'network' },
  out: [],
  outcome: { status: 'failed', code: 'vendor-not-ready', retryable: true },
};

/**
 * The silent page rule of setPageProperties on a page view without data: no
 * property resolves and the rule suppresses the event, so nothing is sent. A
 * declared skip: an unmet mapping, not a failure.
 */
export const setPagePropertiesWithoutData: FullStoryStepExample = {
  public: false,
  description:
    'A silent rule whose property mapping finds no data sends nothing: an unmet mapping, not a failure, so the push returns normally.',
  in: { name: 'page view', entity: 'page', action: 'view' },
  mapping: setPageProperties.mapping,
  out: [],
};

/**
 * The silent identify rule of silentWithIdentify on a login without data: no
 * uid resolves and the rule suppresses the event, so nothing is sent. A
 * declared skip.
 */
export const silentIdentifyWithoutData: FullStoryStepExample = {
  public: false,
  description:
    'A silent rule whose identify mapping finds no uid sends nothing: an unmet mapping, not a failure, so the push returns normally.',
  in: { name: 'user login', entity: 'user', action: 'login' },
  mapping: silentWithIdentify.mapping,
  out: [],
};
