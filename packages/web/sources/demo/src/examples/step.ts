import type { Flow } from '@walkeros/core';

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A simple event object is pushed through the demo source as a walker elb call for learning purposes.',
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
  title: 'Delayed event',
  description:
    'An event object with a delay field is pushed through the demo source after the specified wait.',
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
