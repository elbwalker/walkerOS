import type { Flow } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';

/**
 * Firehose step examples. Each `out` is the recorded
 * `client.send(new PutRecordBatchCommand(input))` call. A record is the full
 * event as JSON plus a newline, or the mapped `data` when a mapping produced
 * an object; each record's bytes are written out below.
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
  timestamp: 1700001000000,
  data: { title: 'Home', url: 'https://example.com/' },
  source: { type: 'express', platform: 'server' },
});

const orderEvt = getEvent('order complete', {
  id: 'ev-1700001001',
  timestamp: 1700001001000,
  data: { id: 'ORD-400', value: 99.99, currency: 'EUR' },
  source: { type: 'express', platform: 'server' },
});

const signupEvt = createEvent({
  name: 'user signup',
  id: 'ev-1700001002',
  timestamp: 1700001002000,
  data: { plan: 'pro', source: 'landing-page' },
  user: { id: 'usr-789', email: 'new@example.com' },
  source: { type: 'express', platform: 'server' },
});

export const firehoseRecord: Flow.StepExample = {
  title: 'Page view record',
  description:
    'A page view is sent to Firehose as one record: the full event as JSON followed by a newline.',
  in: pageEvent,
  mapping: undefined,
  out: [
    [
      'client.send',
      {
        DeliveryStreamName: STREAM,
        Records: [
          {
            Data: Buffer.from(
              '{"name":"page view","data":{"title":"Home","url":"https://example.com/"},"context":{"dev":["test",1]},"globals":{"pagegroup":"docs"},"custom":{"completely":"random"},"user":{"id":"us3r","device":"c00k13","session":"s3ss10n"},"nested":[{"entity":"child","data":{"is":"subordinated"}}],"consent":{"functional":true},"id":"ev-1700001000","trigger":"load","entity":"page","action":"view","timestamp":1700001000000,"timing":3.14,"source":{"count":1,"trace":"0a1b2c3d4e5f60718293a4b5c6d7e8f9","type":"express","platform":"server"}}\n',
            ),
          },
        ],
      },
    ],
  ],
};

export const orderEvent: Flow.StepExample = {
  title: 'Order record',
  description:
    'An order complete event is serialized and delivered to Firehose as one newline-terminated record.',
  in: orderEvt,
  mapping: undefined,
  out: [
    [
      'client.send',
      {
        DeliveryStreamName: STREAM,
        Records: [
          {
            Data: Buffer.from(
              '{"name":"order complete","data":{"id":"ORD-400","value":99.99,"currency":"EUR"},"context":{"shopping":["complete",0]},"globals":{"pagegroup":"shop"},"custom":{"completely":"random"},"user":{"id":"us3r","device":"c00k13","session":"s3ss10n"},"nested":[{"entity":"product","data":{"id":"ers","name":"Everyday Ruck Snack","color":"black","size":"l","price":420},"context":{"shopping":["complete",0]},"nested":[]},{"entity":"product","data":{"id":"cc","name":"Cool Cap","size":"one size","price":42},"context":{"shopping":["complete",0]},"nested":[]},{"entity":"gift","data":{"name":"Surprise"},"context":{"shopping":["complete",0]},"nested":[]}],"consent":{"functional":true},"id":"ev-1700001001","trigger":"load","entity":"order","action":"complete","timestamp":1700001001000,"timing":3.14,"source":{"count":1,"trace":"0a1b2c3d4e5f60718293a4b5c6d7e8f9","type":"express","platform":"server"}}\n',
            ),
          },
        ],
      },
    ],
  ],
};

export const userSignupEvent: Flow.StepExample = {
  title: 'User signup record',
  description:
    'A user signup event including user fields is streamed to Firehose as a JSON record.',
  in: signupEvt,
  mapping: undefined,
  out: [
    [
      'client.send',
      {
        DeliveryStreamName: STREAM,
        Records: [
          {
            Data: Buffer.from(
              '{"name":"user signup","data":{"plan":"pro","source":"landing-page"},"context":{"dev":["test",1]},"globals":{"lang":"elb"},"custom":{"completely":"random"},"user":{"id":"usr-789","email":"new@example.com"},"nested":[{"entity":"child","data":{"is":"subordinated"}}],"consent":{"functional":true},"id":"ev-1700001002","trigger":"test","entity":"user","action":"signup","timestamp":1700001002000,"timing":3.14,"source":{"count":1,"trace":"0a1b2c3d4e5f60718293a4b5c6d7e8f9","type":"express","platform":"server"}}\n',
            ),
          },
        ],
      },
    ],
  ],
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
        total: 'data.value',
      },
    },
  },
  out: [
    [
      'client.send',
      {
        DeliveryStreamName: STREAM,
        Records: [
          {
            Data: Buffer.from(
              '{"id":"ev-1700001001","name":"order complete","order_id":"ORD-400","total":99.99}\n',
            ),
          },
        ],
      },
    ],
  ],
};

/** A silent rule sends no record to Firehose. */
export const silentRule: Flow.StepExample = {
  public: false,
  description: 'A rule with silent: true sends no record to Firehose.',
  in: pageEvent,
  mapping: { silent: true },
  out: [],
};
