import type { Flow, WalkerOS } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * PostHog server step examples carry destination-level settings and
 * optional configInclude for the test runner to wire up.
 *
 * At push time the destination invokes methods on a `client` constructed
 * via `env.PostHog`. Each `out` tuple is `['client.<method>', ...args]`
 * matching the underlying SDK signature. Multiple calls (identify +
 * capture, groupIdentify + capture) are expressed as a tuple list.
 */
export type PostHogStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
  configInclude?: string[];
  /** Consent granted before `in` so a gated destination is loaded first. */
  before?: WalkerOS.Consent;
};

/**
 * Default event forwarding - every walkerOS event becomes
 * client.capture({ distinctId, event, properties }). With no mapping
 * and no include, properties is {}. distinctId falls back to event.user.id.
 */
export const defaultCapture: PostHogStepExample = {
  title: 'Default capture',
  description:
    'A walker event becomes a PostHog capture call with the user id as distinctId and no extra properties.',
  in: getEvent('product view', {
    id: 'ev1700000100',
    timestamp: 1700000100000,
  }),
  out: [
    [
      'client.capture',
      {
        uuid: 'b8a7f21f-1a9f-8aa7-8480-8d16fb64c44c',
        distinctId: 'us3r',
        event: 'product view',
        properties: {},
      },
    ],
  ],
};

/**
 * Capture with include - destination-level include flattens data and
 * globals sections into prefixed properties.
 */
export const captureWithInclude: PostHogStepExample = {
  title: 'Capture with include',
  description:
    "With include: ['data', 'globals'] in the destination config, the data and globals sections are flattened into prefixed PostHog event properties.",
  in: getEvent('order complete', {
    id: 'ev1700000101',
    timestamp: 1700000101000,
  }),
  configInclude: ['data', 'globals'],
  out: [
    [
      'client.capture',
      {
        uuid: 'a5a5ede9-4f3b-85f4-b30f-3da8773fabfa',
        distinctId: 'us3r',
        event: 'order complete',
        properties: {
          data_id: '0rd3r1d',
          data_currency: 'EUR',
          data_value: 462,
          data_tax: 73.76,
          data_shipping: 5.22,
          data_total: 467.22,
          globals_pagegroup: 'shop',
        },
      },
    ],
  ],
};

/**
 * Identify with $set and $set_once - per-event mapping fires
 * client.identify() with person properties. silent: true suppresses capture.
 */
export const identifyWithSetAndSetOnce: PostHogStepExample = {
  title: 'Identify with $set',
  description:
    'A user login fires PostHog identify with $set and $set_once person properties and skips the capture.',
  in: createEvent({
    name: 'user login',
    timestamp: 1700000102000,
    data: {
      user_id: 'new-user-123',
      email: 'user@acme.com',
      plan: 'premium',
    },
  }),
  mapping: {
    silent: true,
    settings: {
      identify: {
        map: {
          distinctId: 'data.user_id',
          $set: {
            map: {
              email: 'data.email',
              plan: 'data.plan',
            },
          },
          $set_once: {
            map: {
              first_login: 'timestamp',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'client.identify',
      {
        distinctId: 'new-user-123',
        properties: {
          $set: {
            email: 'user@acme.com',
            plan: 'premium',
          },
          $set_once: {
            first_login: 1700000102000,
          },
        },
      },
    ],
  ],
};

/**
 * Group identify with properties - per-event mapping fires
 * client.groupIdentify() with group properties. silent: true suppresses capture.
 */
export const groupIdentifyWithProperties: PostHogStepExample = {
  title: 'Group identify',
  description:
    'A company update fires PostHog groupIdentify with group type, key, and associated group properties.',
  in: createEvent({
    name: 'company update',
    timestamp: 1700000103000,
    data: {
      company_id: 'company_123',
      company_name: 'Acme',
      plan: 'enterprise',
    },
  }),
  mapping: {
    silent: true,
    settings: {
      group: {
        map: {
          type: { value: 'company' },
          key: 'data.company_id',
          properties: {
            map: {
              name: 'data.company_name',
              plan: 'data.plan',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'client.groupIdentify',
      {
        groupType: 'company',
        groupKey: 'company_123',
        properties: {
          name: 'Acme',
          plan: 'enterprise',
        },
      },
    ],
  ],
};

/**
 * Capture with group context - destination-level settings.group resolves
 * type + key (no properties). The capture call includes groups.
 */
export const captureWithGroupContext: PostHogStepExample = {
  title: 'Capture with group',
  description:
    "With settings.group mapping type to 'company' and key to 'globals.company_id', every PostHog capture call carries the resolved group.",
  in: getEvent('page view', {
    id: 'ev1700000104',
    timestamp: 1700000104000,
    globals: { pagegroup: 'docs', company_id: 'company_123' },
  }),
  settings: {
    group: {
      map: {
        type: { value: 'company' },
        key: 'globals.company_id',
      },
    },
  },
  out: [
    [
      'client.capture',
      {
        uuid: 'c6a47305-44fc-8835-b15f-3f494c1f9e20',
        distinctId: 'us3r',
        event: 'page view',
        properties: {},
        groups: { company: 'company_123' },
      },
    ],
  ],
};

const analyticsDenied: WalkerOS.Consent = { analytics: false };
const analyticsGranted: WalkerOS.Consent = { analytics: true };

/**
 * Consent revoked - after analytics consent is granted (PostHog loads and is
 * enabled), revoking it calls client.disable() via the on('consent') handler.
 * The destination is never loaded under denied consent, so the disable is a
 * real revocation of an already-granted destination.
 */
export const consentRevoke: PostHogStepExample = {
  title: 'Consent revoked',
  description:
    'With consent: { analytics: true } in the destination config, revoking analytics consent after a grant calls client.disable on the PostHog client.',
  command: 'consent',
  before: { analytics: true },
  in: analyticsDenied,
  settings: {},
  out: [['client.enable'], ['client.disable']],
};

/**
 * Consent granted - client.enable() is called.
 */
export const consentGrant: PostHogStepExample = {
  title: 'Consent granted',
  description:
    'With consent: { analytics: true } in the destination config, a walker consent command that grants analytics calls client.enable on the PostHog client.',
  command: 'consent',
  in: analyticsGranted,
  settings: {},
  out: [['client.enable']],
};

/** A silent rule without identify or group mappings calls nothing. */
export const silentRule: PostHogStepExample = {
  public: false,
  description:
    'A rule with silent: true and no identify or group mapping sends nothing to PostHog.',
  in: getEvent('page view', { timestamp: 1700000105000 }),
  mapping: { silent: true },
  out: [],
};

/**
 * The silent group identify rule of groupIdentifyWithProperties on an event
 * without data: no group key resolves and the rule suppresses the capture,
 * so nothing is sent.
 */
export const groupIdentifyWithoutData: PostHogStepExample = {
  public: false,
  description:
    'A silent group rule whose key finds no data sends nothing: an unmet mapping, not a failure, so the push returns normally.',
  in: {
    name: 'company update',
    entity: 'company',
    action: 'update',
    timestamp: 1700000106000,
  },
  mapping: groupIdentifyWithProperties.mapping,
  out: [],
};
