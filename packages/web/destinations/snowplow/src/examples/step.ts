import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import { ACTIONS, SCHEMAS } from '../types';

/**
 * Destination bootstrap.
 * Given the canonical settings, init sets up the Snowplow queue and creates
 * a tracker pointed at the collector URL. Reproduce by passing the same
 * settings to `startFlow` as the destination config.
 */
export const init: Flow.StepExample = {
  title: 'Initialization',
  description:
    'Destination bootstrap creates a Snowplow tracker pointed at the configured collector URL.',
  in: {
    loadScript: true,
    settings: {
      collectorUrl: 'https://collector.example.com',
      appId: 'my-app',
      pageViewEvent: 'page view',
    },
  },
  out: [
    [
      'snowplow.newTracker',
      'sp',
      'https://collector.example.com',
      {
        appId: 'my-app',
        platform: 'web',
        discoverRootDomain: undefined,
        cookieSameSite: undefined,
        appVersion: undefined,
        contexts: undefined,
        anonymousTracking: undefined,
      },
    ],
  ],
};

export const productView: Flow.StepExample = {
  title: 'Product view',
  description:
    'A product view fires a Snowplow ecommerce action with a product context schema and pricing fields.',
  in: getEvent('product view', { timestamp: 1700000400 }),
  mapping: {
    name: ACTIONS.PRODUCT_VIEW,
    settings: {
      context: [
        {
          schema: SCHEMAS.PRODUCT,
          data: {
            id: 'data.id',
            name: 'data.name',
            category: 'data.category',
            price: 'data.price',
            currency: { key: 'data.currency', value: 'USD' },
            brand: 'data.brand',
            variant: 'data.variant',
          },
        },
      ],
    },
  },
  out: [
    [
      'snowplow.trackSelfDescribingEvent',
      {
        event: {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/snowplow_ecommerce_action/jsonschema/1-0-2',
          data: {
            type: 'product_view',
          },
        },
        context: [
          {
            schema:
              'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
            data: {
              id: 'ers',
              name: 'Everyday Ruck Snack',
              price: 420,
              currency: 'USD',
            },
          },
        ],
      },
    ],
  ],
};

export const addToCart: Flow.StepExample = {
  title: 'Add to cart',
  description:
    'A product add fires a Snowplow ecommerce add_to_cart action with product, cart, page, and user contexts.',
  in: getEvent('product add', { timestamp: 1700000401 }),
  mapping: {
    name: ACTIONS.ADD_TO_CART,
    settings: {
      context: [
        {
          schema: SCHEMAS.PRODUCT,
          data: {
            id: 'data.id',
            name: 'data.name',
            category: 'data.category',
            price: 'data.price',
            currency: { key: 'data.currency', value: 'USD' },
            quantity: { key: 'data.quantity', value: 1 },
          },
        },
        {
          schema: SCHEMAS.CART,
          data: {
            total_value: 'globals.cart_value',
            currency: { key: 'globals.cart_currency', value: 'USD' },
          },
        },
        {
          schema: SCHEMAS.PAGE,
          data: {
            type: 'globals.page_type',
            language: 'globals.language',
          },
        },
        {
          schema: SCHEMAS.USER,
          data: {
            id: 'user.id',
            email: 'user.email',
            is_guest: {
              fn: (event: unknown) =>
                (event as { user?: { id?: string } }).user?.id
                  ? true
                  : undefined,
            },
          },
        },
      ],
    },
  },
  out: [
    [
      'snowplow.trackSelfDescribingEvent',
      {
        event: {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/snowplow_ecommerce_action/jsonschema/1-0-2',
          data: {
            type: 'add_to_cart',
          },
        },
        context: [
          {
            schema:
              'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
            data: {
              id: 'ers',
              name: 'Everyday Ruck Snack',
              price: 420,
              currency: 'USD',
              quantity: 1,
            },
          },
          {
            schema:
              'iglu:com.snowplowanalytics.snowplow.ecommerce/cart/jsonschema/1-0-0',
            data: {
              currency: 'USD',
            },
          },
          {
            schema:
              'iglu:com.snowplowanalytics.snowplow.ecommerce/page/jsonschema/1-0-0',
            data: {},
          },
          {
            schema:
              'iglu:com.snowplowanalytics.snowplow.ecommerce/user/jsonschema/1-0-0',
            data: {
              id: 'us3r',
              is_guest: true,
            },
          },
        ],
      },
    ],
  ],
};

export const transaction: Flow.StepExample = {
  title: 'Transaction',
  description:
    'A completed order fires a Snowplow ecommerce transaction action with transaction id, revenue, tax, and shipping.',
  in: getEvent('order complete', { timestamp: 1700000402 }),
  mapping: {
    name: ACTIONS.TRANSACTION,
    settings: {
      context: [
        {
          schema: SCHEMAS.TRANSACTION,
          data: {
            transaction_id: 'data.id',
            revenue: 'data.total',
            currency: { key: 'data.currency', value: 'USD' },
            payment_method: { value: 'credit_card' },
            tax: 'data.taxes',
            shipping: 'data.shipping',
          },
        },
      ],
    },
  },
  out: [
    [
      'snowplow.trackSelfDescribingEvent',
      {
        event: {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/snowplow_ecommerce_action/jsonschema/1-0-2',
          data: {
            type: 'transaction',
          },
        },
        context: [
          {
            schema:
              'iglu:com.snowplowanalytics.snowplow.ecommerce/transaction/jsonschema/1-0-0',
            data: {
              transaction_id: '0rd3r1d',
              revenue: 555,
              currency: 'EUR',
              payment_method: 'credit_card',
              tax: 73.76,
              shipping: 5.22,
            },
          },
        ],
      },
    ],
  ],
};

