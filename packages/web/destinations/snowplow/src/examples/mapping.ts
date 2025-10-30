import type { WalkerOS } from '@walkeros/core';
import type { DestinationSnowplow } from '..';
import { isObject } from '@walkeros/core';

/**
 * Snowplow Ecommerce Mapping Examples
 *
 * These examples follow the same flat mapping pattern as GA4 and Meta destinations.
 * The destination automatically wraps fields with appropriate Snowplow schemas.
 *
 * Pattern: Similar to GA4, use flat data.map with action type
 */

/**
 * Page View Mapping
 *
 * Page views use Snowplow's built-in trackPageView method.
 * No custom mapping needed - just pass through.
 */
export const pageView: DestinationSnowplow.Rule = {
  // Page view doesn't need action type - uses trackPageView()
  data: {
    map: {
      // Optional: page-specific data can be added to context
      title: 'data.title',
      path: 'data.id',
    },
  },
};

/**
 * Product View Mapping
 *
 * walkerOS: elb('product view', { id: 'P123', name: 'Laptop', category: 'Electronics', price: 999 })
 * Snowplow: product_view action with product context entity
 */
export const productView: DestinationSnowplow.Rule = {
  settings: {
    action: 'product_view',
  },
  data: {
    map: {
      // Product context fields (destination wraps with product schema)
      id: 'data.id',
      name: 'data.name',
      category: 'data.category',
      price: 'data.price',
      currency: { key: 'data.currency', value: 'USD' }, // Fallback to USD
      brand: 'data.brand',
      variant: 'data.variant',
    },
  },
};

/**
 * Add to Cart Mapping
 *
 * walkerOS: elb('product add', { id: 'P123', name: 'Laptop', price: 999, quantity: 1 })
 * Snowplow: add_to_cart action with product + cart context entities
 */
export const addToCart: DestinationSnowplow.Rule = {
  settings: {
    action: 'add_to_cart',
  },
  data: {
    map: {
      // Product context fields
      id: 'data.id',
      name: 'data.name',
      category: 'data.category',
      price: 'data.price',
      currency: { key: 'data.currency', value: 'USD' },
      quantity: { key: 'data.quantity', value: 1 },

      // Cart context fields (from globals)
      total_value: 'globals.cart_total',
      cart_currency: { key: 'globals.cart_currency', value: 'USD' },
    },
  },
};

/**
 * Remove from Cart Mapping
 *
 * walkerOS: elb('product remove', { id: 'P123', name: 'Laptop', price: 999, quantity: 1 })
 * Snowplow: remove_from_cart action with product + cart context entities
 */
export const removeFromCart: DestinationSnowplow.Rule = {
  settings: {
    action: 'remove_from_cart',
  },
  data: {
    map: {
      // Product context fields
      id: 'data.id',
      name: 'data.name',
      category: 'data.category',
      price: 'data.price',
      currency: { key: 'data.currency', value: 'USD' },
      quantity: { key: 'data.quantity', value: 1 },

      // Cart context fields
      total_value: 'globals.cart_total',
      cart_currency: { key: 'globals.cart_currency', value: 'USD' },
    },
  },
};

/**
 * Transaction/Purchase Mapping
 *
 * walkerOS: elb('order complete') - uses default getEvent data
 * Default has: { id, currency, shipping, taxes, total } + nested products
 * Snowplow: transaction action with transaction + product context entities
 */
export const transaction: DestinationSnowplow.Rule = {
  settings: {
    action: 'transaction',
  },
  data: {
    map: {
      // Transaction context fields (mapped from default getEvent fields)
      transaction_id: 'data.id',
      revenue: 'data.total',
      currency: { key: 'data.currency', value: 'USD' },
      payment_method: { value: 'credit_card' }, // Static default
      total_quantity: {
        fn: (event: WalkerOS.DeepPartialEvent | unknown) => {
          const evt = event as WalkerOS.Event;
          const products = evt.nested.filter(
            (e: WalkerOS.Entity) => e.entity === 'product',
          );
          return products.reduce(
            (sum: number, p: WalkerOS.Entity) =>
              sum + ((p.data.quantity as number) || 1),
            0,
          );
        },
      },
      tax: 'data.taxes',
      shipping: 'data.shipping',

      // Product contexts (loop through nested - like GA4 items)
      products: {
        loop: [
          'nested',
          {
            condition: (entity) =>
              isObject(entity) && entity.entity === 'product',
            map: {
              id: 'data.id',
              name: 'data.name',
              price: 'data.price',
              currency: { key: 'data.currency', value: 'USD' },
              quantity: { key: 'data.quantity', value: 1 },
            },
          },
        ],
      },
    },
  },
};

