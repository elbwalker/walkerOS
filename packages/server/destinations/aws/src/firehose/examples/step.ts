import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import { toRecordData } from '../lib/records';

/**
 * Firehose step examples. Each `out` is the recorded
 * `client.send(new PutRecordBatchCommand(input))` call. A record is the full
 * event as JSON plus a newline, or the mapped `data` when a mapping produced
 * an object.
 */

const STREAM = 'walkeros-events';

/**
 * The copy-paste config: the stream, its region, and keys from `$secret`.
 * `init` builds one client from it, offline, with a per-attempt timeout of a
 * quarter of the collector's 10 s race, so the SDK's three attempts end
 * before the collector stops waiting.
 */
export const init: Flow.StepExample = {
  title: 'Initialization',
  description:
    'Init builds one FirehoseClient for the stream region with the credentials from config.credentials and a 2500 ms per-attempt timeout. Nothing is sent until the first event.',
  in: {
    settings: { streamName: STREAM, region: 'eu-central-1' },
    credentials: {
      accessKeyId: '$secret.AWS_ACCESS_KEY_ID',
      secretAccessKey: '$secret.AWS_SECRET_ACCESS_KEY',
    },
  },
  out: [
    [
      'new FirehoseClient',
      {
        region: 'eu-central-1',
        credentials: {
          accessKeyId: '$secret.AWS_ACCESS_KEY_ID',
          secretAccessKey: '$secret.AWS_SECRET_ACCESS_KEY',
        },
        requestHandler: { requestTimeout: 2500, throwOnRequestTimeout: true },
      },
    ],
  ],
};

const pageEvent = getEvent('page view', {
  id: 'ev-1700001000',
  timestamp: 1700001000,
  data: { title: 'Home', url: 'https://example.com/' },
  source: { type: 'express', platform: 'server' },
});

const orderEvt = getEvent('order complete', {
  id: 'ev-1700001001',
  timestamp: 1700001001,
  data: { id: 'ORD-400', total: 99.99, currency: 'EUR' },
  source: { type: 'express', platform: 'server' },
});

const signupEvt = getEvent('user signup', {
  id: 'ev-1700001002',
  timestamp: 1700001002,
  data: { plan: 'pro', source: 'landing-page' },
  user: { id: 'usr-789', email: 'new@example.com' },
  source: { type: 'express', platform: 'server' },
});

function sent(payload: unknown): Flow.StepExample['out'] {
  return [
    [
      'client.send',
      {
        DeliveryStreamName: STREAM,
        Records: [{ Data: toRecordData(payload) }],
      },
    ],
  ];
}

export const firehoseRecord: Flow.StepExample = {
  title: 'Page view record',
  description:
    'A page view is sent to Firehose as one record: the full event as JSON followed by a newline.',
  in: pageEvent,
  mapping: undefined,
  out: sent(pageEvent),
};

export const orderEvent: Flow.StepExample = {
  title: 'Order record',
  description:
    'An order complete event is serialized and delivered to Firehose as one newline-terminated record.',
  in: orderEvt,
  mapping: undefined,
  out: sent(orderEvt),
};

export const userSignupEvent: Flow.StepExample = {
  title: 'User signup record',
  description:
    'A user signup event including user fields is streamed to Firehose as a JSON record.',
  in: signupEvt,
  mapping: undefined,
  out: sent(signupEvt),
};

export const mappedRecord: Flow.StepExample = {
  title: 'Mapped record',
  description:
    'A mapping that produces an object sends that object as the record instead of the full event. Keep the event id in it for deduplication.',
  in: orderEvt,
  mapping: {
    data: {
      map: {
        id: 'id',
        name: 'name',
        order_id: 'data.id',
        total: 'data.total',
      },
    },
  },
  out: sent({
    id: 'ev-1700001001',
    name: 'order complete',
    order_id: 'ORD-400',
    total: 99.99,
  }),
};
