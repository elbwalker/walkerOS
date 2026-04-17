import type { Flow } from '@walkeros/core';

export const postEvent: Flow.StepExample = {
  trigger: { type: 'POST' },
  in: {
    method: 'POST',
    path: '/collect',
    body: {
      name: 'page view',
      data: { title: 'Home', url: 'https://example.com/' },
    },
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

export const pixelGet: Flow.StepExample = {
  trigger: { type: 'GET' },
  in: {
    method: 'GET',
    path: '/collect',
    query: { e: 'page view', d: '{"title":"Home"}' },
  },
  out: [
    [
      'elb',
      {
        e: 'page view',
        d: '{"title":"Home"}',
      },
    ],
  ],
};
