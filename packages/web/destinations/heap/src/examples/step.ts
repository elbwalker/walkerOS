import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Examples may optionally carry destination-level settings overrides.
 * The test runner reads `settings` from the example and merges it on top
 * of the fixed appId when registering the destination.
 */
export type HeapStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
};

/**
 * Default event forwarding — every walkerOS event becomes
 * heap.track(event.name, properties). With no mapping, properties is `{}`.
 */
export const defaultEventForwarding: HeapStepExample = {
  title: 'Default track',
  description:
    'A walker event becomes a Heap track call with the event name and empty properties.',
  in: getEvent('product view', { timestamp: 1700000100 }),
  out: [['heap.track', 'product view', {}]],
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
        total: 'data.total',
        currency: { key: 'data.currency', value: 'EUR' },
      },
    },
  },
  out: [
    [
      'heap.track',
      'purchase',
      { order_id: '0rd3r1d', total: 555, currency: 'EUR' },
    ],
  ],
};

/**
 * Destination-level settings.identify — heap.identify() resolves user.id,
 * then the default heap.track() call fires.
 */
export const destinationLevelIdentify: HeapStepExample = {
  title: 'Destination identify',
  description:
    'Destination-level identify calls heap.identify with the user id before firing the default track.',
  in: getEvent('page view', { timestamp: 1700000102 }),
  settings: {
    identify: 'user.id',
  },
  out: [
    ['heap.identify', 'us3r'],
    ['heap.track', 'page view', {}],
  ],
};

/**
 * Per-event login identify — heap.identify() from data.email + user
 * properties from the same rule. skip: true suppresses the track() call.
 */
export const userLoginIdentify: HeapStepExample = {
  title: 'User login identify',
  description:
    'A user login identifies the Heap user by email and adds user properties while skipping the track.',
  in: getEvent('user login', {
    timestamp: 1700000103,
    data: {
      email: 'user@example.com',
      plan: 'premium',
      company: 'Acme',
    },
  }),
  mapping: {
    skip: true,
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
    ['heap.identify', 'user@example.com'],
    ['heap.addUserProperties', { plan: 'premium', company: 'Acme' }],
  ],
};

/**
 * User logout — heap.resetIdentity(). skip: true suppresses the track() call.
 */
export const userLogoutReset: HeapStepExample = {
  title: 'User logout reset',
  description:
    'A user logout calls heap.resetIdentity to clear the identified user from the Heap client.',
  in: getEvent('user logout', { timestamp: 1700000104 }),
  mapping: {
    skip: true,
    settings: {
      reset: true,
    },
  },
  out: [['heap.resetIdentity']],
};

/**
 * Event with user properties from mapping — heap.addUserProperties() fires,
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
      total: 555,
      currency: 'EUR',
    },
  }),
  mapping: {
    settings: {
      userProperties: {
        map: {
          last_order_value: 'data.total',
          last_order_currency: 'data.currency',
        },
      },
    },
  },
  out: [
    [
      'heap.addUserProperties',
      { last_order_value: 555, last_order_currency: 'EUR' },
    ],
    ['heap.track', 'order complete', {}],
  ],
};

/**
 * Global event properties — heap.addEventProperties() sets persistent
 * properties on all subsequent events. skip: true on this rule.
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
    skip: true,
    settings: {
      eventProperties: {
        map: {
          page_category: 'data.category',
        },
      },
    },
  },
  out: [['heap.addEventProperties', { page_category: 'docs' }]],
};

/**
 * Consent revoked — on('consent') handler calls heap.stopTracking()
 * when a required consent key is false.
 */
export const consentRevokeStopTracking: HeapStepExample = {
  title: 'Consent revoked',
  description:
    'A walker consent revoke for analytics calls heap.stopTracking to pause event capture.',
  command: 'consent',
  in: { analytics: false },
  out: [['heap.stopTracking']],
};

/**
 * Consent granted — on('consent') handler calls heap.startTracking()
 * when all required consent keys are true.
 */
export const consentGrantStartTracking: HeapStepExample = {
  title: 'Consent granted',
  description:
    'A walker consent grant for analytics calls heap.startTracking to resume event capture.',
  command: 'consent',
  in: { analytics: true },
  out: [['heap.startTracking']],
};
