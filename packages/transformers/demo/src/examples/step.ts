import type { Flow } from '@walkeros/core';

/** Default passthrough - logs the event and returns void (no modification). */
export const passthrough: Flow.StepExample = {
  public: false,
  description: 'Default config: logs event, passes through unchanged',
  in: {
    name: 'page view',
    data: { title: 'Getting Started', id: '/docs/getting-started' },
    id: 'ev-1700000600',
    trigger: 'load',
    entity: 'page',
    action: 'view',
    timestamp: 1700000600,
    source: { type: 'browser', platform: 'web', url: 'https://example.com/' },
  },
  out: [],
};

/** addProcessedFlag enriches the event with _processed metadata. */
export const addProcessedFlag: Flow.StepExample = {
  title: 'Add processed flag',
  description:
    'With addProcessedFlag: true, adds _processed and _processedBy to event.data',
  in: {
    name: 'product add',
    data: { name: 'Everyday Ruck Snack', price: 420 },
    id: 'ev-1700000601',
    trigger: 'click',
    entity: 'product',
    action: 'add',
    timestamp: 1700000601,
    source: { type: 'browser', platform: 'web', url: 'https://example.com/' },
  },
  out: [
    [
      'return',
      {
        name: 'product add',
        data: {
          name: 'Everyday Ruck Snack',
          price: 420,
          _processed: true,
          _processedBy: 'transformer-demo',
        },
        id: 'ev-1700000601',
        trigger: 'click',
        entity: 'product',
        action: 'add',
        timestamp: 1700000601,
        source: {
          type: 'browser',
          platform: 'web',
          url: 'https://example.com/',
        },
      },
    ],
  ],
};
