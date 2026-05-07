import type { Flow } from '@walkeros/core';

/**
 * Pub/Sub push step examples.
 *
 * Each example's `in` is a partial Pub/Sub push envelope (with `message.data`
 * pre-encoded as base64). The trigger constructs an HTTP-like Request from
 * `in` and invokes the source handler. `out` is the recorded HTTP response
 * shape (statusCode + JSON body).
 */

const eventPayload = {
  name: 'page view',
  data: { title: 'Documentation', url: 'https://example.com/docs' },
};

const orderPayload = {
  name: 'order complete',
  data: { id: 'ORD-500', total: 199.99, currency: 'EUR' },
};

function encodeData(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
}

export const validEnvelope: Flow.StepExample = {
  title: 'Valid push envelope',
  description:
    'A well-formed Pub/Sub push envelope decodes the base64 data, parses JSON, and forwards the event to the collector with a 200 response.',
  in: {
    message: {
      messageId: 'push-1',
      data: encodeData(eventPayload),
      attributes: { source: 'analytics' },
    },
    subscription: 'projects/test/subscriptions/events-sub',
  },
  out: [['response', 200, { success: true, id: 'push-1' }]],
};

export const orderEnvelope: Flow.StepExample = {
  title: 'Order envelope',
  description:
    'A push envelope carrying an order event is decoded and forwarded to the collector.',
  in: {
    message: {
      messageId: 'push-2',
      data: encodeData(orderPayload),
      attributes: {},
    },
    subscription: 'projects/test/subscriptions/events-sub',
  },
  out: [['response', 200, { success: true, id: 'push-2' }]],
};

export const malformedEnvelope: Flow.StepExample = {
  title: 'Malformed envelope',
  description:
    'A POST body lacking message.messageId returns 400 Bad Request without forwarding to the collector.',
  in: {
    not_a: 'pubsub envelope',
  },
  out: [
    [
      'response',
      400,
      {
        success: false,
        error: 'Malformed Pub/Sub envelope (missing message.messageId).',
      },
    ],
  ],
};
