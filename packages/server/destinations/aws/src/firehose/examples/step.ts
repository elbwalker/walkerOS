import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

export const firehoseRecord: Flow.StepExample = {
  in: getEvent('page view', {
    timestamp: 1700001000,
    data: { title: 'Home', url: 'https://example.com/' },
    source: { type: 'server', id: '', previous_id: '' },
  }),
  mapping: undefined,
  out: {
    DeliveryStreamName: 'walkeros-events',
    Records: [
      {
        Data: JSON.stringify({
          title: 'Home',
          url: 'https://example.com/',
        }),
      },
    ],
  },
};

export const orderEvent: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700001001,
    data: { id: 'ORD-400', total: 99.99, currency: 'EUR' },
    source: { type: 'server', id: '', previous_id: '' },
  }),
  mapping: undefined,
  out: {
    DeliveryStreamName: 'walkeros-events',
    Records: [
      {
        Data: JSON.stringify({
          id: 'ORD-400',
          total: 99.99,
          currency: 'EUR',
        }),
      },
    ],
  },
};
