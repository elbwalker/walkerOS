import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Examples may optionally carry destination-level settings and/or an
 * `await` hint for async scenarios. The test runner reads `settings`
 * from the example and merges it into the base destination settings
 * on top of the fixed apiKey. `configInclude` is passed as config-level
 * include when registering the destination.
 */
export type AmplitudeStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
  configInclude?: string[];
};

/**
 * Default event forwarding — every walkerOS event becomes
 * amplitude.track(event.name, event_properties). With no mapping and
 * no destination-level include, event_properties is `{}`.
 */
export const defaultEventForwarding: AmplitudeStepExample = {
  title: 'Default track',
  description:
    'A walker event is forwarded to Amplitude as an amplitude.track call with the event name and empty properties.',
  in: getEvent('product view', { timestamp: 1700000100 }),
  out: [['amplitude.track', 'product view', {}]],
};

/**
 * Wildcard ignore — walkerOS's standard way to drop events. The rule
 * matches but does nothing. The destination fires zero SDK calls.
 */
export const wildcardIgnored: AmplitudeStepExample = {
  public: false,
  in: getEvent('debug noise', { timestamp: 1700000101 }),
  mapping: { ignore: true },
  out: [],
};

/**
 * Destination-level settings.include flattens the walkerOS `data` section
 * into prefixed event_properties on every push.
 */
