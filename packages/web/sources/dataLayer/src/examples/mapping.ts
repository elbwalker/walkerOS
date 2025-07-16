import type { Mapping } from '@walkerOS/core';
import { isObject } from '@walkerOS/core';

/**
 * Consent Mode Mapping - Primary use case
 * Maps gtag consent events to walker consent commands
 */
export const consentUpdate: Mapping.Rule = {
  name: 'walker consent',
  settings: {
    command: {
      map: {
        functional: { value: true }, // Static value - always true for functional
        analytics: {
          key: 'analytics_storage',
          fn: (value: unknown) => value === 'granted',
        },
        marketing: {
          key: 'ad_storage',
          fn: (value: unknown) => value === 'granted',
        },
      },
    },
  },
};

/**
 * E-commerce Event Mappings
 * Transform GA4 ecommerce events to WalkerOS events
 */
export const purchase: Mapping.Rule = {
  name: 'order complete',
  data: {
    map: {
      id: 'transaction_id',
      total: 'value',
      currency: 'currency',
      nested: {
        loop: [
          'items',
          {
            map: {
              type: { value: 'product' },
              data: {
                map: {
                  id: 'item_id',
                  name: 'item_name',
                  category: 'item_category',
                  quantity: 'quantity',
                  price: 'price',
                },
              },
            },
          },
        ],
      },
    },
  },
};

export const add_to_cart: Mapping.Rule = {
  name: 'product add',
  data: {
    map: {
      id: 'items.0.item_id',
      name: 'items.0.item_name',
      price: 'value',
      currency: 'currency',
      color: 'items.0.item_variant',
      quantity: 'items.0.quantity',
    },
  },
};

export const view_item: Mapping.Rule = {
  name: 'product view',
  data: {
    map: {
      id: 'items.0.item_id',
      name: 'items.0.item_name',
      category: 'items.0.item_category',
      price: 'items.0.price',
      currency: 'currency',
    },
  },
};

/**
 * Config Event Mapping
 * Transform GA4 config events to WalkerOS page events
 */
export const configGA4: Mapping.Rule = {
  name: 'page view',
  data: {
    map: {
      title: 'page_title',
      url: 'page_location',
    },
  },
};

/**
 * Custom Event Mapping
 * Handle direct dataLayer pushes
 */
export const customEvent: Mapping.Rule = {
  // Keep original event name with gtag prefix
  data: {
    map: {
      // Map all properties as-is
      user_id: 'user_id',
      custom_parameter: 'custom_parameter',
    },
  },
};

/**
 * Complete mapping configuration
 * Following the same pattern as destination mappings
 */
export const config = {
  // Consent events
  consent: {
    update: consentUpdate,
  },

  // E-commerce events
  purchase: purchase,
  add_to_cart: add_to_cart,
  view_item: view_item,

  // Config events
  'config G-XXXXXXXXXX': configGA4,

  // Custom events
  custom_event: customEvent,

  // Catch-all for unmapped events
  '*': {
    // Pass through with gtag prefix
    data: {
      // Copy all data as-is
    },
  },
} as unknown as Mapping.Rules;

/**
 * Minimal consent-only mapping for focused use cases
 */
export const consentOnlyMapping = {
  consent: {
    update: consentUpdate,
  },
} as unknown as Mapping.Rules;
