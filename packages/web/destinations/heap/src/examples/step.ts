import type { Flow, WalkerOS } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Examples may optionally carry destination-level settings overrides.
 * The test runner reads `settings` from the example and merges it on top
 * of the fixed appId when registering the destination.
 */
export type HeapStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
  /** Consent granted before `in` so a gated destination is loaded first. */
  before?: WalkerOS.Consent;
};

/**
 * Default event forwarding - every walkerOS event becomes
 * heap.track(event.name, properties). With no mapping, properties is `{}`.
 */
export const defaultEventForwarding: HeapStepExample = {
  title: 'Default track',
  description:
    'A walker event becomes a Heap track call with the event name and empty properties.',
  in: getEvent('product view', { timestamp: 1700000100 }),
  out: [['window.heap.track', 'product view', {}]],
};

/**
 * Rename + map event properties via rule.data.map.
 * data resolves to { order_id, total, currency } → heap.track('purchase', props).
 */
export const destinationLevelInclude: HeapStepExample = {
  title: 'Renamed purchase',
  description:
    'An order complete is renamed to purchase and mapped to Heap track properties such as order_id, total, and currency.',
  in: getEvent('order complete', { timestamp: 1700000101 }),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        order_id: 'data.id',
        total: ['data.total', 'data.value'],
        currency: { key: 'data.currency', value: 'EUR' },
      },
    },
  },
  out: [
    [
      'window.heap.track',
      'purchase',
      { order_id: '0rd3r1d', total: 467.22, currency: 'EUR' },
    ],
  ],
};

/**
 * Destination-level settings.identify - heap.identify() resolves user.id,
 * then the default heap.track() call fires.
 */
export const destinationLevelIdentify: HeapStepExample = {
  title: 'Destination identify',
  description:
    "With settings.identify set to 'user.id', the destination calls heap.identify before the default track.",
  in: getEvent('page view', { timestamp: 1700000102 }),
  settings: {
    identify: 'user.id',
  },
  out: [
    ['window.heap.identify', 'us3r'],
    ['window.heap.track', 'page view', {}],
  ],
};

/**
 * Per-event login identify - heap.identify() from data.email + user
 * properties from the same rule. silent: true suppresses the track() call.
 */
export const userLoginIdentify: HeapStepExample = {
  title: 'User login identify',
  description:
    'A user login identifies the Heap user by email and adds user properties while skipping the track.',
  in: createEvent({
    name: 'user login',
    timestamp: 1700000103,
    data: {
      email: 'user@example.com',
      plan: 'premium',
      company: 'Acme',
    },
  }),
  mapping: {
    silent: true,
    settings: {
      identify: 'data.email',
      userProperties: {
        map: {
          plan: 'data.plan',
          company: 'data.company',
        },
      },
    },
  },
  out: [
    ['window.heap.identify', 'user@example.com'],
    ['window.heap.addUserProperties', { plan: 'premium', company: 'Acme' }],
  ],
};

/**
 * User logout - heap.resetIdentity(). silent: true suppresses the track() call.
 */
export const userLogoutReset: HeapStepExample = {
  title: 'User logout reset',
  description:
    'A user logout calls heap.resetIdentity to clear the identified user from the Heap client.',
  in: createEvent({ name: 'user logout', timestamp: 1700000104 }),
  mapping: {
    silent: true,
    settings: {
      reset: true,
    },
  },
  out: [['window.heap.resetIdentity']],
};

/**
 * Event with user properties from mapping - heap.addUserProperties() fires,
 * then the default heap.track() call.
 */
export const eventWithUserProperties: HeapStepExample = {
  title: 'User properties on event',
  description:
    'An order fires Heap addUserProperties with last-order fields and then tracks the event.',
  in: getEvent('order complete', {
    timestamp: 1700000105,
    data: {
      id: '0rd3r1d',
      value: 555,
      currency: 'EUR',
    },
  }),
  mapping: {
    settings: {
      userProperties: {
        map: {
          last_order_value: 'data.value',
          last_order_currency: 'data.currency',
        },
      },
    },
  },
  out: [
    [
      'window.heap.addUserProperties',
      { last_order_value: 555, last_order_currency: 'EUR' },
    ],
    ['window.heap.track', 'order complete', {}],
  ],
};

/**
 * Global event properties - heap.addEventProperties() sets persistent
 * properties on all subsequent events. silent: true on this rule.
 */
export const globalEventProperties: HeapStepExample = {
  title: 'Global event properties',
  description:
    'A page view sets persistent Heap event properties so all subsequent events include the page category.',
  in: getEvent('page view', {
    timestamp: 1700000106,
    data: { category: 'docs' },
  }),
  mapping: {
    silent: true,
    settings: {
      eventProperties: {
        map: {
          page_category: 'data.category',
        },
      },
    },
  },
  out: [['window.heap.addEventProperties', { page_category: 'docs' }]],
};

/**
 * Consent granted then revoked: the destination loads under the grant, and
 * the revoke calls heap.stopTracking via the on('consent') handler; `out` is
 * the revoke's call. A gated destination never loads under denial, so the
 * stop is a real revocation of an already-granted destination.
 */
export const consentRevokeStopTracking: HeapStepExample = {
  title: 'Consent revoked',
  description:
    'With consent: { analytics: true } in the destination config, a revocation of analytics calls heap.stopTracking once Heap has loaded. The classic Heap SDK that loadScript loads has no such method, so there only the pushes stop.',
  command: 'consent',
  before: { analytics: true },
  in: { analytics: false },
  out: [['window.heap.stopTracking']],
};

/**
 * Consent granted - on('consent') handler calls heap.startTracking()
 * when one of the required consent keys is granted.
 */
export const consentGrantStartTracking: HeapStepExample = {
  title: 'Consent granted',
  description:
    'With consent: { analytics: true } in the destination config, a walker consent grant for analytics calls heap.startTracking.',
  command: 'consent',
  in: { analytics: true },
  out: [['window.heap.startTracking']],
};

/** A silent rule without settings of its own calls nothing. */
export const silentRule: HeapStepExample = {
  public: false,
  description: 'A rule with silent: true and no settings calls nothing.',
  in: getEvent('page view', { timestamp: 1700000107 }),
  mapping: { silent: true },
  out: [],
};
