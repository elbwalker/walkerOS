import type { Flow } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Mixpanel server SDK step examples.
 *
 * At push time, the destination calls the `mixpanel` Node SDK via the
 * client returned from `Mixpanel.init(...)`. Public method paths users
 * see on the client are:
 *
 *   - `mp.track(eventName, properties)`
 *   - `mp.import(eventName, time, properties)` (when `useImport: true`)
 *   - `mp.alias(distinctId, alias)` (fires before track)
 *   - `mp.people.{set,set_once,increment,append,union,remove,unset,delete_user}(...)`
 *   - `mp.groups.{set,set_once,union,remove,unset,delete_group}(...)`
 *
 * Each `out` is `[[callable, ...args], ...]`. The test filters out the
 * one-time `Mixpanel.init` call (fired during destination init) so only
 * per-event SDK calls are compared.
 *
 * For events marked `silent: true` or `ignore: true`, `track()` does not
 * fire - only the side-effect calls (people/groups/alias) appear.
 */

/**
 * Step examples may carry destination-level settings and configInclude.
 * The test runner reads these to configure the destination.
 */
export type MixpanelStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
  configInclude?: string[];
};

/**
 * Default event forwarding - every walkerOS event becomes
 * mp.track(event.name, { distinct_id, ...properties }).
 * With default settings.identify resolving user.id.
 */
export const defaultEventForwarding: MixpanelStepExample = {
  title: 'Default track',
  description:
    "With settings.identify mapping distinctId to 'user.id', a walkerOS event is forwarded to Mixpanel as a track call with that distinct_id. Without identify the track call carries no distinct_id.",
  in: getEvent('product view', { timestamp: 1700000100000 }),
  settings: {
    identify: {
      map: {
        distinctId: 'user.id',
      },
    },
  },
  out: [['mp.track', 'product view', { distinct_id: 'us3r' }]],
};

/**
 * Track with include - flattens walkerOS `data` section into
 * prefixed track() properties.
 */
export const trackWithInclude: MixpanelStepExample = {
  title: 'Track with include',
  description:
    "With settings.identify mapping distinctId to 'user.id' and include: ['data'] in the destination config, the event data section is flattened into prefixed Mixpanel track properties.",
  in: getEvent('product view', { timestamp: 1700000101000 }),
  settings: {
    identify: {
      map: {
        distinctId: 'user.id',
      },
    },
  },
  configInclude: ['data'],
  out: [
    [
      'mp.track',
      'product view',
      {
        distinct_id: 'us3r',
        data_id: 'ers',
        data_name: 'Everyday Ruck Snack',
        data_color: 'black',
        data_size: 'l',
        data_price: 420,
        data_currency: 'EUR',
      },
    ],
  ],
};

/**
 * Per-event identify - mapping-level settings.identify overrides
 * destination-level default.
 */
export const perEventIdentify: MixpanelStepExample = {
  title: 'Per-event identify',
  description:
    'A mapping-level identify overrides settings.identify and resolves the distinct_id from event data.',
  in: createEvent({
    name: 'user login',
    timestamp: 1700000102000,
    data: {
      user_id: 'resolved-id',
      plan: 'premium',
    },
  }),
  mapping: {
    settings: {
      identify: {
        map: {
          distinctId: 'data.user_id',
        },
      },
    },
  },
  out: [
    [
      'mp.track',
      'user login',
      {
        distinct_id: 'resolved-id',
      },
    ],
  ],
};

/**
 * Track with group - group key/id attached as track property.
 */
export const trackWithGroup: MixpanelStepExample = {
  title: 'Track with group',
  description:
    "With settings.identify mapping distinctId to 'user.id', a group key and id are attached as a Mixpanel track property so the event is associated with a company or account.",
  in: getEvent('page view', {
    timestamp: 1700000103000,
    data: {
      company_id: 'acme',
    },
  }),
  settings: {
    identify: {
      map: {
        distinctId: 'user.id',
      },
    },
  },
  mapping: {
    settings: {
      group: {
        map: {
          key: { value: 'company_id' },
          id: 'data.company_id',
        },
      },
    },
  },
  out: [
    [
      'mp.track',
      'page view',
      {
        distinct_id: 'us3r',
        company_id: 'acme',
      },
    ],
  ],
};

