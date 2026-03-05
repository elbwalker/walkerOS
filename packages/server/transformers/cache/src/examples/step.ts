import type { Flow } from '@walkeros/core';

export const cacheMiss: Flow.StepExample = {
  in: {
    name: 'page view',
    data: { url: '/api/events' },
    id: '1700000600-gr0up-1',
    trigger: 'load',
    entity: 'page',
    action: 'view',
    timestamp: 1700000600,
    group: 'gr0up',
    count: 1,
    version: { tagging: 1 },
    source: { type: 'server', id: '', previous_id: '' },
  },
  out: { respond: true },
};

export const cacheHit: Flow.StepExample = {
  in: {
    name: 'page view',
    data: { url: '/api/events' },
    id: '1700000601-gr0up-2',
    trigger: 'load',
    entity: 'page',
    action: 'view',
    timestamp: 1700000601,
    group: 'gr0up',
    count: 2,
    version: { tagging: 1 },
    source: { type: 'server', id: '', previous_id: '' },
  },
  out: false,
};
