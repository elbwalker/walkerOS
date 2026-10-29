import type { Flow } from '@walkeros/core';

export const postEvent: Flow.StepExample = {
  title: 'POST event',
  description:
    'A fetch POST request with a JSON body becomes a single walker elb event in a fetch-based server.',
  trigger: { type: 'POST' },
  in: {
    method: 'POST',
    url: 'http://localhost/collect',
    body: {
      name: 'page view',
      data: { title: 'Docs', url: 'https://example.com/docs' },
    },
  },
  out: [
    [
      'elb',
      {
        name: 'page view',
        data: { title: 'Docs', url: 'https://example.com/docs' },
      },
    ],
  ],
};

export const batchRequest: Flow.StepExample = {
  title: 'Batch POST',
  description:
    'A fetch POST with a batch array produces one walker elb event per batched item preserving order.',
  trigger: { type: 'POST' },
  in: {
    method: 'POST',
    url: 'http://localhost/collect',
    body: {
      batch: [
        { name: 'page view', data: { title: 'Home' } },
        { name: 'button click', data: { id: 'cta' } },
      ],
    },
  },
  out: [
    ['elb', { name: 'page view', data: { title: 'Home' } }],
    ['elb', { name: 'button click', data: { id: 'cta' } }],
  ],
};

export const pixelGet: Flow.StepExample = {
  title: 'Pixel GET',
  description:
    'A fetch GET with name and data[...] query parameters in the URL becomes a single walker elb event for pixel-style tracking.',
  trigger: { type: 'GET' },
  in: {
    method: 'GET',
    url: 'http://localhost/collect?name=page+view&data%5Btitle%5D=Home',
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
