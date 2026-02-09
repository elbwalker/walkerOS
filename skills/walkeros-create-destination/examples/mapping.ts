import type { Mapping } from '@walkeros/core';

/**
 * Default mapping: walkerOS events -> vendor format.
 *
 * Create this file during Phase 3.
 */
export const defaultMapping: Mapping.Rules = {
  page: {
    view: {
      name: 'pageview', // Vendor event name
      data: {
        map: {
          url: 'data.path',
          title: 'data.title',
        },
      },
    },
  },
  order: {
    complete: {
      name: 'purchase',
      data: {
        map: {
          transaction_id: 'data.id',
          value: 'data.total',
          currency: { value: 'USD' },
        },
      },
    },
  },
  button: {
    click: {
      name: 'button_click',
      data: {
        map: {
          button_id: 'data.id',
          button_text: 'data.text',
        },
      },
    },
  },
};
