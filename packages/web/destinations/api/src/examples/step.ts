import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

export const entityAction: Flow.StepExample = {
  in: getEvent('entity action', { timestamp: 1700000500 }),
  mapping: {
    data: 'data',
  },
  out: JSON.stringify({
    string: 'foo',
    number: 1,
    boolean: true,
    array: [0, 'text', false],
  }),
};

export const pageView: Flow.StepExample = {
  in: getEvent('page view', { timestamp: 1700000501 }),
  mapping: {
    data: 'data',
  },
  out: JSON.stringify({
    domain: 'www.example.com',
    title: 'walkerOS documentation',
    referrer: 'https://www.walkeros.io/',
    search: '?foo=bar',
    hash: '#hash',
    id: '/docs/',
  }),
};

export const customTransform: Flow.StepExample = {
  in: getEvent('order complete', { timestamp: 1700000502 }),
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
  out: JSON.stringify({
    order_id: '0rd3r1d',
    amount: 555,
    tax: 73.76,
    shipping_cost: 5.22,
    currency: 'EUR',
    event_name: 'order complete',
    user_id: 'us3r',
  }),
};
