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
    'An Express GET to /collect with name and data[...] query parameters becomes a single walker elb event for pixel tracking.',
  trigger: { type: 'GET' },
  in: {
    method: 'GET',
    path: '/collect',
    query: { name: 'page view', 'data[title]': 'Home' },
  },
  out: [
    [
      'elb',
      {
        name: 'page view',
        data: { title: 'Home' },
      },
    ],
  ],
};
