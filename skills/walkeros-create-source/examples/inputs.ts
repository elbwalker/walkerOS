/**
 * Examples of incoming data this source will receive.
 * These define the CONTRACT - implementation must handle these inputs.
 *
 * Create this file BEFORE implementation (Phase 2).
 */

// Page view from external system
export const pageViewInput = {
  event: 'page_view',
  properties: {
    page_title: 'Home Page',
    page_path: '/home',
    referrer: 'https://google.com',
  },
  userId: 'user-123',
  timestamp: 1700000000000,
};

// E-commerce event
export const purchaseInput = {
  event: 'purchase',
  properties: {
    transaction_id: 'T-123',
    value: 99.99,
    currency: 'USD',
    items: [{ item_id: 'P-1', item_name: 'Widget', price: 99.99 }],
  },
  userId: 'user-123',
  timestamp: 1700000001000,
};

// Custom event
export const customEventInput = {
  event: 'button_click',
  properties: {
    button_id: 'cta',
    button_text: 'Sign Up',
  },
  timestamp: 1700000002000,
};

// Edge cases
export const minimalInput = {
  event: 'ping',
};

export const invalidInput = {
  // Missing event field
  properties: { foo: 'bar' },
};
