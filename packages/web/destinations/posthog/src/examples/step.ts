import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Examples may optionally carry destination-level settings.
 * The test runner reads `settings` from the example and merges them
 * into the base destination settings on top of the fixed apiKey.
 */
export type PostHogStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
  configInclude?: string[];
};

/**
 * Default event forwarding — every walkerOS event becomes
 * posthog.capture(event.name, properties). With no mapping and no
 * destination-level include, properties is `{}`.
 */
export const defaultEventForwarding: PostHogStepExample = {
  title: 'Default capture',
  description:
    'A walker event becomes a PostHog capture call with the event name and empty properties.',
  in: getEvent('product view', { timestamp: 1700000100 }),
  out: [['posthog.capture', 'product view', {}]],
};

/**
 * Wildcard ignore — walkerOS's standard way to drop events. The rule
 * matches but does nothing. The destination fires zero SDK calls.
 */
export const wildcardIgnored: PostHogStepExample = {
  public: false,
  in: getEvent('debug noise', { timestamp: 1700000101 }),
  mapping: { ignore: true },
  out: [],
};

/**
 * Destination-level settings.include flattens the walkerOS `data` section
 * into prefixed capture() properties on every push.
 */
export const destinationLevelInclude: PostHogStepExample = {
  title: 'Include data',
  description:
    'Destination-level include flattens the event data section into prefixed PostHog capture properties.',
  in: getEvent('product view', { timestamp: 1700000102 }),
  configInclude: ['data'],
  out: [
    [
      'posthog.capture',
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
export const ruleIncludeReplaces: PostHogStepExample = {
  title: 'Rule include overrides',
  description:
    'A per-rule include replaces the destination-level include so this event forwards only globals.',
  in: getEvent('order complete', { timestamp: 1700000103 }),
  configInclude: ['data'],
  mapping: {
    include: ['globals'],
  },
  out: [
    [
      'posthog.capture',
      'order complete',
      {
        globals_pagegroup: 'shop',
      },
    ],
  ],
};

/**
 * Destination-level settings.identify fires on the first push (once the
 * state cache is empty). The destination calls posthog.identify() and
 * tracks the resolved distinctId in runtime state; subsequent pushes
 * with unchanged values do NOT re-fire identify().
 *
 * With NO $set/$set_once keys in the resolved object, posthog.identify
 * is called with just the distinctId.
 */
export const destinationLevelIdentify: PostHogStepExample = {
  title: 'Destination identify',
  description:
    'Destination-level identify calls posthog.identify with the user id before firing the default capture.',
  in: getEvent('page view', { timestamp: 1700000104 }),
  settings: {
    identify: {
      map: {
        distinctId: 'user.id',
      },
    },
  },
  out: [
    ['posthog.identify', 'us3r'],
    ['posthog.capture', 'page view', {}],
  ],
};

/**
 * Per-event identify with the full PostHog identity vocabulary.
 * This is the "user login" pattern: set a new distinctId and enrich
 * person properties. `skip: true` suppresses the default posthog.capture()
 * call because we're running identity side effects only.
 *
 * PostHog identify signature:
 *   posthog.identify(distinctId, $set, $set_once)
 */
export const userLoginIdentify: PostHogStepExample = {
  title: 'User login identify',
  description:
    'A user login fires PostHog identify with $set and $set_once person properties, skipping the capture.',
  in: getEvent('user login', {
    timestamp: 1700000105,
    data: {
      user_id: 'new-user-123',
      email: 'user@acme.com',
      plan: 'premium',
      company: 'Acme',
      source: 'organic',
    },
  }),
  mapping: {
    skip: true,
    settings: {
      identify: {
        map: {
          distinctId: 'data.user_id',
          $set: {
            map: {
              email: 'data.email',
              plan: 'data.plan',
              company: 'data.company',
            },
          },
          $set_once: {
            map: {
              first_login: 'timestamp',
              signup_source: 'data.source',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'posthog.identify',
      'new-user-123',
      {
        email: 'user@acme.com',
        plan: 'premium',
        company: 'Acme',
      },
      {
        first_login: 1700000105,
        signup_source: 'organic',
      },
    ],
  ],
};

/**
 * Person-properties-only update — when the resolved identify object has
 * NO `distinctId` key, the destination calls setPersonProperties($set, $set_once)
 * instead of identify(). This is the "profile update" pattern: enrich
 * user properties without changing identity.
 *
 * `skip` defaults to false here — we intentionally ALSO capture a
 * "profile update" event so it shows up in PostHog's event stream.
 */
export const profileUpdateSetPersonProperties: PostHogStepExample = {
  title: 'Set person properties',
  description:
    'A profile update calls setPersonProperties to enrich the PostHog profile without changing identity.',
  in: getEvent('profile update', {
    timestamp: 1700000106,
    data: {
      name: 'Jane Doe',
      avatar_url: 'https://example.com/avatar.png',
    },
  }),
  mapping: {
    settings: {
      identify: {
        map: {
          $set: {
            map: {
              name: 'data.name',
              avatar: 'data.avatar_url',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'posthog.setPersonProperties',
      {
        name: 'Jane Doe',
        avatar: 'https://example.com/avatar.png',
      },
      undefined,
    ],
    ['posthog.capture', 'profile update', {}],
  ],
};

/**
 * User logout — reset: true fires posthog.reset(), which clears the
 * distinct ID and generates a new anonymous one. `skip: true` because
 * we're only running the reset side effect, no default capture().
 */
export const userLogoutReset: PostHogStepExample = {
  title: 'User logout reset',
  description:
    'A user logout calls posthog.reset to clear the distinct id and generate a new anonymous one.',
  in: getEvent('user logout', { timestamp: 1700000107 }),
  mapping: {
    skip: true,
    settings: {
      reset: true,
    },
  },
  out: [['posthog.reset']],
};

/**
 * Group assignment + group properties. PostHog's group analytics (paid)
 * aggregates events by company / team / project. The destination resolves
 * `settings.group` to { type, key, properties? } and calls
 * posthog.group(type, key, properties). `skip: true` keeps this a
 * pure side-effect rule — no "company update" capture().
 */
export const groupAssignmentWithProperties: PostHogStepExample = {
  title: 'Group assignment',
  description:
    'A company update assigns the user to a PostHog group and sets group properties via posthog.group.',
  in: getEvent('company update', {
    timestamp: 1700000108,
    data: {
      company_id: 'company_123',
      company_name: 'Acme',
      plan: 'enterprise',
      size: 50,
    },
  }),
  mapping: {
    skip: true,
    settings: {
      group: {
        map: {
          type: { value: 'company' },
          key: 'data.company_id',
          properties: {
            map: {
              name: 'data.company_name',
              plan: 'data.plan',
              employee_count: 'data.size',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'posthog.group',
      'company',
      'company_123',
      {
        name: 'Acme',
        plan: 'enterprise',
        employee_count: 50,
      },
    ],
  ],
};

/**
 * Order complete — PostHog has no dedicated revenue API. Revenue tracking
 * is just a capture() call with the revenue properties in data. This
 * example pairs `include: ["data", "globals"]` with a destination-level
 * capture. The order total, shipping, currency, etc. all become
 * data_* properties on the PostHog event.
 */
export const orderCompleteWithInclude: PostHogStepExample = {
  title: 'Order complete',
  description:
    'An order complete captures order data and globals as prefixed properties for revenue analysis in PostHog.',
  in: getEvent('order complete', { timestamp: 1700000109 }),
  mapping: {
    include: ['data', 'globals'],
  },
  out: [
    [
      'posthog.capture',
      'order complete',
      {
        data_id: '0rd3r1d',
        data_currency: 'EUR',
        data_shipping: 5.22,
        data_taxes: 73.76,
        data_total: 555,
        globals_pagegroup: 'shop',
      },
    ],
  ],
};

/**
 * Consent revoked → posthog.opt_out_capturing(). The destination checks
 * the consent key declared in config.consent (here "analytics") and
 * toggles accordingly. opt_out_capturing() stops capture, session
 * replay, AND survey rendering.
 *
 * Uses the canonical StepExample.command='consent' pattern: the test
 * runner dispatches via elb('walker consent', in) instead of pushing
 * an event.
 */
export const consentRevokeOptOut: PostHogStepExample = {
  title: 'Consent revoked',
  description:
    'A walker consent command with analytics denied calls posthog.opt_out_capturing to stop capture and replay.',
  command: 'consent',
  in: { analytics: false } as WalkerOS.Consent,
  settings: {} as Partial<Settings>,
  out: [['posthog.opt_out_capturing']],
};

/**
 * Consent granted → posthog.opt_in_capturing(). Called without arguments
 * by default (the SDK fires its own $opt_in event).
 */
export const consentGrantOptIn: PostHogStepExample = {
  title: 'Consent granted',
  description:
    'A walker consent command with analytics granted calls posthog.opt_in_capturing to resume capture.',
  command: 'consent',
  in: { analytics: true } as WalkerOS.Consent,
  settings: {} as Partial<Settings>,
  out: [['posthog.opt_in_capturing']],
};
