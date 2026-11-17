import type { Flow } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';

/**
 * Gravity Conversions API step examples.
 *
 * At push time, the destination calls
 * `env.sendServer(url, JSON.stringify(body), options)` with
 * `body = { test_event_code?, data: [conversion] }`.
 *
 * The test fixture pins `apiKey = 's3cr3t'` and the default url.
 *
 * Conversion keys are emitted in this order (insertion order matters for
 * `JSON.stringify` string equality): event_name, event_time (seconds),
 * event_id, action_source, event_source_url?, user_data, client_context?,
 * custom_data?. `email` and `phone` are normalised and SHA-256 hashed into
 * `em` and `ph`; Gravity click parameters go to `user_data` as they are.
 */
const URL = 'https://api.trygravity.com/gateway/events';
const OPTIONS = {
  headers: {
    Authorization: 'Bearer s3cr3t',
    'Content-Type': 'application/json',
  },
};

// sha256('jane@example.com'), sha256('4915123456789')
const EMAIL_SHA256 =
  '8c87b489ce35cf2e2f39f80e282cb2e804932a56a213983eeeb428407d43b52d';
const PHONE_SHA256 =
  'c0f8f0bebbbac96451ee8d8def84a02ae9e34c877775437cb9d458328315afa7';

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'A completed order is sent to Gravity as a Purchase with value, currency, order id, the hashed email and the Gravity click id.',
  in: getEvent('order complete', {
    id: 'ev-1700000900',
    timestamp: 1700000900000,
    data: { id: 'ORD-300', total: 249.99, currency: 'eur' },
    user: { email: 'Jane@Example.com' },
    globals: { grclid: 'grc_7f3a' },
    source: {
      type: 'express',
      platform: 'server',
      url: 'https://shop.example.com/checkout/complete',
    },
  }),
  mapping: {
    name: 'Purchase',
    data: {
      map: {
        email: 'user.email',
        grclid: 'globals.grclid',
        value: 'data.total',
        currency: 'data.currency',
        order_id: 'data.id',
      },
    },
  },
  out: [
    [
      'sendServer',
      URL,
      JSON.stringify({
        data: [
          {
            event_name: 'Purchase',
            event_time: 1700000900,
            event_id: 'ev-1700000900',
            action_source: 'website',
            event_source_url: 'https://shop.example.com/checkout/complete',
            user_data: { em: [EMAIL_SHA256], grclid: 'grc_7f3a' },
            custom_data: {
              value: 249.99,
              currency: 'EUR',
              order_id: 'ORD-300',
            },
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const lead: Flow.StepExample = {
  title: 'Lead',
  description:
    'A demo request is sent to Gravity as a Lead with the hashed phone and every Gravity click parameter stored on the landing page.',
  in: createEvent({
    name: 'demo request',
    id: 'ev-1700000901',
    timestamp: 1700000901000,
    data: { phone: '+49 151 23456789' },
    globals: { grclid: 'grc_1', grcpid: 'cmp_2', gradid: 'ad_3' },
  }),
  mapping: {
    name: 'Lead',
    data: {
      map: {
        phone: 'data.phone',
        grclid: 'globals.grclid',
        grcpid: 'globals.grcpid',
        gradid: 'globals.gradid',
      },
    },
  },
  out: [
    [
      'sendServer',
      URL,
      JSON.stringify({
        data: [
          {
            event_name: 'Lead',
            event_time: 1700000901,
            event_id: 'ev-1700000901',
            action_source: 'website',
            user_data: {
              ph: [PHONE_SHA256],
              grclid: 'grc_1',
              grcpid: 'cmp_2',
              gradid: 'ad_3',
            },
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const custom: Flow.StepExample = {
  title: 'Custom event',
  description:
    'Any mapped name that is not a Gravity standard event is sent as a custom event with that name.',
  in: createEvent({
    name: 'demo booked',
    id: 'ev-1700000902',
    timestamp: 1700000902000,
    data: { user: 'user-42' },
  }),
  mapping: {
    name: 'demo_booked',
    data: { map: { external_id: 'data.user' } },
  },
  out: [
    [
      'sendServer',
      URL,
      JSON.stringify({
        data: [
          {
            event_name: 'demo_booked',
            event_time: 1700000902,
            event_id: 'ev-1700000902',
            action_source: 'website',
            user_data: { external_id: ['user-42'] },
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

/** A silent rule sends nothing to Gravity. */
export const silentRule: Flow.StepExample = {
  public: false,
  description: 'A rule with silent: true sends no request to Gravity.',
  in: getEvent('page view', { timestamp: 1700000990000 }),
  mapping: { silent: true },
  out: [],
};
