import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import { ACTIONS, SCHEMAS } from '../types';

export const productView: Flow.StepExample = {
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
    'trackSelfDescribingEvent',
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
};

export const addToCart: Flow.StepExample = {
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
    'trackSelfDescribingEvent',
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
};

export const transaction: Flow.StepExample = {
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
    'trackSelfDescribingEvent',
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
};

export const promoView: Flow.StepExample = {
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
    'trackSelfDescribingEvent',
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
};

export const pageView: Flow.StepExample = {
  in: getEvent('page view', { timestamp: 1700000404 }),
  mapping: undefined,
  out: ['trackPageView'],
};
