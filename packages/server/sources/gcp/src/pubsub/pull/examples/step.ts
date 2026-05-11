import type { Flow } from '@walkeros/core';

/**
 * Pub/Sub pull step examples.
 *
 * Each example's `in` is a partial MessageLike (id, data Buffer, attributes,
 * publishTime). The trigger synthesizes the missing fields and invokes the
 * registered message handler. `out` is the array of recorded mock calls
 * produced by the handler. Recording shape is `[method, ...args]`.
 *
 * The `__triggerMessage` helper records each message's terminal state under
 * `message.ack` or `message.nack` so step examples can assert on that.
 */

const eventPayload = {
  name: 'page view',
  data: { title: 'Documentation', url: 'https://example.com/docs' },
};

const orderPayload = {
  name: 'order complete',
  data: { id: 'ORD-500', total: 199.99, currency: 'EUR' },
};

export const pageView: Flow.StepExample = {
  title: 'Page view',
  description:
    'A JSON-encoded page view event arrives on the subscription, decodes successfully, and is acked.',
  in: {
    id: 'msg-1',
    dataString: JSON.stringify(eventPayload),
    attributes: {},
  },
  out: [['message.ack', 'msg-1']],
};

export const orderComplete: Flow.StepExample = {
  title: 'Order complete',
  description:
    'A JSON-encoded order event arrives and is acked after successful collector forwarding.',
  in: {
    id: 'msg-2',
    dataString: JSON.stringify(orderPayload),
    attributes: { entity: 'order', action: 'complete' },
  },
  out: [['message.ack', 'msg-2']],
};

export const decoderText: Flow.StepExample = {
  title: 'Text decoder',
  description:
    'With decoder=text on the source settings, the message data is forwarded to the collector as a UTF-8 string and acked.',
  in: {
    id: 'msg-3',
    dataString: 'plain text payload',
    attributes: {},
  },
  out: [['message.ack', 'msg-3']],
};

export const malformedJson: Flow.StepExample = {
  title: 'Malformed JSON nack',
  description:
    'A non-JSON body with the default json decoder fails to decode; the message is nacked for redelivery.',
  in: {
    id: 'msg-4',
    dataString: 'not-json{',
    attributes: {},
  },
  out: [['message.nack', 'msg-4']],
};

export const malformedJsonAck: Flow.StepExample = {
  title: 'Malformed JSON ack-and-drop',
  description:
    'With onPushError=ack on the source settings, a malformed JSON message is acked-and-dropped instead of redelivered.',
  in: {
    id: 'msg-5',
    dataString: 'not-json{',
    attributes: {},
  },
  out: [['message.ack', 'msg-5']],
};
