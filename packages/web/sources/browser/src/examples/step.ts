import type { Flow } from '@walkeros/core';

export const pageView: Flow.StepExample = {
  in: {
    trigger: 'load',
    url: 'https://example.com/docs',
    title: 'Documentation',
    referrer: 'https://example.com/',
  },
  out: {
    name: 'page view',
    data: {
      domain: 'example.com',
      title: 'Documentation',
      referrer: 'https://example.com/',
      id: '/docs',
    },
    trigger: 'load',
    entity: 'page',
    action: 'view',
    source: {
      type: 'browser',
      id: 'https://example.com/docs',
      previous_id: 'https://example.com/',
    },
  },
};

export const clickEvent: Flow.StepExample = {
  in: {
    trigger: 'click',
    element: 'button[data-elb="cta"]',
    attributes: {
      'data-elb': 'cta',
      'data-elb-cta': 'label:Sign Up',
      'data-elbaction': 'click:click',
    },
  },
  out: {
    name: 'cta click',
    data: { label: 'Sign Up' },
    trigger: 'click',
    entity: 'cta',
    action: 'click',
  },
};
