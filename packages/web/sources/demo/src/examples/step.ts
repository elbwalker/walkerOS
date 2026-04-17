import type { Flow } from '@walkeros/core';

export const pageView: Flow.StepExample = {
  in: {
    name: 'page view',
    data: { title: 'Home' },
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

export const delayedEvent: Flow.StepExample = {
  in: {
    name: 'product add',
    data: { id: 'abc', name: 'Test Product' },
    delay: 100,
  },
  out: [
    [
      'elb',
      {
        name: 'product add',
        data: { id: 'abc', name: 'Test Product' },
      },
    ],
  ],
};
