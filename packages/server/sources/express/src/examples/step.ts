import type { Flow } from '@walkeros/core';

export const postEvent: Flow.StepExample = {
  title: 'POST event',
  description:
    'An Express POST to /collect with a JSON body becomes a single walker elb event.',
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
  title: 'Pixel GET',
  description:
    'An Express GET to /collect with query parameters is parsed into an elb event payload for pixel tracking.',
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
