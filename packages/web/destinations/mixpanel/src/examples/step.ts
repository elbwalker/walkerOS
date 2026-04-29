import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Examples may optionally carry destination-level settings. The test runner
 * reads `settings` from the example and merges it into the base destination
 * settings on top of the fixed apiKey.
 */
export type MixpanelStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
  configInclude?: string[];
};

/**
 * Default event forwarding - every walkerOS event becomes
 * mixpanel.track(event.name, properties). With no mapping and no
 * destination-level include, properties is `{}`.
 */
export const defaultEventForwarding: MixpanelStepExample = {
  title: 'Default track',
  description:
    'A walker event becomes a Mixpanel track call with the event name and empty properties.',
  in: getEvent('product view', { timestamp: 1700000100 }),
  out: [['mixpanel.track', 'product view', {}]],
};

/**
 * Wildcard ignore - walkerOS's standard way to drop events. The rule
 * matches but does nothing. The destination fires zero SDK calls.
 */
export const wildcardIgnored: MixpanelStepExample = {
  public: false,
  in: getEvent('debug noise', { timestamp: 1700000101 }),
  mapping: { ignore: true },
  out: [],
};

/**
 * Destination-level settings.include flattens the walkerOS `data` section
 * into prefixed track() properties on every push.
 */
export const destinationLevelInclude: MixpanelStepExample = {
  title: 'Include data',
  description:
    'Destination-level include flattens the event data section into prefixed Mixpanel track properties.',
  in: getEvent('product view', { timestamp: 1700000102 }),
  configInclude: ['data'],
  out: [
    [
      'mixpanel.track',
      'product view',
      {
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
 * Per-rule settings.include REPLACES destination-level include for the
 * matched rule. Here destination-level sends `data`, but the rule
 * overrides it with `globals` only.
 */
export const ruleIncludeReplaces: MixpanelStepExample = {
  title: 'Rule include overrides',
  description:
    'A per-rule include replaces the destination-level include for this event, forwarding only globals here.',
  in: getEvent('order complete', { timestamp: 1700000103 }),
  configInclude: ['data'],
  mapping: {
    include: ['globals'],
  },
  out: [
    [
      'mixpanel.track',
      'order complete',
      {
        globals_pagegroup: 'shop',
      },
    ],
  ],
};

/**
 * Destination-level settings.identify fires on the first push. The
 * destination resolves { distinctId } and calls mixpanel.identify(distinctId),
 * then tracks the result in runtime state. Subsequent pushes with unchanged
 * distinctId do NOT re-fire identify().
 */
export const destinationLevelIdentify: MixpanelStepExample = {
  title: 'Destination identify',
  description:
    'Destination-level identify calls mixpanel.identify with a resolved distinctId before firing the default track.',
  in: getEvent('page view', { timestamp: 1700000104 }),
  settings: {
    identify: {
      map: {
        distinctId: 'user.id',
      },
    },
  },
  out: [
    ['mixpanel.identify', 'us3r'],
    ['mixpanel.track', 'page view', {}],
  ],
};

/**
 * Per-event identify + people operations - the canonical "user login"
 * pattern. `silent: true` suppresses the default mixpanel.track() call
 * because we're running identity side effects only.
 */
export const userLoginIdentifyAndPeople: MixpanelStepExample = {
  title: 'User login identify',
  description:
    'A user login identifies the user and fires Mixpanel people set, set_once, and increment operations.',
  in: getEvent('user login', {
    timestamp: 1700000105,
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
    ['mixpanel.identify', 'new-user-123'],
    [
      'mixpanel.people.set',
      {
        plan: 'premium',
        company: 'Acme',
        email: 'user@acme.com',
      },
    ],
    [
      'mixpanel.people.set_once',
      {
        first_login: 1700000105,
      },
    ],
    [
      'mixpanel.people.increment',
      {
        login_count: 1,
      },
    ],
  ],
};

/**
 * Full people operation vocabulary - a profile update rule that exercises
 * set, set_once, increment, append, union, remove, and unset in a single
 * rule. `silent: true` because only side effects are needed.
 */
export const profileUpdateAllPeopleOperations: MixpanelStepExample = {
  title: 'All people operations',
  description:
    'A profile update exercises the full Mixpanel people vocabulary including set, increment, append, union, and remove.',
  in: getEvent('profile update', {
    timestamp: 1700000106,
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
    ['mixpanel.people.set', { name: 'Jane Doe', email: 'jane@acme.com' }],
    ['mixpanel.people.set_once', { signup_source: 'referral' }],
    ['mixpanel.people.increment', { page_views: 1 }],
    ['mixpanel.people.append', { visited_pages: '/docs/getting-started' }],
    ['mixpanel.people.union', { unique_tags: ['active'] }],
    ['mixpanel.people.remove', { tags: 'trial' }],
    ['mixpanel.people.unset', ['old_plan']],
  ],
};

/**
 * people.delete_user - destructive operation. The resolved people object
 * uses `{ delete_user: true }` to trigger the call.
 */
export const accountDeleteUser: MixpanelStepExample = {
  title: 'Delete user',
  description:
    'An account delete fires Mixpanel people.delete_user to remove the user profile from the project.',
  in: getEvent('account delete', { timestamp: 1700000107 }),
  mapping: {
    silent: true,
    settings: {
      people: {
        map: {
          delete_user: { value: true },
        },
      },
    },
  },
  out: [['mixpanel.people.delete_user']],
};

/**
 * User logout - reset: true fires mixpanel.reset(), which clears all
 * persistence and generates a new anonymous distinct_id.
 */
export const userLogoutReset: MixpanelStepExample = {
  title: 'User logout reset',
  description:
    'A user logout calls mixpanel.reset to clear persistence and generate a new anonymous distinct id.',
  in: getEvent('user logout', { timestamp: 1700000108 }),
  mapping: {
    silent: true,
    settings: {
      reset: true,
    },
  },
  out: [['mixpanel.reset']],
};

/**
 * User-group association - settings.group resolves to { key, id } and
 * calls mixpanel.set_group(key, id). Fires default track too.
 */
export const userGroupAssociation: MixpanelStepExample = {
  title: 'Group association',
  description:
    'A user login associates the user to a company group via mixpanel.set_group and fires the default track.',
  in: getEvent('user login', {
    timestamp: 1700000109,
    data: {
      user_id: 'user-456',
      company_id: 'acme-inc',
    },
  }),
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
    ['mixpanel.set_group', 'company_id', 'acme-inc'],
    ['mixpanel.track', 'user login', {}],
  ],
};

/**
 * Group profile properties - settings.groupProfile resolves to
 * { key, id, set?, set_once?, ... } and calls
 * mixpanel.get_group(key, id).set(...), .set_once(...), etc.
 */
export const companyUpdateGroupProfile: MixpanelStepExample = {
  title: 'Group profile',
  description:
    'A company update sets Mixpanel group profile properties via get_group.set and get_group.set_once.',
  in: getEvent('company update', {
    timestamp: 1700000110,
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
      'mixpanel.get_group.set',
      'company_id',
      'acme-inc',
      { name: 'Acme, Inc.', plan: 'enterprise', employee_count: 250 },
    ],
    [
      'mixpanel.get_group.set_once',
      'company_id',
      'acme-inc',
      { founded: 2010 },
    ],
  ],
};

/**
 * Consent revoked → mixpanel.opt_out_tracking(). The destination checks
 * the consent keys declared in config.consent and toggles opt_out/opt_in.
 */
export const consentRevokeOptOut: MixpanelStepExample = {
  title: 'Consent revoked',
  description:
    'A walker consent command with analytics denied calls mixpanel.opt_out_tracking to stop event capture.',
  command: 'consent',
  in: { analytics: false } as WalkerOS.Consent,
  settings: {} as Partial<Settings>,
  out: [['mixpanel.opt_out_tracking']],
};

/**
 * Consent granted → mixpanel.opt_in_tracking().
 */
export const consentGrantOptIn: MixpanelStepExample = {
  title: 'Consent granted',
  description:
    'A walker consent command with analytics granted calls mixpanel.opt_in_tracking to resume event capture.',
  command: 'consent',
  in: { analytics: true } as WalkerOS.Consent,
  settings: {} as Partial<Settings>,
  out: [['mixpanel.opt_in_tracking']],
};
