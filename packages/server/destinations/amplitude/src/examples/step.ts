import type { Flow, WalkerOS } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Extended step example type for Amplitude server destination.
 * Settings and configInclude are read by the test runner and merged
 * into the base destination configuration.
 */
export type AmplitudeStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
  configInclude?: string[];
  /** Consent granted before `in` so a gated destination is loaded first. */
  before?: WalkerOS.Consent;
};

/**
 * Default event forwarding -- every walkerOS event becomes
 * amplitude.track(event.name, event_properties). With no mapping and
 * no destination-level include, event_properties is `{}`.
 */
export const defaultEventForwarding: AmplitudeStepExample = {
  title: 'Default event',
  description:
    'A walkerOS event forwarded as an Amplitude track call with the event name and empty properties.',
  in: getEvent('product view', { id: 'ev1700000100', timestamp: 1700000100 }),
  out: [['amplitude.track', 'product view', {}, { insert_id: 'ev1700000100' }]],
};

/**
 * Wildcard ignore -- walkerOS's standard way to drop events. The rule
 * matches but does nothing. The destination fires zero SDK calls.
 */
export const wildcardIgnored: AmplitudeStepExample = {
  public: false,
  in: createEvent({ name: 'debug noise', timestamp: 1700000101 }),
  mapping: { ignore: true },
  out: [],
};

/**
 * Destination-level settings.include flattens the walkerOS `data` section
 * into prefixed event_properties on every push.
 */
export const destinationLevelInclude: AmplitudeStepExample = {
  title: 'Include data section',
  description:
    "With include: ['data'] in the destination config, the event data section is flattened into prefixed event_properties on every track call.",
  in: getEvent('product view', { id: 'ev1700000102', timestamp: 1700000102 }),
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
        data_currency: 'EUR',
      },
      { insert_id: 'ev1700000102' },
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
  title: 'Identify per event',
  description:
    "With settings.identify mapping user_id, device_id, and session_id to 'user.id', 'user.device', and 'user.session', every call carries them in its Amplitude EventOptions. A non-numeric session string is hashed to a stable number.",
  in: getEvent('page view', { id: 'ev1700000104', timestamp: 1700000104 }),
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
        insert_id: 'ev1700000104',
        user_id: 'us3r',
        device_id: 'c00k13',
        session_id: 394324160,
      },
    ],
  ],
};

/**
 * Per-event identify with the full operation vocabulary -- this is the
 * "user login" pattern: set user_id, enrich user properties. `silent: true`
 * suppresses the default amplitude.track() call because we're running
 * identity side effects only.
 *
 * Server-side, user_id is passed via EventOptions on identify().
 */
