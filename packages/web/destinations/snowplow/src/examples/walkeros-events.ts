import { getEvent } from '@walkeros/core';

/**
 * Example walkerOS events that would generate Snowplow ecommerce events
 *
 * These represent the actual walkerOS events (with their data and nested entities)
 * that would be transformed into Snowplow ecommerce schema format.
 *
 * Pattern: walkerOS event → Snowplow self-describing event with context entities
 */

/**
 * Page View Event
 * walkerOS: elb('page view', { id: '/products', title: 'Product Listing' })
 * Generated when a user views a page
 */
export function pageView() {
  return getEvent('page view', {
    data: {
      id: '/products',
      title: 'Product Listing',
      domain: 'shop.example.com',
      referrer: 'https://google.com',
    },
  });
}

/**
 * Product View Event
 * walkerOS: elb('product view', { id: 'P123', name: 'Laptop', category: 'Electronics', price: 999 })
 * Generated when viewing a product detail page
 */
export function productView() {
  return getEvent('product view', {
    data: {
      id: 'P123',
      name: 'Laptop',
      category: 'Electronics',
      price: 999,
      currency: 'USD',
      brand: 'TechBrand',
      variant: 'Space Gray',
    },
    context: { shopping: ['detail', 0] },
    globals: { pagegroup: 'shop' },
  });
}

/**
 * Add to Cart Event
 * walkerOS: elb('product add', { id: 'P123', name: 'Laptop', price: 999, quantity: 1 }, {
 *   globals: { cart_total: 999, cart_currency: 'USD' }
 * })
 * Generated when adding a product to cart
 */
export function addToCart() {
  return getEvent('product add', {
    data: {
      id: 'P123',
      name: 'Laptop',
      category: 'Electronics',
      price: 999,
      currency: 'USD',
      quantity: 1,
    },
    globals: {
      cart_total: 999,
      cart_currency: 'USD',
      pagegroup: 'shop',
    },
    context: { shopping: ['cart', 0] },
  });
}

/**
 * Remove from Cart Event
 * walkerOS: elb('product remove', { id: 'P123', name: 'Laptop', price: 999, quantity: 1 }, {
 *   globals: { cart_total: 0, cart_currency: 'USD' }
 * })
 * Generated when removing a product from cart
 */
export function removeFromCart() {
  return getEvent('product remove', {
    data: {
      id: 'P123',
      name: 'Laptop',
      category: 'Electronics',
      price: 999,
      currency: 'USD',
      quantity: 1,
    },
    globals: {
      cart_total: 0,
      cart_currency: 'USD',
      pagegroup: 'shop',
    },
    context: { shopping: ['cart', 0] },
  });
}

/**
 * Transaction/Purchase Event (Single Product)
 * walkerOS: elb('order complete', {
 *   id: 'ORD-123',
 *   revenue: 999,
 *   tax: 80,
 *   shipping: 10,
 *   currency: 'USD',
 *   payment_method: 'credit_card'
 * }, {
 *   nested: [
 *     { type: 'product', data: { id: 'P123', name: 'Laptop', category: 'Electronics', price: 999, quantity: 1 } }
 *   ]
 * })
 * Generated when order is completed
 */
export function transaction() {
  return getEvent('order complete', {
    data: {
      id: 'ORD-123',
      revenue: 999,
      currency: 'USD',
      payment_method: 'credit_card',
      total_quantity: 1,
      tax: 80,
      shipping: 10,
    },
    nested: [
      {
        entity: 'product',
        data: {
          id: 'P123',
          name: 'Laptop',
          category: 'Electronics',
          price: 999,
          currency: 'USD',
          quantity: 1,
        },
        nested: [],
      },
    ],
    context: { shopping: ['complete', 0] },
    globals: { pagegroup: 'shop' },
  });
}

/**
 * Transaction with Multiple Products
 * walkerOS: elb('order complete', {
 *   id: 'ORD-456',
 *   revenue: 1097,
 *   tax: 120,
 *   shipping: 15,
 *   currency: 'USD',
 *   payment_method: 'paypal'
 * }, {
 *   nested: [
 *     { type: 'product', data: { id: 'P123', name: 'Laptop', price: 999, quantity: 1 } },
 *     { type: 'product', data: { id: 'P456', name: 'Mouse', price: 49, quantity: 2 } }
 *   ]
 * })
 * Generated when order with multiple products is completed
 */
