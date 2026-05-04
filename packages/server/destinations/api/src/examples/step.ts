import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * API server destination step examples.
 *
 * At push time, the destination calls `env.sendServer(url, body, options)`
 * where `url` is the configured endpoint, `body` is the JSON-stringified
 * event data (or mapped data), and `options` carries headers/method/timeout.
 *
 * Each `out` tuple is `['sendServer', url, body, options]` mirroring the real
 * call signature. The test fixture injects the configured settings per example.
 */
const URL = 'https://api.example.com/events';

export const fullEvent: Flow.StepExample = {
  title: 'Forward event data',
  description:
    'A page view is POSTed to the configured endpoint with the event data serialized as the JSON body.',
  in: getEvent('page view', {
    timestamp: 1700000800,
    data: { title: 'Docs', url: 'https://example.com/docs' },
    source: { type: 'express', platform: 'server' },
  }),
  mapping: {
    data: 'data',
  },
  out: [
    [
      'sendServer',
      URL,
      JSON.stringify({
        title: 'Docs',
        url: 'https://example.com/docs',
      }),
      { headers: undefined, method: undefined, timeout: undefined },
    ],
  ],
};

export const customHeaders: Flow.StepExample = {
  title: 'Custom headers',
  description:
    'A form submission is sent to the API with custom request headers such as an API key for authentication.',
  in: getEvent('form submit', {
    timestamp: 1700000801,
    data: { type: 'contact', email: 'user@example.com' },
    source: { type: 'express', platform: 'server' },
  }),
  mapping: {
    data: 'data',
  },
  out: [
    [
      'sendServer',
      URL,
      JSON.stringify({
        type: 'contact',
        email: 'user@example.com',
      }),
      {
        headers: { 'X-API-Key': 'YOUR_API_KEY' },
        method: undefined,
        timeout: undefined,
      },
    ],
  ],
};

export const customTransform: Flow.StepExample = {
  title: 'Custom payload',
  description:
    'An order event is reshaped via a data mapping into a custom JSON payload with renamed fields for the API.',
  in: getEvent('order complete', {
    timestamp: 1700000802,
    data: { id: 'ORD-500', total: 199.99, currency: 'USD' },
    user: { id: 'buyer-42' },
    source: { type: 'express', platform: 'server' },
  }),
  mapping: {
    data: {
      map: {
        order_id: 'data.id',
        amount: 'data.total',
        currency: 'data.currency',
        customer_id: 'user.id',
        event_type: 'name',
      },
    },
  },
  out: [
    [
      'sendServer',
      URL,
      JSON.stringify({
        order_id: 'ORD-500',
        amount: 199.99,
        currency: 'USD',
        customer_id: 'buyer-42',
        event_type: 'order complete',
      }),
      { headers: undefined, method: undefined, timeout: undefined },
    ],
  ],
};
