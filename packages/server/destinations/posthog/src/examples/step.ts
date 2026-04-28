import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
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
  in: getEvent('product view', { timestamp: 1700000100 }),
  out: [
    [
      'client.capture',
      {
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
    'Destination-level include flattens data and globals sections into prefixed PostHog event properties.',
  in: getEvent('order complete', { timestamp: 1700000101 }),
  configInclude: ['data', 'globals'],
  out: [
    [
      'client.capture',
      {
        distinctId: 'us3r',
        event: 'order complete',
        properties: {
          data_id: '0rd3r1d',
          data_currency: 'EUR',
          data_shipping: 5.22,
          data_taxes: 73.76,
          data_total: 555,
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
  in: getEvent('user login', {
    timestamp: 1700000102,
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
            first_login: 1700000102,
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
  in: getEvent('company update', {
    timestamp: 1700000103,
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
    'A destination-level group mapping attaches the resolved group context to every PostHog capture call.',
  in: getEvent('page view', {
    timestamp: 1700000104,
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
        distinctId: 'us3r',
        event: 'page view',
        properties: {},
        groups: { company: 'company_123' },
      },
    ],
  ],
};

/**
 * Consent revoked - client.disable() is called.
 */
export const consentRevoke: PostHogStepExample = {
  title: 'Consent revoked',
  description:
    'A walker consent command with analytics denied calls client.disable on the PostHog client.',
  command: 'consent',
  in: { analytics: false } as WalkerOS.Consent,
  settings: {} as Partial<Settings>,
  out: [['client.disable']],
};

/**
 * Consent granted - client.enable() is called.
 */
export const consentGrant: PostHogStepExample = {
  title: 'Consent granted',
  description:
    'A walker consent command with analytics granted calls client.enable on the PostHog client.',
  command: 'consent',
  in: { analytics: true } as WalkerOS.Consent,
  settings: {} as Partial<Settings>,
  out: [['client.enable']],
};
