import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Klaviyo SDK step examples.
 *
 * At push time, the destination invokes the `klaviyo-api` SDK. The public
 * method paths users see on the client are:
 *
 *   - `eventsApi.createEvent(body)` - fires a metric event with inline profile
 *   - `profilesApi.createOrUpdateProfile(body)` - upserts a profile
 *
 * Each `out` is therefore `[['method.path', ...args], ...]` matching the
 * actual SDK call order. `identify` fires before the event. When the rule
 * uses `silent: true` or `ignore: true`, `out` is `[]` or the identify-only
 * list.
 */

/**
 * Extended step example that may carry destination-level settings overrides.
 */
export type KlaviyoStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
};

/**
 * Default event forwarding -- eventsApi.createEvent() with event name and
 * inline profile. Email resolved from default settings.email = 'user.email'.
 */
export const defaultEvent: KlaviyoStepExample = {
  title: 'Default event',
  description:
    'An event is sent to Klaviyo as a metric with an inline profile resolved from the user email and id.',
  in: getEvent('product view', {
    id: 'a1b2c3d4e5f60100',
    timestamp: 1700000100,
    user: { id: 'us3r', email: 'user@example.com' },
  }),
  out: [
    [
      'eventsApi.createEvent',
      {
        data: {
          type: 'event',
          attributes: {
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: 'user@example.com',
                  externalId: 'us3r',
                },
              },
            },
            metric: {
              data: {
                type: 'metric',
                attributes: { name: 'product view' },
              },
            },
            properties: {},
            time: new Date(1700000100).toISOString(),
            uniqueId: 'a1b2c3d4e5f60100',
          },
        },
      },
    ],
  ],
};

/**
 * Mapped event name -- mapping.name renames the event to Klaviyo's expected
 * metric name for ecommerce reporting.
 */
export const mappedEventName: KlaviyoStepExample = {
  title: 'Viewed product',
  description:
    'A product view is mapped to the Klaviyo Viewed Product metric with properties such as product name and price.',
  in: getEvent('product view', {
    id: 'a1b2c3d4e5f60101',
    timestamp: 1700000101,
    user: { id: 'us3r', email: 'user@example.com' },
    data: {
      name: 'USB Cable',
      id: 'PROD-1',
      price: 9.99,
    },
  }),
  mapping: {
    name: 'Viewed Product',
    data: {
      map: {
        ProductName: 'data.name',
        ProductID: 'data.id',
        Price: 'data.price',
      },
    },
  },
  out: [
    [
      'eventsApi.createEvent',
      {
        data: {
          type: 'event',
          attributes: {
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: 'user@example.com',
                  externalId: 'us3r',
                },
              },
            },
            metric: {
              data: {
                type: 'metric',
                attributes: { name: 'Viewed Product' },
              },
            },
            properties: {
              ProductName: 'USB Cable',
              ProductID: 'PROD-1',
              Price: 9.99,
            },
            time: new Date(1700000101).toISOString(),
            uniqueId: 'a1b2c3d4e5f60101',
          },
        },
      },
    ],
  ],
};

/**
 * Revenue event -- order complete with value mapping. Sets $value and
 * valueCurrency on the Klaviyo event for revenue tracking.
 */
export const revenueEvent: KlaviyoStepExample = {
  title: 'Placed order',
  description:
    'An order complete is sent to Klaviyo as Placed Order with value and currency for revenue attribution.',
  in: getEvent('order complete', {
    id: 'a1b2c3d4e5f60102',
    timestamp: 1700000102,
    user: { id: 'us3r', email: 'user@example.com' },
    data: {
      id: 'ORD-123',
      total: 99.99,
      itemNames: ['Widget A', 'Widget B'],
    },
  }),
  settings: {
    currency: 'EUR',
  },
  mapping: {
    name: 'Placed Order',
    data: {
      map: {
        OrderId: 'data.id',
        ItemNames: 'data.itemNames',
      },
    },
    settings: {
      value: 'data.total',
    },
  },
  out: [
    [
      'eventsApi.createEvent',
      {
        data: {
          type: 'event',
          attributes: {
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: 'user@example.com',
                  externalId: 'us3r',
                },
              },
            },
            metric: {
              data: {
                type: 'metric',
                attributes: { name: 'Placed Order' },
              },
            },
            properties: {
              OrderId: 'ORD-123',
              ItemNames: ['Widget A', 'Widget B'],
            },
            time: new Date(1700000102).toISOString(),
            value: 99.99,
            valueCurrency: 'EUR',
            uniqueId: 'a1b2c3d4e5f60102',
          },
        },
      },
    ],
  ],
};

/**
 * Per-event identify with silent -- user login fires
 * profilesApi.createOrUpdateProfile() only, no event tracked.
 */
