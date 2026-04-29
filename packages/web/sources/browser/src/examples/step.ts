import type { Flow } from '@walkeros/core';

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page load trigger captures the current URL, title, and referrer as a walker page view event.',
  trigger: {
    type: 'load',
    options: {
      url: 'https://example.com/docs',
      title: 'Documentation',
      referrer: 'https://example.com/',
    },
  },
  in: '',
  out: [
    [
      'elb',
      {
        name: 'page view',
        data: {
          domain: 'example.com',
          title: 'Documentation',
          referrer: 'https://example.com/',
          id: '/docs',
        },
        context: {},
        globals: {},
        nested: undefined,
        custom: undefined,
        trigger: 'load',
        source: {
          type: 'browser',
          platform: 'web',
          url: 'https://example.com/docs',
          referrer: 'https://example.com/',
        },
      },
    ],
  ],
};

export const clickEvent: Flow.StepExample = {
  title: 'Click event',
  description:
    'A button click with walker data attributes is captured as an entity action event with the mapped label data.',
  trigger: { type: 'click', options: 'button' },
  in: '<button data-elb="cta" data-elb-cta="label:Sign Up" data-elbaction="click:click">Sign Up</button>',
  out: [
    [
      'elb',
      {
        name: 'cta click',
        entity: 'cta',
        action: 'click',
        data: { label: 'Sign Up' },
        context: {},
        globals: {},
        nested: [],
        source: {
          type: 'browser',
          platform: 'web',
          url: 'https://example.com/',
          referrer: '',
        },
        trigger: 'click',
      },
    ],
  ],
};

export const submitEvent: Flow.StepExample = {
  title: 'Submit event',
  description:
    'A form submit with walker data attributes produces a signup complete event carrying the selected plan.',
  trigger: { type: 'submit', options: 'form' },
  in: '<form data-elb="signup" data-elb-signup="plan:premium" data-elbaction="submit:complete"></form>',
  out: [
    [
      'elb',
      {
        name: 'signup complete',
        entity: 'signup',
        action: 'complete',
        data: { plan: 'premium' },
        context: {},
        globals: {},
        nested: [],
        source: {
          type: 'browser',
          platform: 'web',
          url: 'https://example.com/',
          referrer: '',
        },
        trigger: 'submit',
      },
    ],
  ],
};

export const impressionEvent: Flow.StepExample = {
  title: 'Impression event',
  description:
    'An intersection observer impression on a div with walker attributes emits a banner view event.',
  trigger: { type: 'impression', options: 'div' },
  in: '<div data-elb="banner" data-elb-banner="type:promotional;position:sidebar" data-elbaction="impression:view"></div>',
  out: [
    [
      'elb',
      {
        name: 'banner view',
        entity: 'banner',
        action: 'view',
        data: { type: 'promotional', position: 'sidebar' },
        context: {},
        globals: {},
        nested: [],
        source: {
          type: 'browser',
          platform: 'web',
          url: 'https://example.com/',
          referrer: '',
        },
        trigger: 'impression',
      },
    ],
  ],
};

export const nestedEntities: Flow.StepExample = {
  title: 'Nested entities',
  description:
    'A page load produces a page view plus a product view whose nested size entity is captured on the product event.',
  trigger: { type: 'load' },
  in: '<div data-elb="product" data-elb-product="id:SKU-42;name:Sneakers" data-elbaction="load:view"><div data-elb="size" data-elb-size="selected:large;inStock:true"></div></div>',
  out: [
    [
      'elb',
      {
        name: 'page view',
        data: {
          domain: 'example.com',
          title: '',
          referrer: '',
          id: '/',
        },
        context: {},
        globals: {},
        nested: undefined,
        custom: undefined,
        trigger: 'load',
        source: {
          type: 'browser',
          platform: 'web',
          url: 'https://example.com/',
          referrer: '',
        },
      },
    ],
    [
      'elb',
      {
        name: 'product view',
        entity: 'product',
        action: 'view',
        data: { id: 'SKU-42', name: 'Sneakers' },
        context: {},
        globals: {},
        nested: [
          {
            entity: 'size',
            data: { selected: 'large', inStock: true },
            context: {},
            nested: [],
          },
        ],
        source: {
          type: 'browser',
          platform: 'web',
          url: 'https://example.com/',
          referrer: '',
        },
        trigger: 'load',
      },
    ],
  ],
};

export const dataAttributeTypes: Flow.StepExample = {
  title: 'Data attribute types',
  description:
    'Walker data attributes parse scalar, boolean, and array values into typed fields on the emitted event.',
  trigger: { type: 'click', options: 'div' },
  in: '<div data-elb="product" data-elb-product="price:99.99;available:true;colors[]:red;colors[]:blue" data-elbaction="click:select"></div>',
  out: [
    [
      'elb',
      {
        name: 'product select',
        entity: 'product',
        action: 'select',
        data: { price: 99.99, available: true, colors: ['red', 'blue'] },
        context: {},
        globals: {},
        nested: [],
        source: {
          type: 'browser',
          platform: 'web',
          url: 'https://example.com/',
          referrer: '',
        },
        trigger: 'click',
      },
    ],
  ],
};

export const contextAndGlobals: Flow.StepExample = {
  title: 'Context and globals',
  description:
    'Walker context and globals attributes attach ambient metadata to events emitted by the browser source.',
  trigger: { type: 'click', options: '[data-elb="cta"]' },
  in: '<div data-elbcontext="test:engagement_flow" data-elbglobals="language:en;plan:premium"><div data-elb="cta" data-elb-cta="label:Try Now" data-elbaction="click:signup">Try Now</div></div>',
  out: [
    [
      'elb',
      {
        name: 'cta signup',
        entity: 'cta',
        action: 'signup',
        data: { label: 'Try Now' },
        context: { test: ['engagement_flow', 0] },
        globals: { language: 'en', plan: 'premium' },
        nested: [],
        source: {
          type: 'browser',
          platform: 'web',
          url: 'https://example.com/',
          referrer: '',
        },
        trigger: 'click',
      },
    ],
  ],
};