/**
 * User login with people operations - silent: true suppresses track,
 * only identity + people side effects fire.
 */
export const userLoginPeopleSet: MixpanelStepExample = {
  title: 'User login people',
  description:
    'A user login fires Mixpanel people.set, set_once, and increment operations without sending a track event.',
  in: createEvent({
    name: 'user login',
    timestamp: 1700000104000,
    data: {
      user_id: 'new-user-123',
      plan: 'premium',
      company: 'Acme',
      email: 'user@acme.com',
    },
  }),
  mapping: {
    silent: true,
    settings: {
      identify: {
        map: {
          distinctId: 'data.user_id',
        },
      },
      people: {
        map: {
          set: {
            map: {
              plan: 'data.plan',
              company: 'data.company',
              email: 'data.email',
            },
          },
          set_once: {
            map: {
              first_login: 'timestamp',
            },
          },
          increment: {
            map: {
              login_count: { value: 1 },
            },
          },
        },
      },
    },
  },
  out: [
    [
      'mp.people.set',
      'new-user-123',
      { plan: 'premium', company: 'Acme', email: 'user@acme.com' },
    ],
    ['mp.people.set_once', 'new-user-123', { first_login: 1700000104000 }],
    ['mp.people.increment', 'new-user-123', { login_count: 1 }],
  ],
};

/**
 * Common people operation vocabulary - exercises set, set_once, increment,
 * append, union, remove, unset. (delete_user is intentionally not covered
 * by this example.)
 */
export const allPeopleOperations: MixpanelStepExample = {
  title: 'Common people operations',
  description:
    'A profile update exercises the common Mixpanel people vocabulary: set, set_once, increment, append, union, remove, and unset. delete_user is not covered by this example.',
  in: createEvent({
    name: 'profile update',
    timestamp: 1700000105000,
    data: {
      name: 'Jane Doe',
      email: 'jane@acme.com',
      page: '/docs/getting-started',
      removed_tag: 'trial',
      source: 'referral',
    },
  }),
  mapping: {
    silent: true,
    settings: {
      identify: {
        map: {
          distinctId: 'user.id',
        },
      },
      people: {
        map: {
          set: {
            map: {
              name: 'data.name',
              email: 'data.email',
            },
          },
          set_once: {
            map: {
              signup_source: 'data.source',
            },
          },
          increment: {
            map: {
              page_views: { value: 1 },
            },
          },
          append: {
            map: {
              visited_pages: 'data.page',
            },
          },
          union: {
            map: {
              unique_tags: { value: ['active'] },
            },
          },
          remove: {
            map: {
              tags: 'data.removed_tag',
            },
          },
          unset: { value: ['old_plan'] },
        },
      },
    },
  },
  out: [
    ['mp.people.set', 'us3r', { name: 'Jane Doe', email: 'jane@acme.com' }],
    ['mp.people.set_once', 'us3r', { signup_source: 'referral' }],
    ['mp.people.increment', 'us3r', { page_views: 1 }],
    ['mp.people.append', 'us3r', { visited_pages: '/docs/getting-started' }],
    ['mp.people.union', 'us3r', { unique_tags: ['active'] }],
    ['mp.people.remove', 'us3r', { tags: 'trial' }],
    ['mp.people.unset', 'us3r', ['old_plan']],
  ],
};

/**
 * Group profile operations - settings.groupProfile with set and set_once.
 */
