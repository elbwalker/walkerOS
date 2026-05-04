import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

export const validEvent: Flow.StepExample = {
  title: 'Valid event',
  description:
    'A well-formed product view passes validation and is returned unchanged for downstream destinations.',
  in: getEvent('product view', {
    id: 'ev-1700000700',
    timestamp: 1700000700,
    data: { id: 'SKU-100', name: 'Trail Runner Pro', price: 129.99 },
    source: { type: 'browser', platform: 'web', url: 'https://example.com/' },
  }),
  out: [
    [
      'return',
      getEvent('product view', {
        id: 'ev-1700000700',
        timestamp: 1700000700,
        data: { id: 'SKU-100', name: 'Trail Runner Pro', price: 129.99 },
        source: {
          type: 'browser',
          platform: 'web',
          url: 'https://example.com/',
        },
      }),
    ],
  ],
};

export const invalidFormat: Flow.StepExample = {
  public: false,
  in: {
    name: 'invalid',
    data: {},
  },
  out: [['return', false]],
};

export const contractValidationPass: Flow.StepExample = {
  title: 'Contract validation',
  description:
    'Contract validation passes when event data matches the entity.action JSON Schema',
  in: getEvent('order complete', {
    id: 'ev-1700000800',
    timestamp: 1700000800,
    data: { id: '0rd3r1d', total: 555, currency: 'EUR' },
    source: {
      type: 'browser',
      platform: 'web',
      url: 'https://shop.example.com/',
    },
  }),
  out: [
    [
      'return',
      getEvent('order complete', {
        id: 'ev-1700000800',
        timestamp: 1700000800,
        data: { id: '0rd3r1d', total: 555, currency: 'EUR' },
        source: {
          type: 'browser',
          platform: 'web',
          url: 'https://shop.example.com/',
        },
      }),
    ],
  ],
};
