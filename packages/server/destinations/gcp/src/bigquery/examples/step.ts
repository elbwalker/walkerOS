import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

export const pageView: Flow.StepExample = {
  in: getEvent('page view', {
    timestamp: 1700001100,
    data: { title: 'Documentation', url: 'https://example.com/docs' },
    source: { type: 'server', id: '', previous_id: '' },
  }),
  mapping: undefined,
  out: {
    title: 'Documentation',
    url: 'https://example.com/docs',
  },
};

export const purchase: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700001101,
    data: {
      id: 'ORD-500',
      total: 199.99,
      items: [{ sku: 'SKU-1', qty: 2 }],
    },
    source: { type: 'server', id: '', previous_id: '' },
  }),
  mapping: undefined,
  out: {
    id: 'ORD-500',
    total: 199.99,
    items: JSON.stringify([{ sku: 'SKU-1', qty: 2 }]),
  },
};