export const userLoginIdentify: KlaviyoStepExample = {
  title: 'User login identify',
  description:
    'A user login upserts the Klaviyo profile with name, organization, and custom properties without firing an event.',
  in: getEvent('user login', {
    id: 'a1b2c3d4e5f60103',
    timestamp: 1700000103,
    user: { id: 'us3r', email: 'user@acme.com' },
    data: {
      firstName: 'Jane',
      lastName: 'Doe',
      company: 'Acme Corp',
      plan: 'premium',
    },
  }),
  mapping: {
    silent: true,
    settings: {
      identify: {
        map: {
          firstName: 'data.firstName',
          lastName: 'data.lastName',
          organization: 'data.company',
          properties: {
            map: {
              plan: 'data.plan',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'profilesApi.createOrUpdateProfile',
      {
        data: {
          type: 'profile',
          attributes: {
            email: 'user@acme.com',
            externalId: 'us3r',
            firstName: 'Jane',
            lastName: 'Doe',
            organization: 'Acme Corp',
            properties: {
              plan: 'premium',
            },
          },
        },
      },
    ],
  ],
};

/**
 * Destination-level identify -- fires profilesApi.createOrUpdateProfile()
 * on first push when settings.identify resolves, then fires createEvent().
 */
export const destinationIdentify: KlaviyoStepExample = {
  title: 'Destination identify',
  description:
    'Destination-level identify upserts the Klaviyo profile with a first name before each event is sent.',
  in: getEvent('page view', {
    id: 'a1b2c3d4e5f60104',
    timestamp: 1700000104,
    user: { id: 'us3r', email: 'user@example.com', firstName: 'Jane' },
  }),
  settings: {
    identify: {
      map: {
        firstName: 'user.firstName',
      },
    },
  },
  out: [
    [
      'profilesApi.createOrUpdateProfile',
      {
        data: {
          type: 'profile',
          attributes: {
            email: 'user@example.com',
            externalId: 'us3r',
            firstName: 'Jane',
          },
        },
      },
    ],
    [
      'eventsApi.createEvent',
      {
        data: {
          type: 'event',
          attributes: {
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: 'user@example.com',
                  externalId: 'us3r',
                },
              },
            },
            metric: {
              data: {
                type: 'metric',
                attributes: { name: 'page view' },
              },
            },
            properties: {},
            time: new Date(1700000104).toISOString(),
            uniqueId: 'a1b2c3d4e5f60104',
          },
        },
      },
    ],
  ],
};

/**
 * Email only -- no externalId. Klaviyo accepts email as sole identifier.
 */
export const emailOnly: KlaviyoStepExample = {
  title: 'Email only',
  description:
    'A newsletter signup uses only the email address as the Klaviyo profile identifier, with no external id.',
  in: getEvent('newsletter signup', {
    id: 'a1b2c3d4e5f60105',
    timestamp: 1700000105,
    user: { email: 'subscriber@example.com' },
  }),
  settings: {
    externalId: undefined,
  },
  out: [
    [
      'eventsApi.createEvent',
      {
        data: {
          type: 'event',
          attributes: {
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: 'subscriber@example.com',
                },
              },
            },
            metric: {
              data: {
                type: 'metric',
                attributes: { name: 'newsletter signup' },
              },
            },
            properties: {},
            time: new Date(1700000105).toISOString(),
            uniqueId: 'a1b2c3d4e5f60105',
          },
        },
      },
    ],
  ],
};

/**
 * Wildcard ignore -- the event matches a mapping rule with ignore: true.
 * The destination fires zero API calls.
 */
export const wildcardIgnored: KlaviyoStepExample = {
  public: false,
  in: getEvent('debug noise', {
    id: 'a1b2c3d4e5f60106',
    timestamp: 1700000106,
    user: { id: 'us3r', email: 'user@example.com' },
  }),
  mapping: { ignore: true },
  out: [],
};

/**
 * Deduplicated order -- `settings.uniqueId` resolves Klaviyo's `unique_id`,
 * the key Klaviyo deduplicates on. Without it Klaviyo falls back to the
 * event time truncated to the second, which admits only one event per
 * profile per metric per second and silently drops or duplicates the rest.
 */
export const dedupedOrder: KlaviyoStepExample = {
  title: 'Deduplicated order',
  description:
    'An order carries a stable unique id so Klaviyo keeps only the first copy when the same order arrives from another producer.',
  in: getEvent('order complete', {
    id: 'a1b2c3d4e5f60107',
    timestamp: 1700000107,
    user: { id: 'us3r', email: 'user@example.com' },
    data: { id: 'ORD-123', total: 49.5 },
  }),
  mapping: {
    name: 'Placed Order',
    data: { map: { OrderId: 'data.id' } },
    settings: { uniqueId: 'data.id' },
  },
  out: [
    [
      'eventsApi.createEvent',
      {
        data: {
          type: 'event',
          attributes: {
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: 'user@example.com',
                  externalId: 'us3r',
                },
              },
            },
            metric: {
              data: {
                type: 'metric',
                attributes: { name: 'Placed Order' },
              },
            },
            properties: { OrderId: 'ORD-123' },
            time: new Date(1700000107).toISOString(),
            uniqueId: 'ORD-123',
          },
        },
      },
    ],
  ],
};

/**
 * Numeric dedup key -- order ids are commonly numbers. Coercing them keeps
 * the dedup key instead of dropping it, which would silently return Klaviyo
 * to its time-to-the-second fallback and re-admit duplicates.
 */
export const numericUniqueId: KlaviyoStepExample = {
  public: false,
  in: getEvent('order complete', {
    id: 'a1b2c3d4e5f60108',
    timestamp: 1700000108,
    user: { id: 'us3r', email: 'user@example.com' },
    data: { id: 90210 },
  }),
  mapping: {
    name: 'Placed Order',
    settings: { uniqueId: 'data.id' },
  },
  out: [
    [
      'eventsApi.createEvent',
      {
        data: {
          type: 'event',
          attributes: {
            profile: {
              data: {
                type: 'profile',
                attributes: {
                  email: 'user@example.com',
                  externalId: 'us3r',
                },
              },
            },
            metric: {
              data: {
                type: 'metric',
                attributes: { name: 'Placed Order' },
              },
            },
            properties: {},
            time: new Date(1700000108).toISOString(),
            uniqueId: '90210',
          },
        },
      },
    ],
  ],
};
