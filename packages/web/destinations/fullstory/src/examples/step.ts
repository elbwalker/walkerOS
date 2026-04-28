import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Extended step example that may carry destination-level settings overrides.
 */
export type FullStoryStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
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
  in: getEvent('debug noise', { timestamp: 1700000101 }),
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
  in: getEvent('user login', {
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
    'Destination-level identify fires FullStory setIdentity with the user id before every track call.',
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
          revenue: 'data.total',
          currency: 'data.currency',
        },
      },
    },
  },
  out: [
    [
      'fullstory.setProperties',
      { type: 'user', properties: { revenue: 555, currency: 'EUR' } },
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
  in: getEvent('user login', {
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
    'A walker consent grant for analytics calls FullStory start to resume session recording.',
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
 * Consent revoke -- revoking consent calls FullStory('shutdown').
 */
export const consentRevokeCapture: FullStoryStepExample = {
  title: 'Shutdown capture',
  description:
    'A walker consent revoke for analytics calls FullStory shutdown to stop session recording.',
  command: 'consent',
  in: { analytics: false } as WalkerOS.Consent,
  settings: {
    consent: {
      analytics: 'capture',
    },
  },
  out: [['fullstory.shutdown']],
};

/**
 * Consent flag -- settings.consent maps walkerOS consent key to FullStory
 * "consent" action. Granting calls setIdentity({ consent: true }).
 */
export const consentGrantFlag: FullStoryStepExample = {
  title: 'Consent flag granted',
  description:
    'A walker consent grant with action consent sets the FullStory identity consent flag to true.',
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
 * Consent flag revoke -- calls setIdentity({ consent: false }).
 */
export const consentRevokeFlag: FullStoryStepExample = {
  title: 'Consent flag revoked',
  description:
    'A walker consent revoke with action consent sets the FullStory identity consent flag to false.',
  command: 'consent',
  in: { marketing: false } as WalkerOS.Consent,
  settings: {
    consent: {
      marketing: 'consent',
    },
  },
  out: [['fullstory.setIdentity', { consent: false }]],
};
