import type { Mapping } from '@walkeros/core';

/**
 * Default mapping: input format -> walkerOS events.
 *
 * Event renaming uses the standard `name` property in mapping rules.
 * Create this file during Phase 3.
 */

// Source mapping: vendor event names → walkerOS entity action format
export const defaultMapping: Mapping.Rules = {
  // 'page_view' → 'page view'
  page_view: {
    '*': {
      name: 'page view',
      data: {
        map: {
          title: 'properties.page_title',
          path: 'properties.page_path',
          referrer: 'properties.referrer',
        },
      },
    },
  },
  // 'purchase' → 'order complete'
  purchase: {
    '*': {
      name: 'order complete',
      data: {
        map: {
          id: 'properties.transaction_id',
          total: 'properties.value',
          currency: 'properties.currency',
        },
      },
    },
  },
  // 'add_to_cart' → 'product add'
  add_to_cart: {
    '*': {
      name: 'product add',
      data: {
        map: {
          id: 'properties.item_id',
          name: 'properties.item_name',
          price: 'properties.price',
        },
      },
    },
  },
};
