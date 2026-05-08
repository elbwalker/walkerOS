import type { Flow } from '@walkeros/core';

/**
 * SQS source step examples.
 *
 * Each `in` is a partial SQS Message-like (MessageId, Body, optional
 * ReceiptHandle). The trigger synthesizes the missing fields and dispatches
 * through the source's `push()` (the same pipeline the long-poll loop uses).
 * `out` records the terminal state recorded by the trigger as
 * `[method, ...args]` entries.
 */

const eventPayload = {
  event: 'page view',
  data: { title: 'Documentation', url: 'https://example.com/docs' },
};

const orderPayload = {
  event: 'order complete',
  data: { id: 'ORD-500', total: 199.99, currency: 'EUR' },
};

export const pageView: Flow.StepExample = {
  title: 'Page view from SQS',
  description:
    'A standard SQS message body containing a walker elb event payload as JSON.',
  in: {
    MessageId: 'm-1',
    Body: JSON.stringify(eventPayload),
  },
  out: [['message.ack', 'm-1']],
};

export const orderComplete: Flow.StepExample = {
  title: 'Order complete from SQS',
  description: 'Order complete event flowing through the long-poll loop.',
  in: {
    MessageId: 'm-2',
    Body: JSON.stringify(orderPayload),
  },
  out: [['message.ack', 'm-2']],
};

export const decoderText: Flow.StepExample = {
  title: 'Text decoder',
  description:
    'When decoder is "text", the body string flows under data.payload.',
  in: { MessageId: 'm-3', Body: 'raw text payload' },
  out: [['message.ack', 'm-3']],
};

export const malformedJson: Flow.StepExample = {
  title: 'Malformed JSON nacks',
  description:
    'Default decoder is JSON. A malformed body throws DecoderError; the source nacks (skips DeleteMessage) so the message redelivers.',
  in: { MessageId: 'm-4', Body: '{not json' },
  out: [['message.nack', 'm-4']],
};
