import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * SNS step examples. Each example's `out` is the array of recorded mock
 * calls produced by `push()`. The recording shape is:
 *   ['client.send', commandInput]
 *
 * The destination JSON-stringifies the event into the Publish call's Message
 * field. Mapping entries (messageGroupId, messageDeduplicationId,
 * messageAttributes) resolve per event via getMappingValue.
 */

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
        TopicArn: 'arn:aws:sns:eu-central-1:000000000000:walkeros-events',
        Message: JSON.stringify(pageEvent),
      },
    ],
  ],
};

export const orderEvent: Flow.StepExample = {
  title: 'Order publish with FIFO group (path-resolved)',
  description:
    'An order complete event is published with a FIFO messageGroupId resolved from the event via the mapping path "user.id". `messageGroupId` is a `Mapping.Value`, so a string path is sufficient; no literal is hard-coded.',
  in: orderEvt,
  mapping: { settings: { messageGroupId: 'user.id' } },
  out: [
    [
      'client.send',
      {
        TopicArn: 'arn:aws:sns:eu-central-1:000000000000:walkeros-events.fifo',
        Message: JSON.stringify(orderEvt),
        MessageGroupId: 'usr-789',
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
        TopicArn: 'arn:aws:sns:eu-central-1:000000000000:walkeros-events',
        Message: JSON.stringify(productViewEvt),
        MessageAttributes: {
          schema_version: { DataType: 'String', StringValue: 'v4' },
          tenant: { DataType: 'String', StringValue: 'acme' },
        },
      },
    ],
  ],
};
