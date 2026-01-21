/**
 * Example Snowplow function call outputs
 *
 * These represent the actual arguments passed to window.snowplow()
 * when different events are tracked using Snowplow's ecommerce schema.
 *
 * All ecommerce events use the self-describing event format with:
 * - Event action schema: snowplow_ecommerce_action/jsonschema/1-0-2
 * - Context entities with their respective schemas
 *
 * Reference: https://docs.snowplow.io/docs/collecting-data/collecting-from-own-applications/snowplow-tracker-protocol/
 */

/**
 * Page View Event
 * Uses built-in Snowplow page view tracking
 */
export function pageView(): unknown[] {
  return ['trackPageView'];
}

/**
 * Product View Event
 * walkerOS: elb('product view') - uses default getEvent data
 * Snowplow: product_view action with product context entity
 */
export function productView(): unknown[] {
  return [
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
  ];
}

/**
 * Add to Cart Event
 * walkerOS: elb('product add', { id: 'P123', name: 'Laptop', price: 999, quantity: 1 })
 * Snowplow: add_to_cart action with product, cart, page, and user context entities
 */
export function addToCart(): unknown[] {
  return [
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
            id: 'P123',
            name: 'Laptop',
            category: 'Electronics',
            price: 999,
            currency: 'USD',
            quantity: 1,
          },
        },
        {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/cart/jsonschema/1-0-0',
          data: {
            total_value: 999,
            currency: 'USD',
          },
        },
        {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/page/jsonschema/1-0-0',
          data: {
            type: 'product',
            language: 'en',
          },
        },
        {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/user/jsonschema/1-0-0',
          data: {
            id: 'U123',
            email: 'user@example.com',
            is_guest: true,
          },
        },
      ],
    },
  ];
}

/**
 * Remove from Cart Event
 * walkerOS: elb('product remove', { id: 'P123', name: 'Laptop', price: 999, quantity: 1 })
 * Snowplow: remove_from_cart action with product and cart context entities
 */
export function removeFromCart(): unknown[] {
  return [
    'trackSelfDescribingEvent',
    {
      event: {
        schema:
          'iglu:com.snowplowanalytics.snowplow.ecommerce/snowplow_ecommerce_action/jsonschema/1-0-2',
        data: {
          type: 'remove_from_cart',
        },
      },
      context: [
        {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
          data: {
            id: 'P123',
            name: 'Laptop',
            category: 'Electronics',
            price: 999,
            currency: 'USD',
            quantity: 1,
          },
        },
        {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/cart/jsonschema/1-0-0',
          data: {
            total_value: 0,
            currency: 'USD',
          },
        },
      ],
    },
  ];
}

/**
 * Transaction/Purchase Event
 * walkerOS: elb('order complete') - uses default getEvent data
 * Default: { id: '0rd3r1d', currency: 'EUR', shipping: 5.22, taxes: 73.76, total: 555 }
 * Snowplow: transaction action with transaction context entity
 *
 * Note: This is explicit mapping without auto-looping nested products.
 * For product contexts from nested array, use loop in mapping configuration.
 */
export function transaction(): unknown[] {
  return [
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
            currency: 'EUR', // From default getEvent data
            payment_method: 'credit_card', // Static value
            tax: 73.76,
            shipping: 5.22,
          },
        },
      ],
    },
  ];
}

/**
 * Transaction with Multiple Products
 * walkerOS: elb('order complete', { id: 'ORD-456', revenue: 1498, tax: 120, shipping: 15 }, {
 *   nested: [
 *     { type: 'product', data: { id: 'P123', name: 'Laptop', price: 999, quantity: 1 } },
 *     { type: 'product', data: { id: 'P456', name: 'Mouse', price: 49, quantity: 2 } }
 *   ]
 * })
 * Snowplow: transaction action with multiple product entities
 */
