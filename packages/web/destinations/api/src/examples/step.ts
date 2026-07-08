import type { Flow, WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * API web destination step examples.
 *
 * At push time, the destination calls `env.sendWeb(url, body, options)` where
 * `url` is the configured endpoint, `body` is the JSON-stringified event data
 * (or mapped data), and `options` carries headers/method/transport.
 *
 * Each `out` tuple is `['sendWeb', url, body, options]` mirroring the real
 * call signature. The test fixture pins the settings.url used below.
 */
const URL = 'https://api.example.com/events';

// The destination emits a W3C `traceparent` for any event carrying both a
// `source.trace` and an `id`, so the expected `out` headers derive from the
// same input event the example pushes.
const traceparent = (event: WalkerOS.Event): string =>
  `00-${event.source.trace}-${event.id}-01`;

const entityActionEvent = getEvent('entity action', { timestamp: 1700000500 });

export const entityAction: Flow.StepExample = {
  title: 'Entity action',
  description:
    'A generic entity action event is forwarded to the configured API endpoint with the mapped data JSON body.',
  in: entityActionEvent,
  mapping: {
    data: 'data',
  },
  out: [
    [
      'sendWeb',
      URL,
      JSON.stringify({
        string: 'foo',
        number: 1,
        boolean: true,
        array: [0, 'text', false],
      }),
      {
        headers: { traceparent: traceparent(entityActionEvent) },
        method: undefined,
        transport: 'fetch',
      },
    ],
  ],
};

const pageViewEvent = getEvent('page view', { timestamp: 1700000501 });

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A page view is POSTed to the configured API endpoint with the event data section as the JSON body.',
  in: pageViewEvent,
  mapping: {
    data: 'data',
  },
  out: [
    [
      'sendWeb',
      URL,
      JSON.stringify({
        domain: 'www.example.com',
        title: 'walkerOS documentation',
        referrer: 'https://www.walkeros.io/',
        search: '?foo=bar',
        hash: '#hash',
        id: '/docs/',
      }),
      {
        headers: { traceparent: traceparent(pageViewEvent) },
        method: undefined,
        transport: 'fetch',
      },
    ],
  ],
};

const orderCompleteEvent = getEvent('order complete', {
  timestamp: 1700000502,
});

export const customTransform: Flow.StepExample = {
  title: 'Custom payload',
  description:
    'An order event is reshaped via a data mapping into a custom JSON body for the API endpoint.',
  in: orderCompleteEvent,
  mapping: {
    data: {
      map: {
        order_id: 'data.id',
        amount: 'data.total',
        tax: 'data.taxes',
        shipping_cost: 'data.shipping',
        currency: 'data.currency',
        event_name: 'name',
        user_id: 'user.id',
      },
    },
  },
  out: [
    [
      'sendWeb',
      URL,
      JSON.stringify({
        order_id: '0rd3r1d',
        amount: 555,
        tax: 73.76,
        shipping_cost: 5.22,
        currency: 'EUR',
        event_name: 'order complete',
        user_id: 'us3r',
      }),
      {
        headers: { traceparent: traceparent(orderCompleteEvent) },
        method: undefined,
        transport: 'fetch',
      },
    ],
  ],
};
