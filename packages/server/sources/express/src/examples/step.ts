import type { Flow } from '@walkeros/core';

export const postEvent: Flow.StepExample = {
  in: {
    method: 'POST',
    path: '/collect',
    body: {
      name: 'page view',
      data: { title: 'Home', url: 'https://example.com/' },
    },
  },
  out: {
    name: 'page view',
    data: { title: 'Home', url: 'https://example.com/' },
    entity: 'page',
    action: 'view',
  },
};

export const pixelGet: Flow.StepExample = {
  in: {
    method: 'GET',
    path: '/collect',
    query: { e: 'page view', d: '{"title":"Home"}' },
  },
  out: {
    name: 'page view',
    data: { title: 'Home' },
    entity: 'page',
    action: 'view',
  },
};