export function transactionMultipleProducts(): unknown[] {
  return [
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
            transaction_id: 'ORD-456',
            revenue: 1097,
            currency: 'USD',
            payment_method: 'paypal',
            total_quantity: 3,
            tax: 120,
            shipping: 15,
          },
        },
        {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
          data: {
            id: 'P123',
            name: 'Laptop',
            category: 'Electronics',
            price: 999,
            currency: 'USD',
            quantity: 1,
          },
        },
        {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
          data: {
            id: 'P456',
            name: 'Mouse',
            category: 'Accessories',
            price: 49,
            currency: 'USD',
            quantity: 2,
          },
        },
      ],
    },
  ];
}

/**
 * Refund Event
 * walkerOS: elb('order refund', { transaction_id: 'ORD-123', amount: 999, reason: 'defective' })
 * Snowplow: refund action with refund context entity
 */
export function refund(): unknown[] {
  return [
    'trackSelfDescribingEvent',
    {
      event: {
        schema:
          'iglu:com.snowplowanalytics.snowplow.ecommerce/snowplow_ecommerce_action/jsonschema/1-0-2',
        data: {
          type: 'refund',
        },
      },
      context: [
        {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/refund/jsonschema/1-0-0',
          data: {
            transaction_id: 'ORD-123',
            refund_amount: 999,
            currency: 'USD',
            refund_reason: 'defective',
          },
        },
      ],
    },
  ];
}

/**
 * Checkout Step Event
 * walkerOS: elb('checkout step', { step: 1, shipping_method: 'express' })
 * Snowplow: checkout_step action with checkout_step context entity
 */
export function checkoutStep(): unknown[] {
  return [
    'trackSelfDescribingEvent',
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
            step: 1,
            delivery_provider: 'express',
          },
        },
      ],
    },
  ];
}

/**
 * List View Event (Product Listing Page)
 * walkerOS: elb('product list', { category: 'Electronics' }, {
 *   nested: [
 *     { type: 'product', data: { id: 'P123', name: 'Laptop', price: 999 } },
 *     { type: 'product', data: { id: 'P456', name: 'Mouse', price: 49 } }
 *   ]
 * })
 * Snowplow: list_view action with multiple product context entities
 */
export function listView(): unknown[] {
  return [
    'trackSelfDescribingEvent',
    {
      event: {
        schema:
          'iglu:com.snowplowanalytics.snowplow.ecommerce/snowplow_ecommerce_action/jsonschema/1-0-2',
        data: {
          type: 'list_view',
        },
      },
      context: [
        {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
          data: {
            id: 'P123',
            name: 'Laptop',
            category: 'Electronics',
            price: 999,
            currency: 'USD',
            position: 1,
          },
        },
        {
          schema:
            'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
          data: {
            id: 'P456',
            name: 'Mouse',
            category: 'Electronics',
            price: 49,
            currency: 'USD',
            position: 2,
          },
        },
      ],
    },
  ];
}

/**
 * Promotion View Event
 * walkerOS: elb('promo view', { id: 'SUMMER2024', name: 'Summer Sale', creative: 'banner_top' })
 * Snowplow: promo_view action with promotion context entity
 */
export function promoView(): unknown[] {
  return [
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
            id: 'SUMMER2024',
            name: 'Summer Sale',
            creative_id: 'banner_top',
          },
        },
      ],
    },
  ];
}

/**
 * Custom Self-Describing Event (Non-Ecommerce)
 * Example of a custom event that doesn't use the ecommerce schema
 * walkerOS: elb('custom action', { ... })
 */
export function customSelfDescribingEvent(): unknown[] {
  return [
    'trackSelfDescribingEvent',
    {
      event: {
        schema: 'iglu:com.example/custom_action/jsonschema/1-0-0',
        data: {
          action_type: 'button_click',
          button_id: 'cta_signup',
          location: 'header',
        },
      },
    },
  ];
}

/**
 * Legacy: Alias for transaction (for backward compatibility with tests)
 */
export const purchase = transaction;

/**
 * Legacy: Alias for customSelfDescribingEvent (for backward compatibility with tests)
 */
export const selfDescribingEvent = customSelfDescribingEvent;

/**
 * Legacy: Structured Event (deprecated)
 * Old structured event format with 5 fields
 * This format is deprecated in favor of self-describing events
 */
export function structuredEvent(): unknown[] {
  return ['trackStructEvent', 'entity', 'action', undefined, undefined, 1];
}