export const companyGroupProfile: MixpanelStepExample = {
  title: 'Group profile',
  description:
    'A company update sets Mixpanel group profile properties via groups.set and groups.set_once.',
  in: createEvent({
    name: 'company update',
    timestamp: 1700000106000,
    data: {
      company_id: 'acme-inc',
      company_name: 'Acme, Inc.',
      plan: 'enterprise',
      employee_count: 250,
      founded_year: 2010,
    },
  }),
  mapping: {
    silent: true,
    settings: {
      groupProfile: {
        map: {
          key: { value: 'company_id' },
          id: 'data.company_id',
          set: {
            map: {
              name: 'data.company_name',
              plan: 'data.plan',
              employee_count: 'data.employee_count',
            },
          },
          set_once: {
            map: {
              founded: 'data.founded_year',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'mp.groups.set',
      'company_id',
      'acme-inc',
      { name: 'Acme, Inc.', plan: 'enterprise', employee_count: 250 },
    ],
    ['mp.groups.set_once', 'company_id', 'acme-inc', { founded: 2010 }],
  ],
};

/**
 * Historical import - useImport: true uses mp.import() instead of mp.track().
 */
export const historicalImport: MixpanelStepExample = {
  title: 'Historical import',
  description:
    "With settings.useImport: true and settings.identify mapping distinctId to 'user.id', the event goes through mp.import with its timestamp, for backfilling historical Mixpanel data. The /import endpoint also needs settings.secret: without it every event fails.",
  in: getEvent('order complete', {
    timestamp: 1700000107000,
    data: {
      value: 99.99,
    },
  }),
  settings: {
    useImport: true,
    identify: {
      map: {
        distinctId: 'user.id',
      },
    },
  },
  out: [
    ['mp.import', 'order complete', 1700000107000, { distinct_id: 'us3r' }],
  ],
};

/**
 * Alias - legacy identity merge. Fires mp.alias before track.
 */
export const aliasBeforeTrack: MixpanelStepExample = {
  title: 'Alias before track',
  description:
    'A user login merges a prior anonymous id into the new user id via mp.alias before sending the track event.',
  in: createEvent({
    name: 'user login',
    timestamp: 1700000108000,
    data: {
      user_id: 'new-user-456',
      anon_id: 'anon-789',
    },
  }),
  mapping: {
    settings: {
      identify: {
        map: {
          distinctId: 'data.user_id',
          alias: 'data.anon_id',
        },
      },
    },
  },
  out: [
    ['mp.alias', 'new-user-456', 'anon-789'],
    ['mp.track', 'user login', { distinct_id: 'new-user-456' }],
  ],
};

/**
 * Wildcard ignore - the rule matches but does nothing.
 */
export const wildcardIgnored: MixpanelStepExample = {
  public: false,
  in: createEvent({ name: 'debug noise', timestamp: 1700000109000 }),
  mapping: { ignore: true },
  out: [],
};

/** A silent rule sends nothing to Mixpanel. */
export const silentRule: Flow.StepExample = {
  public: false,
  description: 'A rule with silent: true sends nothing to Mixpanel.',
  in: getEvent('page view', { timestamp: 1700000990000 }),
  mapping: { silent: true },
  out: [],
};

/**
 * The event of a people or group profile example without the data its rule
 * reads: no distinct id and no group key resolve, so there is nothing to
 * address. A rule that only addresses profiles has nothing else to send, so
 * it returns normally; that is a declared skip, not a failure.
 */
function skipWithoutInput(
  target: MixpanelStepExample,
  name: string,
  timestamp: number,
): MixpanelStepExample {
  const [entity, action] = name.split(' ');
  return {
    public: false,
    description: `A ${name} event without the data its rule reads has no profile or group to address: nothing is sent, and that is not a failure.`,
    in: { name, entity, action, timestamp },
    mapping: target.mapping,
    out: [],
  };
}

export const userLoginPeopleSetSkip = skipWithoutInput(
  userLoginPeopleSet,
  'user login',
  1700000991000,
);
export const allPeopleOperationsSkip = skipWithoutInput(
  allPeopleOperations,
  'profile update',
  1700000992000,
);
export const companyGroupProfileSkip = skipWithoutInput(
  companyGroupProfile,
  'company update',
  1700000993000,
);
