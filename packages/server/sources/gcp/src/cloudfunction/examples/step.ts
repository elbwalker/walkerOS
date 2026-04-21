import type { Flow } from '@walkeros/core';

export const postEvent: Flow.StepExample = {
  trigger: { type: 'POST' },
  in: {
    method: 'POST',
    body: {
      event: 'page view',
      data: { title: 'Home', url: 'https://example.com/' },
    },
    headers: { 'content-type': 'application/json' },
  },
  out: [
    [
      'elb',
      {
        name: 'page view',
        data: { title: 'Home', url: 'https://example.com/' },
      },
    ],
  ],
};

export const orderEvent: Flow.StepExample = {
  trigger: { type: 'POST' },
  in: {
    method: 'POST',
    body: {
      event: 'order complete',
      data: { id: 'ORD-700', total: 99.99, currency: 'EUR' },
    },
    headers: { 'content-type': 'application/json' },
  },
  out: [
    [
      'elb',
      {
        name: 'order complete',
        data: { id: 'ORD-700', total: 99.99, currency: 'EUR' },
      },
    ],
  ],
};