export const promoView: Flow.StepExample = {
  title: 'Promo view',
  description:
    'A promotion visible event fires a Snowplow promo_view action with a promotion context.',
  in: getEvent('promotion visible', { timestamp: 1700000403 }),
  mapping: {
    name: ACTIONS.PROMO_VIEW,
    settings: {
      context: [
        {
          schema: SCHEMAS.PROMOTION,
          data: {
            id: 'data.id',
            name: 'data.name',
            creative_id: 'data.creative_id',
            type: 'data.type',
            position: 'data.position',
            slot: 'data.slot',
          },
        },
      ],
    },
  },
  out: [
    [
      'snowplow.trackSelfDescribingEvent',
      {
        event: {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/snowplow_ecommerce_action/jsonschema/1-0-2',
          data: {
            type: 'promo_view',
          },
        },
        context: [
          {
            schema:
              'iglu:com.snowplowanalytics.snowplow.ecommerce/promotion/jsonschema/1-0-0',
            data: {
              name: 'Setting up tracking easily',
              position: 'hero',
            },
          },
        ],
      },
    ],
  ],
};

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view calls Snowplow trackPageView directly instead of a self-describing event.',
  in: getEvent('page view', { timestamp: 1700000404 }),
  mapping: undefined,
  out: [['snowplow.trackPageView']],
};

export const checkoutStep: Flow.StepExample = {
  title: 'Checkout step',
  description:
    'A checkout view fires a Snowplow checkout_step action with the current step and option.',
  in: getEvent('checkout view', { timestamp: 1700000405 }),
  mapping: {
    name: ACTIONS.CHECKOUT_STEP,
    settings: {
      context: [
        {
          schema: SCHEMAS.CHECKOUT_STEP,
          data: {
            step: 'data.step',
            option: 'data.option',
          },
        },
      ],
    },
  },
  out: [
    [
      'snowplow.trackSelfDescribingEvent',
      {
        event: {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/snowplow_ecommerce_action/jsonschema/1-0-2',
          data: {
            type: 'checkout_step',
          },
        },
        context: [
          {
            schema:
              'iglu:com.snowplowanalytics.snowplow.ecommerce/checkout_step/jsonschema/1-0-0',
            data: {
              step: 'payment',
            },
          },
        ],
      },
    ],
  ],
};

export const structuredEvent: Flow.StepExample = {
  title: 'Struct event',
  description:
    'A custom event is tracked via Snowplow trackStructEvent with category, action, label, property, and value.',
  in: getEvent('product visible', { timestamp: 1700000406 }),
  mapping: {
    settings: {
      struct: {
        category: { value: 'ecommerce' },
        action: { value: 'impression' },
        label: 'data.name',
        property: 'data.color',
        value: 'data.price',
      },
    },
  },
  out: [
    [
      'snowplow.trackStructEvent',
      {
        category: 'ecommerce',
        action: 'impression',
        label: 'Everyday Ruck Snack',
        property: 'black',
        value: 420,
      },
    ],
  ],
};

export const contextLoop: Flow.StepExample = {
  title: 'Transaction with products',
  description:
    'A transaction event adds one Snowplow product context per nested product via a loop mapping.',
  in: getEvent('order complete', { timestamp: 1700000407 }),
  mapping: {
    name: ACTIONS.TRANSACTION,
    settings: {
      context: [
        {
          schema: SCHEMAS.TRANSACTION,
          data: {
            transaction_id: 'data.id',
            revenue: 'data.total',
            currency: 'data.currency',
          },
        },
        {
          schema: SCHEMAS.PRODUCT,
          data: {
            loop: [
              'nested',
              {
                map: {
                  id: 'data.id',
                  name: 'data.name',
                  price: 'data.price',
                },
              },
            ],
          },
        },
      ],
    },
  },
  out: [
    [
      'snowplow.trackSelfDescribingEvent',
      {
        event: {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/snowplow_ecommerce_action/jsonschema/1-0-2',
          data: {
            type: 'transaction',
          },
        },
        context: [
          {
            schema:
              'iglu:com.snowplowanalytics.snowplow.ecommerce/transaction/jsonschema/1-0-0',
            data: {
              transaction_id: '0rd3r1d',
              revenue: 555,
              currency: 'EUR',
            },
          },
          {
            schema:
              'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
            data: {
              id: 'ers',
              name: 'Everyday Ruck Snack',
              price: 420,
            },
          },
          {
            schema:
              'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
            data: {
              id: 'cc',
              name: 'Cool Cap',
              price: 42,
            },
          },
          {
            schema:
              'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
            data: {
              name: 'Surprise',
            },
          },
        ],
      },
    ],
  ],
};
