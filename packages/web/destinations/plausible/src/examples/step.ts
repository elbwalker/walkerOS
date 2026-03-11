import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

export const purchase: Flow.StepExample = {
  in: getEvent('order complete', { timestamp: 1700000200 }),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        revenue: {
          map: {
            currency: { value: 'EUR' },
            amount: 'data.total',
          },
        },
      },
    },
  },
  out: [
    'purchase',
    {
      revenue: {
        currency: 'EUR',
        amount: 555,
      },
    },
  ],
};

export const customEvent: Flow.StepExample = {
  in: getEvent('entity action', { timestamp: 1700000201 }),
  mapping: {
    name: 'Custom Event',
    data: {
      map: {
        props: 'data',
        revenue: 'data.number',
      },
    },
  },
  out: [
    'Custom Event',
    {
      props: {
        string: 'foo',
        number: 1,
        boolean: true,
        array: [0, 'text', false],
      },
      revenue: 1,
    },
  ],
};
