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

export const submitEvent: Flow.StepExample = {
  in: {
    trigger: 'submit',
    element: 'form[data-elb="signup"]',
    attributes: {
      'data-elb': 'signup',
      'data-elb-signup': 'plan:premium',
      'data-elbaction': 'submit:complete',
    },
  },
  out: {
    name: 'signup complete',
    data: { plan: 'premium' },
    trigger: 'submit',
    entity: 'signup',
    action: 'complete',
  },
};

export const impressionEvent: Flow.StepExample = {
  in: {
    trigger: 'impression',
    element: 'div[data-elb="banner"]',
    attributes: {
      'data-elb': 'banner',
      'data-elb-banner': 'type:promotional;position:sidebar',
      'data-elbaction': 'impression:view',
    },
  },
  out: {
    name: 'banner view',
    data: { type: 'promotional', position: 'sidebar' },
    trigger: 'impression',
    entity: 'banner',
    action: 'view',
  },
};

export const nestedEntities: Flow.StepExample = {
  in: {
    trigger: 'load',
    element: 'div[data-elb="product"]',
    attributes: {
      'data-elb': 'product',
      'data-elb-product': 'id:SKU-42;name:Sneakers',
      'data-elbaction': 'load:view',
    },
    children: [
      {
        'data-elb': 'size',
        'data-elb-size': 'selected:large;inStock:true',
      },
    ],
  },
  out: {
    name: 'product view',
    data: { id: 'SKU-42', name: 'Sneakers' },
    trigger: 'load',
    entity: 'product',
    action: 'view',
    nested: [{ entity: 'size', data: { selected: 'large', inStock: true } }],
  },
};

export const dataAttributeTypes: Flow.StepExample = {
  in: {
    trigger: 'click',
    element: 'div[data-elb="product"]',
    attributes: {
      'data-elb': 'product',
      'data-elb-product':
        'price:99.99;available:true;colors[]:red;colors[]:blue',
      'data-elbaction': 'click:select',
    },
  },
  out: {
    name: 'product select',
    data: { price: 99.99, available: true, colors: ['red', 'blue'] },
    trigger: 'click',
    entity: 'product',
    action: 'select',
  },
};

export const contextAndGlobals: Flow.StepExample = {
  in: {
    trigger: 'click',
    element: 'div[data-elb="cta"]',
    attributes: {
      'data-elb': 'cta',
      'data-elb-cta': 'label:Try Now',
      'data-elbaction': 'click:signup',
    },
    context: { test: 'engagement_flow' },
    globals: { language: 'en', plan: 'premium' },
  },
  out: {
    name: 'cta signup',
    data: { label: 'Try Now' },
    trigger: 'click',
    entity: 'cta',
    action: 'signup',
    context: { test: ['engagement_flow', 0] },
    globals: { language: 'en', plan: 'premium' },
  },
};
