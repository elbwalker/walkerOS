import type { Flow } from '@walkeros/core';

/** Default passthrough — logs the event and returns void (no modification). */
export const passthrough: Flow.StepExample = {
  description: 'Default config: logs event, passes through unchanged',
  in: {
    name: 'page view',
    data: { title: 'Getting Started', id: '/docs/getting-started' },
    id: '1700000600-gr0up-1',
    trigger: 'load',
    entity: 'page',
    action: 'view',
    timestamp: 1700000600,
    group: 'gr0up',
    count: 1,
    version: { tagging: 1 },
    source: { type: 'web', id: '', previous_id: '' },
  },
  out: undefined,
};

/** addProcessedFlag enriches the event with _processed metadata. */
export const addProcessedFlag: Flow.StepExample = {
  description:
    'With addProcessedFlag: true, adds _processed and _processedBy to event.data',
  in: {
    name: 'product add',
    data: { name: 'Everyday Ruck Snack', price: 420 },
    id: '1700000601-gr0up-2',
    trigger: 'click',
    entity: 'product',
    action: 'add',
    timestamp: 1700000601,
    group: 'gr0up',
    count: 2,
    version: { tagging: 1 },
    source: { type: 'web', id: '', previous_id: '' },
  },
  out: {
    event: {
      name: 'product add',
      data: {
        name: 'Everyday Ruck Snack',
        price: 420,
        _processed: true,
        _processedBy: 'transformer-demo',
      },
      id: '1700000601-gr0up-2',
      trigger: 'click',
      entity: 'product',
      action: 'add',
      timestamp: 1700000601,
      group: 'gr0up',
      count: 2,
      version: { tagging: 1 },
      source: { type: 'web', id: '', previous_id: '' },
    },
  },
};
