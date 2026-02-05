/**
 * Examples of vendor API calls the destination will make.
 * These define the CONTRACT - implementation must produce these outputs.
 *
 * Create this file BEFORE implementation (Phase 2).
 */

// Page view call to vendor SDK
export const pageViewCall = {
  method: 'track',
  args: ['pageview', { url: '/home', title: 'Home Page' }],
};

// E-commerce purchase event
export const purchaseCall = {
  method: 'track',
  args: [
    'purchase',
    {
      transaction_id: 'T-123',
      value: 99.99,
      currency: 'USD',
      items: [{ item_id: 'P-1', item_name: 'Widget', price: 99.99 }],
    },
  ],
};

// Custom event call
export const customEventCall = {
  method: 'track',
  args: ['button_click', { button_id: 'cta', button_text: 'Sign Up' }],
};
