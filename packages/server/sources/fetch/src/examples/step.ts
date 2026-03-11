import type { Flow } from '@walkeros/core';

export const postEvent: Flow.StepExample = {
  in: {
    method: 'POST',
    url: 'https://example.com/collect',
    body: {
      name: 'page view',
      data: { title: 'Docs', url: 'https://example.com/docs' },
    },
  },
  out: {
    name: 'page view',
    data: { title: 'Docs', url: 'https://example.com/docs' },
    entity: 'page',
    action: 'view',
  },
};

export const batchRequest: Flow.StepExample = {
  in: {
    method: 'POST',
    url: 'https://example.com/collect',
    body: {
      batch: [
        { name: 'page view', data: { title: 'Home' } },
        { name: 'button click', data: { id: 'cta' } },
      ],
    },
  },
  out: {
    name: 'page view',
    data: { title: 'Home' },
    entity: 'page',
    action: 'view',
  },
};

export const pixelGet: Flow.StepExample = {
  in: {
    method: 'GET',
    url: 'https://example.com/collect?e=page+view&d=%7B%22title%22%3A%22Home%22%7D',
  },
  out: {
    name: 'page view',
    data: { title: 'Home' },
    entity: 'page',
    action: 'view',
  },
};
