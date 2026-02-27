import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

export const routeMatch: Flow.StepExample = {
  in: getEvent('entity action', {
    timestamp: 1700000600,
    data: { v: '2', en: 'purchase' },
    source: { type: 'server', id: '', previous_id: '' },
  }),
  out: { __branch: true, event: {}, next: 'gtag-parser' },
};

export const routeMiss: Flow.StepExample = {
  in: getEvent('entity action', {
    timestamp: 1700000601,
    data: { unknown: 'payload' },
    source: { type: 'server', id: '', previous_id: '' },
  }),
  out: false,
};
