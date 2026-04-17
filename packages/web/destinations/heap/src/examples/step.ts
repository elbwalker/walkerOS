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
  in: getEvent('product view', { timestamp: 1700000100 }),
  out: ['track', 'product view', {}],
};

/**
 * Rename + map event properties via rule.data.map.
 * data resolves to { order_id, total, currency } → heap.track('purchase', props).
 */
export const destinationLevelInclude: HeapStepExample = {
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
    'track',
    'purchase',
    { order_id: '0rd3r1d', total: 555, currency: 'EUR' },
  ],
};

/**
 * Destination-level settings.identify — heap.identify() resolves user.id,
 * then the default heap.track() call fires.
 */
export const destinationLevelIdentify: HeapStepExample = {
  in: getEvent('page view', { timestamp: 1700000102 }),
  settings: {
    identify: 'user.id',
  },
  out: [
    ['identify', 'us3r'],
    ['track', 'page view', {}],
  ],
};

/**
 * Per-event login identify — heap.identify() from data.email + user
 * properties from the same rule. skip: true suppresses the track() call.
 */
export const userLoginIdentify: HeapStepExample = {
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
    ['identify', 'user@example.com'],
    ['addUserProperties', { plan: 'premium', company: 'Acme' }],
  ],
};

/**
 * User logout — heap.resetIdentity(). skip: true suppresses the track() call.
 */
export const userLogoutReset: HeapStepExample = {
  in: getEvent('user logout', { timestamp: 1700000104 }),
  mapping: {
    skip: true,
    settings: {
      reset: true,
    },
  },
  out: [['resetIdentity']],
};

/**
 * Event with user properties from mapping — heap.addUserProperties() fires,
 * then the default heap.track() call.
 */
export const eventWithUserProperties: HeapStepExample = {
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
      'addUserProperties',
      { last_order_value: 555, last_order_currency: 'EUR' },
    ],
    ['track', 'order complete', {}],
  ],
};

/**
 * Global event properties — heap.addEventProperties() sets persistent
 * properties on all subsequent events. skip: true on this rule.
 */
export const globalEventProperties: HeapStepExample = {
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
  out: [['addEventProperties', { page_category: 'docs' }]],
};

/**
 * Consent revoked — on('consent') handler calls heap.stopTracking()
 * when a required consent key is false.
 */
export const consentRevokeStopTracking: HeapStepExample = {
  command: 'consent',
  in: { analytics: false },
  out: ['stopTracking'],
};

/**
 * Consent granted — on('consent') handler calls heap.startTracking()
 * when all required consent keys are true.
 */
export const consentGrantStartTracking: HeapStepExample = {
  command: 'consent',
  in: { analytics: true },
  out: ['startTracking'],
};
