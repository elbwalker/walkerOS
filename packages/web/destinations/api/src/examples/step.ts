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