export const userLoginIdentify: AmplitudeStepExample = {
  title: 'User login identify',
  description:
    'A user login maps to amplitude.identify with set, setOnce, and add operations while the default track call is skipped.',
  in: createEvent({
    name: 'user login',
    id: 'ev1700000105',
    timestamp: 1700000105000,
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
          first_login: 1700000105000,
        },
        add: {
          login_count: 1,
        },
      },
      {
        insert_id: 'ev1700000105-identify',
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
 * `silent: true` suppresses the default track().
 */
export const subscriptionRenewRevenue: AmplitudeStepExample = {
  title: 'Subscription revenue',
  description:
    'A subscription renewal fires a single amplitude.revenue call with productId, price, and a currency fallback.',
  in: createEvent({
    name: 'subscription renew',
    id: 'ev1700000107',
    timestamp: 1700000107,
    data: {
      plan_id: 'plan-pro',
      amount: 9.99,
    },
  }),
  mapping: {
    silent: true,
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
      { insert_id: 'ev1700000107-revenue-0' },
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
  title: 'Multi-product order',
  description:
    'An order with multiple nested products fires one amplitude.revenue per product plus a single track for the order.',
  in: getEvent('order complete', { id: 'ev1700000108', timestamp: 1700000108 }),
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
      { insert_id: 'ev1700000108-revenue-0' },
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
      { insert_id: 'ev1700000108-revenue-1' },
    ],
    [
      'amplitude.track',
      'order complete',
      {
        data_id: '0rd3r1d',
        data_currency: 'EUR',
        data_value: 462,
        data_tax: 73.76,
        data_shipping: 5.22,
        data_total: 467.22,
        globals_pagegroup: 'shop',
      },
      { insert_id: 'ev1700000108' },
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
    'A company update assigns the user to a group and sets group properties via setGroup plus groupIdentify.',
  in: createEvent({
    name: 'company update',
    id: 'ev1700000109',
    timestamp: 1700000109,
    data: {
      company: 'Acme',
      industry: 'tech',
      employee_count: 50,
      founded_year: 2020,
    },
  }),
  mapping: {
    silent: true,
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
    [
      'amplitude.setGroup',
      'company',
      'Acme',
      { insert_id: 'ev1700000109-group' },
    ],
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
      { insert_id: 'ev1700000109-groupIdentify' },
    ],
  ],
};

/**
 * EventOptions mapping -- `settings.eventOptions` maps walkerOS fields
 * to Amplitude per-event metadata. Here `time` maps from the event
 * timestamp and `insert_id` maps from the event id for deduplication.
 */
export const eventOptionsTimeInsertId: AmplitudeStepExample = {
  title: 'Event options',
  description:
    "With settings.eventOptions mapping time to 'timestamp' and insert_id to 'id', each call carries the event time and that insert_id in its Amplitude EventOptions.",
  in: getEvent('page view', {
    timestamp: 1700000110000,
    id: '1700000110abcdef',
  }),
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
        time: 1700000110000,
        insert_id: '1700000110abcdef',
      },
    ],
  ],
};

const analyticsDenied: WalkerOS.Consent = { analytics: false };
const analyticsGranted: WalkerOS.Consent = { analytics: true };

/**
 * Consent revoked -> amplitude.setOptOut(true). After analytics consent is
 * granted (the destination loads), revoking it toggles optOut via the
 * on('consent') handler. The destination is never loaded under denied consent,
 * so the opt-out is a real revocation of an already-granted destination.
 *
 * Uses the canonical StepExample.command='consent' pattern: the test
 * runner dispatches via elb('walker consent', in) instead of pushing
 * an event.
 */
export const consentRevokeOptOut: AmplitudeStepExample = {
  title: 'Consent revoked',
  description:
    'With consent: { analytics: true } in the destination config, revoking analytics consent after a grant opts out of Amplitude tracking via setOptOut(true).',
  command: 'consent',
  before: { analytics: true },
  in: analyticsDenied,
  settings: {},
  out: [
    ['amplitude.setOptOut', false],
    ['amplitude.setOptOut', true],
  ],
};

/**
 * Consent granted -> amplitude.setOptOut(false).
 */
export const consentGrantOptIn: AmplitudeStepExample = {
  title: 'Consent granted',
  description:
    'With consent: { analytics: true } in the destination config, a walker consent command that grants analytics opts into Amplitude tracking via setOptOut(false).',
  command: 'consent',
  in: analyticsGranted,
  settings: {},
  out: [['amplitude.setOptOut', false]],
};

/** A silent rule without identify, group or revenue mappings calls nothing. */
export const silentRule: AmplitudeStepExample = {
  public: false,
  description:
    'A rule with silent: true and no identify, group or revenue mapping sends nothing to Amplitude.',
  in: getEvent('page view', { timestamp: 1700000110 }),
  mapping: { silent: true },
  out: [],
};

/**
 * The silent group rule of groupAssignmentWithProperties on an event without
 * data: no group name resolves and the rule suppresses the track, so nothing
 * is sent.
 */
export const groupAssignmentWithoutData: AmplitudeStepExample = {
  public: false,
  description:
    'A silent group rule whose name finds no data sends nothing: an unmet mapping, not a failure, so the push returns normally.',
  in: {
    name: 'company update',
    entity: 'company',
    action: 'update',
    timestamp: 1700000111,
  },
  mapping: groupAssignmentWithProperties.mapping,
  out: [],
};
