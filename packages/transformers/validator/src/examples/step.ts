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

export const contractValidationPass: Flow.StepExample = {
  description:
    'Contract validation passes when event data matches the entity.action JSON Schema',
  in: getEvent('order complete', {
    timestamp: 1700000800,
    data: { id: '0rd3r1d', total: 555, currency: 'EUR' },
    source: { type: 'web', id: 'https://shop.example.com', previous_id: '' },
  }),
  out: {
    event: getEvent('order complete', {
      timestamp: 1700000800,
      data: { id: '0rd3r1d', total: 555, currency: 'EUR' },
      source: { type: 'web', id: 'https://shop.example.com', previous_id: '' },
    }),
  },
};