/**
 * Refund Mapping
 *
 * walkerOS: elb('order refund', {
 *   transaction_id: 'ORD-123', refund_amount: 999, refund_reason: 'defective'
 * })
 * Snowplow: refund action with refund context entity
 */
export const refund: DestinationSnowplow.Rule = {
  settings: {
    action: 'refund',
  },
  data: {
    map: {
      // Refund context fields
      transaction_id: 'data.transaction_id',
      refund_amount: 'data.refund_amount',
      currency: { key: 'data.currency', value: 'USD' },
      refund_reason: 'data.refund_reason',
      refund_method: 'data.refund_method',
    },
  },
};

/**
 * Checkout Step Mapping
 *
 * walkerOS: elb('checkout step', { step: 1, delivery_provider: 'express' })
 * Snowplow: checkout_step action with checkout_step context entity
 */
export const checkoutStep: DestinationSnowplow.Rule = {
  settings: {
    action: 'checkout_step',
  },
  data: {
    map: {
      // Checkout step context fields
      step: 'data.step',
      shipping_postcode: 'data.shipping_postcode',
      billing_postcode: 'data.billing_postcode',
      delivery_provider: 'data.delivery_provider',
      delivery_method: 'data.delivery_method',
      payment_method: 'data.payment_method',
      marketing_opt_in: 'data.marketing_opt_in',
    },
  },
};

/**
 * Product List View Mapping
 *
 * walkerOS: elb('product list', { category: 'Electronics' }, {
 *   nested: [
 *     { type: 'product', data: { id: 'P123', name: 'Laptop', price: 999, position: 1 } },
 *     { type: 'product', data: { id: 'P456', name: 'Mouse', price: 49, position: 2 } }
 *   ]
 * })
 * Snowplow: list_view action with multiple product context entities
 */
export const listView: DestinationSnowplow.Rule = {
  settings: {
    action: 'list_view',
  },
  data: {
    map: {
      // Product contexts (loop through nested)
      products: {
        loop: [
          'nested',
          {
            condition: (entity) =>
              isObject(entity) && entity.entity === 'product',
            map: {
              id: 'data.id',
              name: 'data.name',
              category: 'data.category',
              price: 'data.price',
              currency: { key: 'data.currency', value: 'USD' },
              position: 'data.position',
              brand: 'data.brand',
            },
          },
        ],
      },
    },
  },
};

/**
 * Promotion View Mapping
 *
 * walkerOS: elb('promo view', { id: 'SUMMER2024', name: 'Summer Sale', creative_id: 'banner_top' })
 * Snowplow: promo_view action with promotion context entity
 */
export const promoView: DestinationSnowplow.Rule = {
  settings: {
    action: 'promo_view',
  },
  data: {
    map: {
      // Promotion context fields
      id: 'data.id',
      name: 'data.name',
      creative_id: 'data.creative_id',
      type: 'data.type',
      position: 'data.position',
      slot: 'data.slot',
    },
  },
};

/**
 * Promotion Click Mapping
 *
 * walkerOS: elb('promo click', { id: 'SUMMER2024', name: 'Summer Sale' })
 * Snowplow: promo_click action with promotion context entity
 */
export const promoClick: DestinationSnowplow.Rule = {
  settings: {
    action: 'promo_click',
  },
  data: {
    map: {
      // Promotion context fields
      id: 'data.id',
      name: 'data.name',
      creative_id: 'data.creative_id',
      type: 'data.type',
      position: 'data.position',
      slot: 'data.slot',
    },
  },
};

/**
 * Complete Mapping Configuration
 *
 * Maps walkerOS event names to Snowplow ecommerce actions.
 * Follows the same pattern as GA4/Meta destinations.
 */
export const config = {
  page: { view: pageView },
  product: {
    view: productView,
    add: addToCart,
    remove: removeFromCart,
    list: listView,
  },
  order: {
    complete: transaction,
    refund: refund,
  },
  checkout: {
    step: checkoutStep,
  },
  promo: {
    view: promoView,
    click: promoClick,
  },
} satisfies DestinationSnowplow.Rules;
