import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Extended step example type for Amplitude server destination.
 * Settings and configInclude are read by the test runner and merged
 * into the base destination configuration.
 */
export type AmplitudeStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
  configInclude?: string[];
};

/**
 * Default event forwarding -- every walkerOS event becomes
 * amplitude.track(event.name, event_properties). With no mapping and
 * no destination-level include, event_properties is `{}`.
 */
export const defaultEventForwarding: AmplitudeStepExample = {
  in: getEvent('product view', { timestamp: 1700000100 }),
  out: [['amplitude.track', 'product view', {}]],
};

/**
 * Wildcard ignore -- walkerOS's standard way to drop events. The rule
 * matches but does nothing. The destination fires zero SDK calls.
 */
export const wildcardIgnored: AmplitudeStepExample = {
  in: getEvent('debug noise', { timestamp: 1700000101 }),
  mapping: { ignore: true },
  out: [],
};

/**
 * Destination-level settings.include flattens the walkerOS `data` section
 * into prefixed event_properties on every push.
 */
export const destinationLevelInclude: AmplitudeStepExample = {
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
 * Destination-level settings.identify resolves per-event identity.
 * Unlike the web destination (which uses setUserId/setDeviceId/setSessionId),
 * server-side identity goes into EventOptions passed to every SDK call.
 *
 * user.session is 's3ss10n' (string). The destination deterministically
 * hashes non-numeric session strings via djb2.
 * djb2('s3ss10n') = 394324160.
 */
export const destinationLevelIdentify: AmplitudeStepExample = {
  in: getEvent('page view', { timestamp: 1700000104 }),
  settings: {
    identify: {
      map: {
        user_id: 'user.id',
        device_id: 'user.device',
        session_id: 'user.session',
      },
    },
  },
  out: [
    [
      'amplitude.track',
      'page view',
      {},
      {
        user_id: 'us3r',
        device_id: 'c00k13',
        session_id: 394324160,
      },
    ],
  ],
};

/**
 * Per-event identify with the full operation vocabulary -- this is the
 * "user login" pattern: set user_id, enrich user properties. `skip: true`
 * suppresses the default amplitude.track() call because we're running
 * identity side effects only.
 *
 * Server-side, user_id is passed via EventOptions on identify().
 */
export const userLoginIdentify: AmplitudeStepExample = {
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
          user_id: 'data.user_id',
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
      {
        user_id: 'new-user-123',
      },
    ],
  ],
};

/**
 * Single-product revenue -- resolves `settings.revenue` to one object and
 * fires one amplitude.revenue() call. Note the `{ key: "data.currency",
 * value: "EUR" }` fallback syntax: try data.currency, default to "EUR".
 *
 * The custom event has no data.currency, so the fallback fires.
 * `skip: true` suppresses the default track().
 */
export const subscriptionRenewRevenue: AmplitudeStepExample = {
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
 * Multi-product order -- the canonical Amplitude ecommerce pattern.
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
  in: getEvent('order complete', { timestamp: 1700000108 }),
  mapping: {
    include: ['data', 'globals'],
    settings: {
      revenue: {
        loop: [
          'nested',
          {
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
 * EventOptions mapping -- `settings.eventOptions` maps walkerOS fields
 * to Amplitude per-event metadata. Here `time` maps from the event
 * timestamp and `insert_id` maps from the event id for deduplication.
 */
export const eventOptionsTimeInsertId: AmplitudeStepExample = {
  in: getEvent('page view', { timestamp: 1700000110 }),
  settings: {
    eventOptions: {
      map: {
        time: 'timestamp',
        insert_id: 'id',
      },
    },
  },
  out: [
    [
      'amplitude.track',
      'page view',
      {},
      {
        time: 1700000110,
        insert_id: '1700000110-gr0up-1',
      },
    ],
  ],
};

/**
 * Consent revoked -> amplitude.setOptOut(true). The destination checks
 * the consent keys declared in config.consent and toggles optOut
 * accordingly (strict: all required keys must be granted).
 *
 * Uses the canonical StepExample.command='consent' pattern: the test
 * runner dispatches via elb('walker consent', in) instead of pushing
 * an event.
 */
export const consentRevokeOptOut: AmplitudeStepExample = {
  command: 'consent',
  in: { analytics: false } as WalkerOS.Consent,
  settings: {} as Partial<Settings>,
  out: [['amplitude.setOptOut', true]],
};

/**
 * Consent granted -> amplitude.setOptOut(false).
 */
export const consentGrantOptIn: AmplitudeStepExample = {
  command: 'consent',
  in: { analytics: true } as WalkerOS.Consent,
  settings: {} as Partial<Settings>,
  out: [['amplitude.setOptOut', false]],
};
