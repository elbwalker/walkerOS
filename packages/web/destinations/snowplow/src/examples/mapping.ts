import type { DestinationSnowplow } from '..';
import { ACTIONS, SCHEMAS } from '../types';

/**
 * Snowplow Ecommerce Mapping Examples
 *
 * Fully explicit mapping - no auto-detection or magic.
 * - `name` at rule level specifies the Snowplow action type
 * - `settings.context` defines context entities with schema and data mapping
 *
 * Pattern: name = action type, settings.context = [{ schema, data }]
 */

/**
 * Page View Mapping
 *
 * Page views use Snowplow's built-in trackPageView method.
 * No custom mapping needed - just pass through.
 */
export const pageView: DestinationSnowplow.Rule = {
  // Page view doesn't need action type - uses trackPageView()
};

/**
 * Product View Mapping
 *
 * walkerOS: elb('product view', { id: 'P123', name: 'Laptop', category: 'Electronics', price: 999 })
 * Snowplow: product_view action with product context entity
 */
export const productView: DestinationSnowplow.Rule = {
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
};

/**
 * Add to Cart Mapping
 *
 * walkerOS: elb('product add', { id: 'P123', name: 'Laptop', price: 999, quantity: 1 })
 * Snowplow: add_to_cart action with product context entity
 */
export const addToCart: DestinationSnowplow.Rule = {
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
    ],
  },
};

/**
 * Remove from Cart Mapping
 *
 * walkerOS: elb('product remove', { id: 'P123', name: 'Laptop', price: 999, quantity: 1 })
 * Snowplow: remove_from_cart action with product context entity
 */
export const removeFromCart: DestinationSnowplow.Rule = {
  name: ACTIONS.REMOVE_FROM_CART,
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
    ],
  },
};

/**
 * Transaction/Purchase Mapping
 *
 * walkerOS: elb('order complete') - uses default getEvent data
 * Default has: { id, currency, shipping, taxes, total } + nested products
 * Snowplow: transaction action with transaction context entity
 *
 * Note: For product contexts from nested, use loop in data.map
 */
export const transaction: DestinationSnowplow.Rule = {
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
  name: ACTIONS.REFUND,
  settings: {
    context: [
      {
        schema: SCHEMAS.REFUND,
        data: {
          transaction_id: 'data.transaction_id',
          refund_amount: 'data.refund_amount',
          currency: { key: 'data.currency', value: 'USD' },
          refund_reason: 'data.refund_reason',
          refund_method: 'data.refund_method',
        },
      },
    ],
  },
};

/**
 * Checkout Step Mapping
 *
 * walkerOS: elb('checkout step', { step: 1, delivery_provider: 'express' })
 * Snowplow: checkout_step action with checkout_step context entity
 */
export const checkoutStep: DestinationSnowplow.Rule = {
  name: ACTIONS.CHECKOUT_STEP,
  settings: {
    context: [
      {
        schema: SCHEMAS.CHECKOUT_STEP,
        data: {
          step: 'data.step',
          shipping_postcode: 'data.shipping_postcode',
          billing_postcode: 'data.billing_postcode',
          delivery_provider: 'data.delivery_provider',
          delivery_method: 'data.delivery_method',
          payment_method: 'data.payment_method',
          marketing_opt_in: 'data.marketing_opt_in',
        },
      },
    ],
  },
};

/**
 * Product List View Mapping
 *
 * walkerOS: elb('product list', { category: 'Electronics' })
 * Snowplow: list_view action
 *
 * Note: For multiple products from nested, use loop in data.map
 */
export const listView: DestinationSnowplow.Rule = {
  name: ACTIONS.LIST_VIEW,
  // No context needed for list_view without products
  // Use data.map with loop for product contexts
};

/**
 * Promotion View Mapping
 *
 * walkerOS: elb('promo view', { id: 'SUMMER2024', name: 'Summer Sale', creative_id: 'banner_top' })
 * Snowplow: promo_view action with promotion context entity
 */
export const promoView: DestinationSnowplow.Rule = {
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
};

/**
 * Promotion Click Mapping
 *
 * walkerOS: elb('promo click', { id: 'SUMMER2024', name: 'Summer Sale' })
 * Snowplow: promo_click action with promotion context entity
 */
export const promoClick: DestinationSnowplow.Rule = {
  name: ACTIONS.PROMO_CLICK,
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
};

/**
 * Complete Mapping Configuration
 *
 * Maps walkerOS event names to Snowplow ecommerce actions.
 * Fully explicit - no auto-detection or magic.
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