export const destinationLevelInclude: AmplitudeStepExample = {
  title: 'Include data',
  description:
    'Destination-level include flattens the event data section into prefixed event_properties on every track call.',
  in: getEvent('product view', { timestamp: 1700000102 }),
  configInclude: ['data'],
  out: [
    [
      'amplitude.track',
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
export const ruleIncludeReplaces: AmplitudeStepExample = {
  title: 'Rule include overrides',
  description:
    'A per-rule include replaces the destination-level include for the matched event, here using only globals.',
  in: getEvent('order complete', { timestamp: 1700000103 }),
  configInclude: ['data'],
  mapping: {
    include: ['globals'],
  },
  out: [
    [
      'amplitude.track',
      'order complete',
      {
        globals_pagegroup: 'shop',
      },
    ],
  ],
};

/**
 * Destination-level settings.identify fires on the first push (once the
 * state cache is empty). The destination sets user/device/session IDs
 * and tracks them in runtime state; subsequent pushes with unchanged
 * values do NOT re-fire the setters.
 *
 * This example represents the first push in a fresh session. user.id,
 * user.device, user.session come from the walkerOS session fixture.
 *
 * The walkerOS fixture's user.session is 's3ss10n' (string). The
 * destination deterministically hashes non-numeric session strings via
 * djb2 so the same walkerOS session always maps to the same Amplitude
 * session number (cross-page-load consistency). djb2('s3ss10n') = 394324160.
 */
export const destinationLevelIdentify: AmplitudeStepExample = {
  title: 'Destination identify',
  description:
    'Destination-level identify sets userId, deviceId, and sessionId on the Amplitude client before each track.',
  in: getEvent('page view', { timestamp: 1700000104 }),
  settings: {
    identify: {
      map: {
        user: 'user.id',
        device: 'user.device',
        session: 'user.session',
      },
    },
  },
  out: [
    ['amplitude.setUserId', 'us3r'],
    ['amplitude.setDeviceId', 'c00k13'],
    ['amplitude.setSessionId', 394324160],
    ['amplitude.track', 'page view', {}],
  ],
};

/**
 * Per-event identify with the full operation vocabulary — this is the
 * "user login" pattern: set user_id, enrich user properties. `skip: true`
 * suppresses the default amplitude.track() call because we're running
 * identity side effects only.
 */
export const userLoginIdentify: AmplitudeStepExample = {
  title: 'User login identify',
  description:
    'A user login sets the Amplitude userId and runs identify with set, setOnce, and add operations.',
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
    skip: true,
    settings: {
      identify: {
        map: {
          user: 'data.user_id',
          set: {
            map: {
              plan: 'data.plan',
              company: 'data.company',
              email: 'data.email',
            },
          },
          setOnce: {
            map: {
              first_login: 'timestamp',
            },
          },
          add: {
            map: {
              login_count: { value: 1 },
            },
          },
        },
      },
    },
  },
  out: [
    ['amplitude.setUserId', 'new-user-123'],
    [
      'amplitude.identify',
      {
        set: {
          plan: 'premium',
          company: 'Acme',
          email: 'user@acme.com',
        },
        setOnce: {
          first_login: 1700000105,
        },
        add: {
          login_count: 1,
        },
      },
    ],
  ],
};

/**
 * User logout — reset: true fires amplitude.reset(), which clears userId
 * and regenerates deviceId. `skip: true` because we're only running the
 * reset side effect, no default track().
 */
export const userLogoutReset: AmplitudeStepExample = {
  title: 'User logout reset',
  description:
    'A user logout calls amplitude.reset to clear the userId and regenerate the deviceId.',
  in: getEvent('user logout', { timestamp: 1700000106 }),
  mapping: {
    skip: true,
    settings: {
      reset: true,
    },
  },
  out: [['amplitude.reset']],
};

/**
 * Single-product revenue — resolves `settings.revenue` to one object and
 * fires one amplitude.revenue() call. Note the `{ key: "data.currency",
 * value: "EUR" }` fallback syntax: try data.currency, default to "EUR".
 *
 * The walkerOS default event has no data.currency, so the fallback fires.
 */
export const subscriptionRenewRevenue: AmplitudeStepExample = {
  title: 'Subscription revenue',
  description:
    'A subscription renewal fires a single amplitude.revenue call with productId, price, and currency fallback.',
  in: getEvent('subscription renew', {
    timestamp: 1700000107,
    data: {
      plan_id: 'plan-pro',
      amount: 9.99,
    },
  }),
  mapping: {
    skip: true,
    settings: {
      revenue: {
        map: {
          productId: 'data.plan_id',
          price: 'data.amount',
          revenueType: { value: 'renewal' },
          currency: { key: 'data.currency', value: 'EUR' },
        },
      },
    },
  },
  out: [
    [
      'amplitude.revenue',
      {
        productId: 'plan-pro',
        price: 9.99,
        revenueType: 'renewal',
        currency: 'EUR',
      },
    ],
  ],
};

/**
 * Multi-product order — the canonical Amplitude ecommerce pattern.
 * `revenue.loop: ["nested", { map: ... }]` iterates event.nested and
 * resolves one revenue item per entry. Each becomes a separate
 * amplitude.revenue() call. The order-level track() fires once with
 * include-based event_properties.
 *
 * The default "order complete" fixture has 3 nested entries: two
 * products (ers, cc) and one gift. Products have `data.price`; the
 * gift has only `data.name`. The `condition` on the loop inner value
 * filters to products only (price must be present).
 */
export const orderCompleteMultiProduct: AmplitudeStepExample = {
  title: 'Multi-product order',
  description:
    'An order fires one amplitude.revenue call per nested product plus a single track for the order totals.',
  in: getEvent('order complete', { timestamp: 1700000108 }),
  mapping: {
    include: ['data', 'globals'],
    settings: {
      revenue: {
        loop: [
          'nested',
          {
            // Only iterate nested entries that have a price field (products).
            condition: (value: unknown) => {
              const v = value as { data?: { price?: unknown } };
              return typeof v?.data?.price === 'number';
            },
            map: {
              productId: 'data.id',
              price: 'data.price',
              quantity: { key: 'data.quantity', value: 1 },
              revenueType: { value: 'purchase' },
              currency: { key: 'data.currency', value: 'EUR' },
            },
          },
        ],
      },
    },
  },
  out: [
    [
      'amplitude.revenue',
      {
        productId: 'ers',
        price: 420,
        quantity: 1,
        revenueType: 'purchase',
        currency: 'EUR',
      },
    ],
    [
      'amplitude.revenue',
      {
        productId: 'cc',
        price: 42,
        quantity: 1,
        revenueType: 'purchase',
        currency: 'EUR',
      },
    ],
    [
      'amplitude.track',
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
 * Group assignment + group properties. Typically used for B2B products
 * where a user belongs to a company. Both SDK calls fire on the same rule.
 */
export const groupAssignmentWithProperties: AmplitudeStepExample = {
  title: 'Group assignment',
  description:
    'A company update assigns the user to a group and sets group properties via setGroup and groupIdentify.',
  in: getEvent('company update', {
    timestamp: 1700000109,
    data: {
      company: 'Acme',
      industry: 'tech',
      employee_count: 50,
      founded_year: 2020,
    },
  }),
  mapping: {
    skip: true,
    settings: {
      group: {
        map: {
          type: { value: 'company' },
          name: 'data.company',
        },
      },
      groupIdentify: {
        map: {
          type: { value: 'company' },
          name: 'data.company',
          set: {
            map: {
              industry: 'data.industry',
              size: 'data.employee_count',
            },
          },
          setOnce: {
            map: {
              founded: 'data.founded_year',
            },
          },
        },
      },
    },
  },
  out: [
    ['amplitude.setGroup', 'company', 'Acme'],
    [
      'amplitude.groupIdentify',
      'company',
      'Acme',
      {
        set: {
          industry: 'tech',
          size: 50,
        },
        setOnce: {
          founded: 2020,
        },
      },
    ],
  ],
};

/**
 * Consent revoked → amplitude.setOptOut(true). The destination checks
 * the consent keys declared in config.consent and toggles optOut
 * accordingly (strict: all required keys must be granted).
 *
 * Uses the canonical StepExample.command='consent' pattern: the test
 * runner dispatches via elb('walker consent', in) instead of pushing
 * an event.
 */
export const consentRevokeOptOut: AmplitudeStepExample = {
  title: 'Consent revoked',
  description:
    'A walker consent command with analytics denied opts out of Amplitude tracking via setOptOut(true).',
  command: 'consent',
  in: { analytics: false } as WalkerOS.Consent,
  settings: {} as Partial<Settings>,
  out: [['amplitude.setOptOut', true]],
};

/**
 * Consent granted → amplitude.setOptOut(false).
 */
export const consentGrantOptIn: AmplitudeStepExample = {
  title: 'Consent granted',
  description:
    'A walker consent command with analytics granted opts back into Amplitude tracking via setOptOut(false).',
  command: 'consent',
  in: { analytics: true } as WalkerOS.Consent,
  settings: {} as Partial<Settings>,
  out: [['amplitude.setOptOut', false]],
};
