import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * SNS step examples. Each example's `out` is the array of recorded mock
 * calls produced by `push()`. The recording shape is:
 *   ['client.send', commandInput]
 *
 * The destination JSON-stringifies the event (or the mapped `data` object)
 * into the Publish call's Message field. Mapping entries (messageGroupId,
 * messageDeduplicationId, messageAttributes) resolve per event via
 * getMappingValue. On a FIFO topic the deduplication id defaults to the
 * event id.
 */

const TOPIC_ARN = 'arn:aws:sns:eu-central-1:123456789012:walkeros-events';
const FIFO_ARN = 'arn:aws:sns:eu-central-1:123456789012:walkeros-events.fifo';

/**
 * The copy-paste config: the topic ARN, which also names the region, and
 * keys from `$secret`. `init` builds one client from it, offline; nothing is
 * sent until the first event.
 */
export const init: Flow.StepExample = {
  title: 'Initialization',
  description:
    'Init builds one SNSClient in the region of the topic ARN with the credentials from config.credentials and a 2500 ms per-attempt timeout. No topic is created and nothing is sent until the first event.',
  in: {
    settings: { topicArn: TOPIC_ARN },
    credentials: {
      accessKeyId: '$secret.AWS_ACCESS_KEY_ID',
      secretAccessKey: '$secret.AWS_SECRET_ACCESS_KEY',
    },
  },
  out: [
    [
      'new SNSClient',
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
  user: { id: 'usr-789' },
  source: { type: 'express', platform: 'server' },
});

const productViewEvt = getEvent('product view', {
  id: 'ev-1700001002',
  timestamp: 1700001002,
  data: { id: 'SKU-1', tenant_id: 'acme' },
  source: { type: 'express', platform: 'server' },
});

export const pageView: Flow.StepExample = {
  title: 'Page view publish',
  description:
    'A page view event is JSON-stringified and published as the Message of an SNS Publish call.',
  in: pageEvent,
  mapping: undefined,
  out: [
    [
      'client.send',
      {
        TopicArn: TOPIC_ARN,
        Message: JSON.stringify(pageEvent),
      },
    ],
  ],
};

export const orderEvent: Flow.StepExample = {
  title: 'Order publish with FIFO group (path-resolved)',
  description:
    'An order complete event is published to a FIFO topic with a messageGroupId resolved from the event via the mapping path "user.id". The deduplication id defaults to the event id.',
  in: orderEvt,
  mapping: { settings: { messageGroupId: 'user.id' } },
  out: [
    [
      'client.send',
      {
        TopicArn: FIFO_ARN,
        Message: JSON.stringify(orderEvt),
        MessageGroupId: 'usr-789',
        MessageDeduplicationId: 'ev-1700001001',
      },
    ],
  ],
};

export const attributedPublish: Flow.StepExample = {
  title: 'Publish with per-event message attributes',
  description:
    'Demonstrates `messageAttributes` as `Mapping.Map`: each attribute value resolves per event. Operators express the SDK shape (`{ DataType, StringValue }`) per entry.',
  in: productViewEvt,
  mapping: {
    settings: {
      messageAttributes: {
        schema_version: { value: { DataType: 'String', StringValue: 'v4' } },
        tenant: { value: { DataType: 'String', StringValue: 'acme' } },
      },
    },
  },
  out: [
    [
      'client.send',
      {
        TopicArn: TOPIC_ARN,
        Message: JSON.stringify(productViewEvt),
        MessageAttributes: {
          schema_version: { DataType: 'String', StringValue: 'v4' },
          tenant: { DataType: 'String', StringValue: 'acme' },
        },
      },
    ],
  ],
};

export const mappedMessage: Flow.StepExample = {
  title: 'Mapped message',
  description:
    'A mapping that produces an object publishes that object as the Message instead of the full event. Keep the event id in it for deduplication.',
  in: orderEvt,
  mapping: {
    data: {
      map: { id: 'id', name: 'name', order_id: 'data.id', total: 'data.total' },
    },
  },
  out: [
    [
      'client.send',
      {
        TopicArn: TOPIC_ARN,
        Message: JSON.stringify({
          id: 'ev-1700001001',
          name: 'order complete',
          order_id: 'ORD-400',
          total: 99.99,
        }),
      },
    ],
  ],
};
