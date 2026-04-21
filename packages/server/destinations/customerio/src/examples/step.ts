import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Extended step example that may carry destination-level settings overrides.
 */
export type CustomerIoStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
};

/**
 * Default event forwarding -- trackClient.track() with event name and data.
 * customerId resolved from default settings.customerId = 'user.id'.
 */
export const defaultTrack: CustomerIoStepExample = {
  in: getEvent('product view', {
    timestamp: 1700000100,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  out: [
    [
      'trackClient.track',
      'us3r',
      {
        name: 'product view',
        data: {},
        timestamp: 1700000,
      },
    ],
  ],
};

/**
 * Mapped event name -- mapping.name renames the event for Customer.io.
 */
export const mappedEventName: CustomerIoStepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000101,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: {
    name: 'purchase',
  },
  out: [
    [
      'trackClient.track',
      'us3r',
      {
        name: 'purchase',
        data: {},
        timestamp: 1700000,
      },
    ],
  ],
};

/**
 * Track with mapped data properties.
 */
export const mappedData: CustomerIoStepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000102,
    user: { id: 'us3r', session: 's3ss10n' },
    data: { id: '0rd3r1d', total: 555, currency: 'EUR' },
  }),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        order_id: 'data.id',
        value: 'data.total',
        currency: 'data.currency',
      },
    },
  },
  out: [
    [
      'trackClient.track',
      'us3r',
      {
        name: 'purchase',
        data: { order_id: '0rd3r1d', value: 555, currency: 'EUR' },
        timestamp: 1700000,
      },
    ],
  ],
};

/**
 * Anonymous event -- no customerId resolved, falls back to trackAnonymous().
 */
export const anonymousTrack: CustomerIoStepExample = {
  in: getEvent('product view', {
    timestamp: 1700000103,
    user: { session: 's3ss10n' },
  }),
  settings: {
    customerId: undefined,
  },
  out: [
    [
      'trackClient.trackAnonymous',
      's3ss10n',
      {
        name: 'product view',
        data: {},
        timestamp: 1700000,
      },
    ],
  ],
};

/**
 * Destination-level identify -- fires trackClient.identify() on first push
 * when settings.identify mapping resolves. Then fires trackClient.track().
 */
export const destinationIdentify: CustomerIoStepExample = {
  in: getEvent('page view', {
    timestamp: 1700000104,
    user: { id: 'us3r', session: 's3ss10n', email: 'user@example.com' },
  }),
  settings: {
    identify: {
      map: {
        email: 'user.email',
      },
    },
  },
  out: [
    ['trackClient.identify', 'us3r', { email: 'user@example.com' }],
    [
      'trackClient.track',
      'us3r',
      {
        name: 'page view',
        data: {},
        timestamp: 1700000,
      },
    ],
  ],
};

/**
 * Per-event identify with skip -- user login fires identify() only.
 */
export const userLoginIdentify: CustomerIoStepExample = {
  in: getEvent('user login', {
    timestamp: 1700000105,
    user: { id: 'us3r', session: 's3ss10n' },
    data: {
      email: 'user@acme.com',
      first_name: 'Jane',
      plan: 'premium',
    },
  }),
  mapping: {
    skip: true,
    settings: {
      identify: {
        map: {
          email: 'data.email',
          first_name: 'data.first_name',
          plan: 'data.plan',
        },
      },
    },
  },
  out: [
    [
      'trackClient.identify',
      'us3r',
      { email: 'user@acme.com', first_name: 'Jane', plan: 'premium' },
    ],
  ],
};

/**
 * Page view -- fires trackClient.trackPageView() with url.
 * skip: true suppresses track(); settings.page fires trackPageView().
 */
export const pageView: CustomerIoStepExample = {
  in: getEvent('page view', {
    timestamp: 1700000106,
    user: { id: 'us3r', session: 's3ss10n' },
    data: {
      url: 'https://example.com/pricing',
      referrer: 'https://google.com',
    },
  }),
  mapping: {
    skip: true,
    settings: {
      page: {
        map: {
          url: 'data.url',
          referrer: 'data.referrer',
        },
      },
    },
  },
  out: [
    [
      'trackClient.trackPageView',
      'us3r',
      'https://example.com/pricing',
      { referrer: 'https://google.com' },
    ],
  ],
};

/**
 * Destroy -- permanently deletes a person from Customer.io.
 */
export const destroyPerson: CustomerIoStepExample = {
  in: getEvent('user delete', {
    timestamp: 1700000107,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: {
    skip: true,
    settings: {
      destroy: true,
    },
  },
  out: [['trackClient.destroy', 'us3r']],
};

/**
 * Suppress -- stops messaging without deleting data.
 */
export const suppressPerson: CustomerIoStepExample = {
  in: getEvent('user suppress', {
    timestamp: 1700000108,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: {
    skip: true,
    settings: {
      suppress: true,
    },
  },
  out: [['trackClient.suppress', 'us3r']],
};

/**
 * Unsuppress -- resumes messaging for a suppressed person.
 */
export const unsuppressPerson: CustomerIoStepExample = {
  in: getEvent('user unsuppress', {
    timestamp: 1700000109,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: {
    skip: true,
    settings: {
      unsuppress: true,
    },
  },
  out: [['trackClient.unsuppress', 'us3r']],
};

/**
 * Wildcard ignore -- the event matches a mapping rule with ignore: true.
 * The destination fires zero SDK calls.
 */
export const wildcardIgnored: CustomerIoStepExample = {
  in: getEvent('debug noise', {
    timestamp: 1700000110,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: { ignore: true },
  out: [],
};
