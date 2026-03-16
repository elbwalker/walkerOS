import type { Flow } from '@walkeros/core';

export const pageView: Flow.StepExample = {
  trigger: {
    type: 'load',
    options: {
      url: 'https://example.com/docs',
      title: 'Documentation',
      referrer: 'https://example.com/',
    },
  },
  in: '',
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
  trigger: { type: 'click', options: 'button' },
  in: '<button data-elb="cta" data-elb-cta="label:Sign Up" data-elbaction="click:click">Sign Up</button>',
  out: {
    name: 'cta click',
    data: { label: 'Sign Up' },
    trigger: 'click',
    entity: 'cta',
    action: 'click',
  },
};

export const submitEvent: Flow.StepExample = {
  trigger: { type: 'submit', options: 'form' },
  in: '<form data-elb="signup" data-elb-signup="plan:premium" data-elbaction="submit:complete"></form>',
  out: {
    name: 'signup complete',
    data: { plan: 'premium' },
    trigger: 'submit',
    entity: 'signup',
    action: 'complete',
  },
};

export const impressionEvent: Flow.StepExample = {
  trigger: { type: 'impression', options: 'div' },
  in: '<div data-elb="banner" data-elb-banner="type:promotional;position:sidebar" data-elbaction="impression:view"></div>',
  out: {
    name: 'banner view',
    data: { type: 'promotional', position: 'sidebar' },
    trigger: 'impression',
    entity: 'banner',
    action: 'view',
  },
};

export const nestedEntities: Flow.StepExample = {
  trigger: { type: 'load' },
  in: '<div data-elb="product" data-elb-product="id:SKU-42;name:Sneakers" data-elbaction="load:view"><div data-elb="size" data-elb-size="selected:large;inStock:true"></div></div>',
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
  trigger: { type: 'click', options: 'div' },
  in: '<div data-elb="product" data-elb-product="price:99.99;available:true;colors[]:red;colors[]:blue" data-elbaction="click:select"></div>',
  out: {
    name: 'product select',
    data: { price: 99.99, available: true, colors: ['red', 'blue'] },
    trigger: 'click',
    entity: 'product',
    action: 'select',
  },
};

export const contextAndGlobals: Flow.StepExample = {
  trigger: { type: 'click', options: '[data-elb="cta"]' },
  in: '<div data-elbcontext="test:engagement_flow" data-elbglobals="language:en;plan:premium"><div data-elb="cta" data-elb-cta="label:Try Now" data-elbaction="click:signup">Try Now</div></div>',
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
