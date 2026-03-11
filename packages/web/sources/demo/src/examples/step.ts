import type { Flow } from '@walkeros/core';

export const pageView: Flow.StepExample = {
  in: {
    name: 'page view',
    data: { title: 'Home' },
  },
  out: {
    name: 'page view',
    data: { title: 'Home' },
  },
};

export const delayedEvent: Flow.StepExample = {
  in: {
    name: 'product add',
    data: { id: 'abc', name: 'Test Product' },
    delay: 100,
  },
  out: {
    name: 'product add',
    data: { id: 'abc', name: 'Test Product' },
  },
};
