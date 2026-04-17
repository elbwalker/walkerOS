import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { Settings } from '../types';

/**
 * Examples may optionally carry destination-level settings.
 * The test runner merges this on top of a base { apiKey: 'test-project' }.
 */
export type SegmentStepExample = Flow.StepExample & {
  settings?: Partial<Settings>;
  configInclude?: string[];
};

/**
 * Default event forwarding — every walkerOS event becomes
 * analytics.track(event.name, properties). With no mapping and no
 * destination-level include, properties is `{}`.
 */
export const defaultEventForwarding: SegmentStepExample = {
  in: getEvent('product view', { timestamp: 1700000100 }),
  out: [['analytics.track', 'product view', {}]],
};

/**
 * Wildcard ignore — walkerOS's standard way to drop events. The rule
 * matches but does nothing. The destination fires zero SDK calls.
 */
export const wildcardIgnored: SegmentStepExample = {
  in: getEvent('debug noise', { timestamp: 1700000101 }),
  mapping: { ignore: true },
  out: [],
};

/**
 * Destination-level settings.include flattens the walkerOS `data` section
 * into prefixed properties on every push.
 */
export const destinationLevelInclude: SegmentStepExample = {
  in: getEvent('product view', { timestamp: 1700000102 }),
  configInclude: ['data'],
  out: [
    [
      'analytics.track',
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
 * Per-rule settings.include REPLACES destination-level include for the
 * matched rule. Here destination-level sends `data`, but the rule
 * overrides it with `globals` only.
 */
export const ruleIncludeReplaces: SegmentStepExample = {
  in: getEvent('order complete', { timestamp: 1700000103 }),
  configInclude: ['data'],
  mapping: {
    include: ['globals'],
  },
  out: [
    [
      'analytics.track',
      'order complete',
      {
        globals_pagegroup: 'shop',
      },
    ],
  ],
};

/**
 * Destination-level settings.identify fires on the first push. The
 * destination resolves the mapping, calls analytics.identify(userId),
 * and records the value in runtime state. Subsequent pushes with the
 * same userId do NOT re-fire identify().
 */
export const destinationLevelIdentify: SegmentStepExample = {
  in: getEvent('page view', { timestamp: 1700000104 }),
  settings: {
    identify: {
      map: {
        userId: 'user.id',
      },
    },
  },
  out: [
    ['analytics.identify', 'us3r', {}],
    ['analytics.track', 'page view', {}],
  ],
};

/**
 * Per-event identify with traits — the canonical "user login" pattern.
 * skip: true suppresses the default analytics.track() call because we're
 * running identity side effects only. Matches Segment Spec reserved traits
 * (email, name, plan, company) so downstream destinations recognize them.
 */
export const userLoginIdentify: SegmentStepExample = {
  in: getEvent('user login', {
    timestamp: 1700000105,
    data: {
      user_id: 'new-user-123',
      email: 'user@acme.com',
      name: 'Jane Doe',
      plan: 'premium',
      company_name: 'Acme',
      company_id: 'comp-456',
    },
  }),
  mapping: {
    skip: true,
    settings: {
      identify: {
        map: {
          userId: 'data.user_id',
          traits: {
            map: {
              email: 'data.email',
              name: 'data.name',
              plan: 'data.plan',
              company: {
                map: {
                  name: 'data.company_name',
                  id: 'data.company_id',
                },
              },
            },
          },
        },
      },
    },
  },
  out: [
    [
      'analytics.identify',
      'new-user-123',
      {
        email: 'user@acme.com',
        name: 'Jane Doe',
        plan: 'premium',
        company: { name: 'Acme', id: 'comp-456' },
      },
    ],
  ],
};

/**
 * Profile update — omit userId. Segment's SDK uses the currently stored
 * userId and merges the traits into the existing trait set.
 */
export const profileUpdateTraitsOnly: SegmentStepExample = {
  in: getEvent('profile update', {
    timestamp: 1700000106,
    data: {
      name: 'Jane Q. Doe',
      avatar_url: 'https://example.com/avatar.png',
      phone: '+1234567890',
    },
  }),
  mapping: {
    skip: true,
    settings: {
      identify: {
        map: {
          traits: {
            map: {
              name: 'data.name',
              avatar: 'data.avatar_url',
              phone: 'data.phone',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'analytics.identify',
      undefined,
      {
        name: 'Jane Q. Doe',
        avatar: 'https://example.com/avatar.png',
        phone: '+1234567890',
      },
    ],
  ],
};

/**
 * User logout — reset: true fires analytics.reset(), which clears userId,
 * anonymousId, traits, and generates a new anonymous ID.
 * skip: true because we're only running the reset side effect.
 */
export const userLogoutReset: SegmentStepExample = {
  in: getEvent('user logout', { timestamp: 1700000107 }),
  mapping: {
    skip: true,
    settings: {
      reset: true,
    },
  },
  out: [['analytics.reset']],
};

/**
 * Per-event group assignment — company update event attaches the user
 * to a company and sets the company's traits in one call.
 */
export const companyUpdateGroup: SegmentStepExample = {
  in: getEvent('company update', {
    timestamp: 1700000108,
    data: {
      company_id: 'comp-456',
      company_name: 'Acme',
      industry: 'tech',
      employees: 50,
      plan: 'enterprise',
    },
  }),
  mapping: {
    skip: true,
    settings: {
      group: {
        map: {
          groupId: 'data.company_id',
          traits: {
            map: {
              name: 'data.company_name',
              industry: 'data.industry',
              employees: 'data.employees',
              plan: 'data.plan',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'analytics.group',
      'comp-456',
      {
        name: 'Acme',
        industry: 'tech',
        employees: 50,
        plan: 'enterprise',
      },
    ],
  ],
};

/**
 * Explicit page() call — the canonical Segment pattern for page views.
 * skip: true suppresses the default track() call; settings.page fires
 * analytics.page(category, name, properties) instead.
 */
export const pageViewAsPage: SegmentStepExample = {
  in: getEvent('page view', {
    timestamp: 1700000109,
    data: {
      category: 'docs',
      title: 'Getting Started',
      section: 'tutorials',
    },
  }),
  mapping: {
    skip: true,
    settings: {
      page: {
        map: {
          category: 'data.category',
          name: 'data.title',
          properties: {
            map: {
              section: 'data.section',
            },
          },
        },
      },
    },
  },
  out: [
    [
      'analytics.page',
      'docs',
      'Getting Started',
      {
        section: 'tutorials',
      },
    ],
  ],
};

/**
 * Minimal page() call — settings.page: true produces an empty
 * analytics.page() relying entirely on SDK auto-collection.
 */
export const pageViewMinimal: SegmentStepExample = {
  in: getEvent('page view', { timestamp: 1700000110 }),
  mapping: {
    skip: true,
    settings: {
      page: true,
    },
  },
  out: [['analytics.page']],
};

/**
 * Segment ecommerce spec — Order Completed event. One track() call with
 * a products array. Uses mapping.name to produce the Segment Spec name
 * and mapping.data to build the properties object including the nested
 * products loop. The loop filters via condition to products with prices.
 */
export const orderCompletedEcommerce: SegmentStepExample = {
  in: getEvent('order complete', { timestamp: 1700000111 }),
  mapping: {
    name: 'Order Completed',
    data: {
      map: {
        order_id: 'data.id',
        currency: { key: 'data.currency', value: 'EUR' },
        shipping: 'data.shipping',
        tax: 'data.taxes',
        total: 'data.total',
        products: {
          loop: [
            'nested',
            {
              condition: (value: unknown) => {
                const v = value as { data?: { price?: unknown } };
                return typeof v?.data?.price === 'number';
              },
              map: {
                product_id: 'data.id',
                name: 'data.name',
                price: 'data.price',
                quantity: { key: 'data.quantity', value: 1 },
                currency: { key: 'data.currency', value: 'EUR' },
              },
            },
          ],
        },
      },
    },
  },
  out: [
    [
      'analytics.track',
      'Order Completed',
      {
        order_id: '0rd3r1d',
        currency: 'EUR',
        shipping: 5.22,
        tax: 73.76,
        total: 555,
        products: [
          {
            product_id: 'ers',
            name: 'Everyday Ruck Snack',
            price: 420,
            quantity: 1,
            currency: 'EUR',
          },
          {
            product_id: 'cc',
            name: 'Cool Cap',
            price: 42,
            quantity: 1,
            currency: 'EUR',
          },
        ],
      },
    ],
  ],
};

/**
 * Consent context forwarding — when the event has consent state,
 * the destination automatically stamps every track/identify/group/page
 * call with context.consent.categoryPreferences. settings.consent
 * remaps walkerOS keys to Segment category names.
 */
export const consentContextForwarded: SegmentStepExample = {
  in: getEvent('product view', {
    timestamp: 1700000112,
    consent: { analytics: true, marketing: true },
  }),
  settings: {
    consent: {
      analytics: 'Analytics',
      marketing: 'Advertising',
    },
  },
  out: [
    [
      'analytics.track',
      'product view',
      {},
      {
        context: {
          consent: {
            categoryPreferences: {
              Analytics: true,
              Advertising: true,
            },
          },
        },
      },
    ],
  ],
};

/**
 * Consent granted → deferred load fires for the first time. The
 * destination was initialized with consent requirement; on the walker
 * consent command it calls analytics.load(writeKey, initOptions).
 *
 * Uses the canonical StepExample.command='consent' pattern. The full
 * call shape includes both the settings arg and the initOptions arg.
 */
export const consentGrantDeferredLoad: SegmentStepExample = {
  command: 'consent',
  in: { analytics: true } as WalkerOS.Consent,
  out: [
    [
      'analytics.load',
      { writeKey: 'test-project' },
      { initialPageview: false },
    ],
  ],
};

/**
 * Consent revoked → no SDK call. The walkerOS consent gate handles
 * blocking subsequent events. The destination's on('consent') handler
 * is a no-op on revocation (Segment has no opt-out method).
 */
export const consentRevokeNoOp: SegmentStepExample = {
  command: 'consent',
  in: { analytics: false } as WalkerOS.Consent,
  out: [],
};
