import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
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
 * For events marked `skip: true` or `ignore: true`, `track()` does not
 * fire — only the side-effect calls (people/groups/alias) appear.
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
 * Default event forwarding — every walkerOS event becomes
 * mp.track(event.name, { distinct_id, ...properties }).
 * With default settings.identify resolving user.id.
 */
export const defaultEventForwarding: MixpanelStepExample = {
  title: 'Default track',
  description:
    'A walkerOS event is forwarded to Mixpanel as a track call with the user id as the distinct_id.',
  in: getEvent('product view', { timestamp: 1700000100 }),
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
 * Track with include — flattens walkerOS `data` section into
 * prefixed track() properties.
 */
export const trackWithInclude: MixpanelStepExample = {
  title: 'Track with include',
  description:
    'A destination-level include flattens the event data section into prefixed Mixpanel track properties.',
  in: getEvent('product view', { timestamp: 1700000101 }),
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
      },
    ],
  ],
};

/**
 * Per-event identify — mapping-level settings.identify overrides
 * destination-level default.
 */
export const perEventIdentify: MixpanelStepExample = {
  title: 'Per-event identify',
  description:
    'A mapping-level identify overrides the destination default to resolve the distinct_id from event data.',
  in: getEvent('user login', {
    timestamp: 1700000102,
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
 * Track with group — group key/id attached as track property.
 */
export const trackWithGroup: MixpanelStepExample = {
  title: 'Track with group',
  description:
    'A group key and id are attached as a Mixpanel track property so the event is associated with a company or account.',
  in: getEvent('page view', {
    timestamp: 1700000103,
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
 * User login with people operations — skip: true suppresses track,
 * only identity + people side effects fire.
 */
export const userLoginPeopleSet: MixpanelStepExample = {
  title: 'User login people',
  description:
    'A user login fires Mixpanel people.set, set_once, and increment operations without sending a track event.',
  in: getEvent('user login', {
    timestamp: 1700000104,
    data: {
      user_id: 'new-user-123',
      plan: 'premium',
      company: 'Acme',
      email: 'user@acme.com',
    },
  }),
  mapping: {
    skip: true,
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
    ['mp.people.set_once', 'new-user-123', { first_login: 1700000104 }],
    ['mp.people.increment', 'new-user-123', { login_count: 1 }],
  ],
};

/**
 * Common people operation vocabulary — exercises set, set_once, increment,
 * append, union, remove, unset. (delete_user is intentionally not covered
 * by this example.)
 */
export const allPeopleOperations: MixpanelStepExample = {
  title: 'Common people operations',
  description:
    'A profile update exercises the common Mixpanel people vocabulary: set, set_once, increment, append, union, remove, and unset. delete_user is not covered by this example.',
  in: getEvent('profile update', {
    timestamp: 1700000105,
    data: {
      name: 'Jane Doe',
      email: 'jane@acme.com',
      page: '/docs/getting-started',
      removed_tag: 'trial',
      source: 'referral',
    },
  }),
  mapping: {
    skip: true,
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
 * Group profile operations — settings.groupProfile with set and set_once.
 */
export const companyGroupProfile: MixpanelStepExample = {
  title: 'Group profile',
  description:
    'A company update sets Mixpanel group profile properties via groups.set and groups.set_once.',
  in: getEvent('company update', {
    timestamp: 1700000106,
    data: {
      company_id: 'acme-inc',
      company_name: 'Acme, Inc.',
      plan: 'enterprise',
      employee_count: 250,
      founded_year: 2010,
    },
  }),
  mapping: {
    skip: true,
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
 * Historical import — useImport: true uses mp.import() instead of mp.track().
 */
export const historicalImport: MixpanelStepExample = {
  title: 'Historical import',
  description:
    'Setting useImport routes the event through mp.import for backfilling historical Mixpanel data.',
  in: getEvent('order complete', {
    timestamp: 1700000107,
    data: {
      total: 99.99,
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
  out: [['mp.import', 'order complete', 1700000107, { distinct_id: 'us3r' }]],
};

/**
 * Alias — legacy identity merge. Fires mp.alias before track.
 */
export const aliasBeforeTrack: MixpanelStepExample = {
  title: 'Alias before track',
  description:
    'A user login merges a prior anonymous id into the new user id via mp.alias before sending the track event.',
  in: getEvent('user login', {
    timestamp: 1700000108,
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
 * Wildcard ignore — the rule matches but does nothing.
 */
export const wildcardIgnored: MixpanelStepExample = {
  public: false,
  in: getEvent('debug noise', { timestamp: 1700000109 }),
  mapping: { ignore: true },
  out: [],
};
