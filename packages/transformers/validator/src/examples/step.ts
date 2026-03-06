import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

export const validEvent: Flow.StepExample = {
  in: getEvent('product view', {
    timestamp: 1700000700,
    data: { id: 'SKU-100', name: 'Trail Runner Pro', price: 129.99 },
    source: { type: 'web', id: 'https://example.com', previous_id: '' },
  }),
  out: {
    event: getEvent('product view', {
      timestamp: 1700000700,
      data: { id: 'SKU-100', name: 'Trail Runner Pro', price: 129.99 },
      source: { type: 'web', id: 'https://example.com', previous_id: '' },
    }),
  },
};

export const invalidFormat: Flow.StepExample = {
  in: {
    name: 'invalid',
    data: {},
  },
  out: false,
};