export function transactionMultipleProducts() {
  return getEvent('order complete', {
    data: {
      id: 'ORD-456',
      revenue: 1097,
      currency: 'USD',
      payment_method: 'paypal',
      total_quantity: 3,
      tax: 120,
      shipping: 15,
    },
    nested: [
      {
        entity: 'product',
        data: {
          id: 'P123',
          name: 'Laptop',
          category: 'Electronics',
          price: 999,
          currency: 'USD',
          quantity: 1,
        },
        nested: [],
      },
      {
        entity: 'product',
        data: {
          id: 'P456',
          name: 'Mouse',
          category: 'Accessories',
          price: 49,
          currency: 'USD',
          quantity: 2,
        },
        nested: [],
      },
    ],
    context: { shopping: ['complete', 0] },
    globals: { pagegroup: 'shop' },
  });
}

/**
 * Refund Event
 * walkerOS: elb('order refund', {
 *   transaction_id: 'ORD-123',
 *   refund_amount: 999,
 *   currency: 'USD',
 *   refund_reason: 'defective'
 * })
 * Generated when processing a refund
 */
export function refund() {
  return getEvent('order refund', {
    data: {
      transaction_id: 'ORD-123',
      refund_amount: 999,
      currency: 'USD',
      refund_reason: 'defective',
    },
    context: { shopping: ['refund', 0] },
    globals: { pagegroup: 'account' },
  });
}

/**
 * Checkout Step Event
 * walkerOS: elb('checkout step', { step: 1, delivery_provider: 'express' })
 * Generated when progressing through checkout
 */
export function checkoutStep() {
  return getEvent('checkout step', {
    data: {
      step: 1,
      delivery_provider: 'express',
      shipping_tier: 'next_day',
    },
    context: { shopping: ['checkout', 0] },
    globals: { pagegroup: 'shop' },
  });
}

/**
 * List View Event (Product Listing Page)
 * walkerOS: elb('product list', { category: 'Electronics', list_name: 'Search Results' }, {
 *   nested: [
 *     { type: 'product', data: { id: 'P123', name: 'Laptop', price: 999, position: 1 } },
 *     { type: 'product', data: { id: 'P456', name: 'Mouse', price: 49, position: 2 } }
 *   ]
 * })
 * Generated when viewing a product listing page (search, category, etc.)
 */
export function listView() {
  return getEvent('product list', {
    data: {
      category: 'Electronics',
      list_name: 'Search Results',
      query: 'laptop',
    },
    nested: [
      {
        entity: 'product',
        data: {
          id: 'P123',
          name: 'Laptop',
          category: 'Electronics',
          price: 999,
          currency: 'USD',
          position: 1,
        },
        nested: [],
      },
      {
        entity: 'product',
        data: {
          id: 'P456',
          name: 'Mouse',
          category: 'Electronics',
          price: 49,
          currency: 'USD',
          position: 2,
        },
        nested: [],
      },
    ],
    context: { shopping: ['browse', 0] },
    globals: { pagegroup: 'shop' },
  });
}

/**
 * Promotion View Event
 * walkerOS: elb('promo view', {
 *   id: 'SUMMER2024',
 *   name: 'Summer Sale',
 *   creative_id: 'banner_top',
 *   position: 'hero'
 * })
 * Generated when a promotion is displayed to the user
 */
export function promoView() {
  return getEvent('promo view', {
    data: {
      id: 'SUMMER2024',
      name: 'Summer Sale',
      creative_id: 'banner_top',
      position: 'hero',
      discount: '20%',
    },
    context: { promotion: ['display', 0] },
    globals: { pagegroup: 'homepage' },
  });
}

/**
 * Custom Event (Non-Ecommerce)
 * walkerOS: elb('custom action', { action_type: 'button_click', button_id: 'cta_signup' })
 * Example of a custom event that doesn't use ecommerce schema
 */
export function customEvent() {
  return getEvent('custom action', {
    data: {
      action_type: 'button_click',
      button_id: 'cta_signup',
      location: 'header',
    },
    context: { interaction: ['engagement', 0] },
  });
}
