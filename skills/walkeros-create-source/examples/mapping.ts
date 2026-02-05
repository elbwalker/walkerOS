import type { Mapping } from '@walkeros/core';

/**
 * Default mapping: input format -> walkerOS events.
 *
 * Create this file during Phase 3.
 */

// Event name transformation
export const eventNameMap: Record<string, string> = {
  page_view: 'page view',
  purchase: 'order complete',
  button_click: 'button click',
  add_to_cart: 'product add',
};

// Data field mapping
export const defaultMapping: Mapping.Rules = {
  page: {
    view: {
      data: {
        map: {
          title: 'properties.page_title',
          path: 'properties.page_path',
          referrer: 'properties.referrer',
        },
      },
    },
  },
  order: {
    complete: {
      data: {
        map: {
          id: 'properties.transaction_id',
          total: 'properties.value',
          currency: 'properties.currency',
        },
      },
    },
  },
};
