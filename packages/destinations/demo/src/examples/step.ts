import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/** A step example whose input is a full walkerOS event. */
type EventStepExample = Flow.StepExample & { in: WalkerOS.Event };

const pageViewEvent = getEvent('page view', { timestamp: 1700000900 });

export const pageView: EventStepExample = {
  title: 'Page view',
  description:
    'A page view is logged by the demo destination as a developer reference for destination lifecycle.',
  in: pageViewEvent,
  mapping: {},
  out: [['log', `[demo] ${JSON.stringify(pageViewEvent, null, 2)}`]],
};

const orderCompleteEvent = getEvent('order complete', {
  timestamp: 1700000901,
});

export const orderComplete: EventStepExample = {
  title: 'Order complete',
  description:
    'An order complete event is logged by the demo destination showing the full event payload.',
  in: orderCompleteEvent,
  mapping: {},
  out: [['log', `[demo] ${JSON.stringify(orderCompleteEvent, null, 2)}`]],
};
