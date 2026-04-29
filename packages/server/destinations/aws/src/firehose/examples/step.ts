import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * Default firehose push -- client.send(new PutRecordBatchCommand({...}))
 * Records contain the full event JSON-stringified as Buffer Data.
 */
export const firehoseRecord: Flow.StepExample = {
  title: 'Page view record',
  description:
    'A page view is sent to Kinesis Firehose as a single record with the full event JSON-stringified into the Data buffer.',
  in: getEvent('page view', {
    id: 'ev-1700001000',
    timestamp: 1700001000,
    data: { title: 'Home', url: 'https://example.com/' },
    source: { type: 'express', platform: 'server' },
  }),
  mapping: undefined,
  out: [
    [
      'client.send',
      {
        DeliveryStreamName: 'walkeros-events',
        Records: [
          {
            Data: Buffer.from(
              JSON.stringify(
                getEvent('page view', {
                  id: 'ev-1700001000',
                  timestamp: 1700001000,
                  data: { title: 'Home', url: 'https://example.com/' },
                  source: { type: 'express', platform: 'server' },
                }),
              ),
            ),
          },
        ],
      },
    ],
  ],
};

/**
 * Order event -- same pattern, full event serialized in Records[0].Data.
 */
export const orderEvent: Flow.StepExample = {
  title: 'Order record',
  description:
    'An order complete event is serialized and delivered to Firehose as a batch record for downstream storage.',
  in: getEvent('order complete', {
    id: 'ev-1700001001',
    timestamp: 1700001001,
    data: { id: 'ORD-400', total: 99.99, currency: 'EUR' },
    source: { type: 'express', platform: 'server' },
  }),
  mapping: undefined,
  out: [
    [
      'client.send',
      {
        DeliveryStreamName: 'walkeros-events',
        Records: [
          {
            Data: Buffer.from(
              JSON.stringify(
                getEvent('order complete', {
                  id: 'ev-1700001001',
                  timestamp: 1700001001,
                  data: { id: 'ORD-400', total: 99.99, currency: 'EUR' },
                  source: { type: 'express', platform: 'server' },
                }),
              ),
            ),
          },
        ],
      },
    ],
  ],
};

/**
 * User signup -- full event including user fields is serialized to Firehose.
 */
export const userSignupEvent: Flow.StepExample = {
  title: 'User signup record',
  description:
    'A user signup event including user fields is streamed to Firehose as a JSON record.',
  in: getEvent('user signup', {
    id: 'ev-1700001002',
    timestamp: 1700001002,
    data: { plan: 'pro', source: 'landing-page' },
    user: { id: 'usr-789', email: 'new@example.com' },
    source: { type: 'express', platform: 'server' },
  }),
  mapping: undefined,
  out: [
    [
      'client.send',
      {
        DeliveryStreamName: 'walkeros-events',
        Records: [
          {
            Data: Buffer.from(
              JSON.stringify(
                getEvent('user signup', {
                  id: 'ev-1700001002',
                  timestamp: 1700001002,
                  data: { plan: 'pro', source: 'landing-page' },
                  user: { id: 'usr-789', email: 'new@example.com' },
                  source: { type: 'express', platform: 'server' },
                }),
              ),
            ),
          },
        ],
      },
    ],
  ],
};
