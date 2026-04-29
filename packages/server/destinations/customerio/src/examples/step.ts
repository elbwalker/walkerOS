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
  title: 'Default track',
  description:
    'A walkerOS event is forwarded to Customer.io as a track call keyed by the user id.',
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
  title: 'Rename event',
  description:
    'A mapping rule renames the walker event to a Customer.io-specific event name such as purchase.',
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
  title: 'Mapped properties',
  description:
    'A data mapping transforms the event payload into Customer.io track properties for an order.',
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
  title: 'Anonymous track',
  description:
    'When no customer id is resolved the event is sent via trackAnonymous keyed by the session id.',
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
  title: 'Destination identify',
  description:
    'Destination-level identify fires a Customer.io identify call once on the first push, before the track, attaching user attributes.',
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
 * Per-event identify with silent -- user login fires identify() only.
 */
export const userLoginIdentify: CustomerIoStepExample = {
  title: 'User login identify',
  description:
    'A user login triggers only a Customer.io identify call with profile attributes, skipping the track.',
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
    silent: true,
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
 * silent: true suppresses track(); settings.page fires trackPageView().
 */
export const pageView: CustomerIoStepExample = {
  title: 'Page view',
  description:
    'A page view fires trackPageView with the URL and referrer instead of a generic track call.',
  in: getEvent('page view', {
    timestamp: 1700000106,
    user: { id: 'us3r', session: 's3ss10n' },
    data: {
      url: 'https://example.com/pricing',
      referrer: 'https://google.com',
    },
  }),
  mapping: {
    silent: true,
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
  title: 'Destroy person',
  description:
    'A user delete event permanently removes the person from Customer.io via trackClient.destroy.',
  in: getEvent('user delete', {
    timestamp: 1700000107,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: {
    silent: true,
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
  title: 'Suppress person',
  description:
    'A user suppress event stops messaging for the person without deleting their profile data.',
  in: getEvent('user suppress', {
    timestamp: 1700000108,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: {
    silent: true,
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
  title: 'Unsuppress person',
  description:
    'A user unsuppress event resumes messaging for a previously suppressed Customer.io profile.',
  in: getEvent('user unsuppress', {
    timestamp: 1700000109,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: {
    silent: true,
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
  public: false,
  in: getEvent('debug noise', {
    timestamp: 1700000110,
    user: { id: 'us3r', session: 's3ss10n' },
  }),
  mapping: { ignore: true },
  out: [],
};
