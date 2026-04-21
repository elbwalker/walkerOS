import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view is logged by the demo destination as a developer reference for destination lifecycle.',
  in: getEvent('page view', { timestamp: 1700000900 }),
  mapping: {},
  out: [['log', getEvent('page view', { timestamp: 1700000900 })]],
};

export const orderComplete: Flow.StepExample = {
  title: 'Order complete',
  description:
    'An order complete event is logged by the demo destination showing the full event payload.',
  in: getEvent('order complete', { timestamp: 1700000901 }),
  mapping: {},
  out: [['log', getEvent('order complete', { timestamp: 1700000901 })]],
};
