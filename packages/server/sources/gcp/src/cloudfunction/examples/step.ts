import type { Flow } from '@walkeros/core';

export const postEvent: Flow.StepExample = {
  in: {
    method: 'POST',
    body: {
      name: 'page view',
      data: { title: 'Home', url: 'https://example.com/' },
    },
    headers: { 'content-type': 'application/json' },
  },
  out: {
    name: 'page view',
    data: { title: 'Home', url: 'https://example.com/' },
    entity: 'page',
    action: 'view',
  },
};

export const orderEvent: Flow.StepExample = {
  in: {
    method: 'POST',
    body: {
      name: 'order complete',
      data: { id: 'ORD-700', total: 99.99, currency: 'EUR' },
    },
    headers: { 'content-type': 'application/json' },
  },
  out: {
    name: 'order complete',
    data: { id: 'ORD-700', total: 99.99, currency: 'EUR' },
    entity: 'order',
    action: 'complete',
  },
};
