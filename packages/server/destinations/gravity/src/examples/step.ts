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
 * custom_data?. `email`, `phone`, `first_name` and `last_name` are normalised
 * and SHA-256 hashed into `em`, `ph`, `fn` and `ln`; a mapped `user_data`
 * object (the Gravity pixel's) and the click parameters go to `user_data` as
 * they are.
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
    'A completed order is sent to Gravity as a Purchase with value, currency, the hashed email, the Gravity click id and the order id, also as event id for deduplication.',
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
        event_id: 'data.id',
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
            event_id: 'ORD-300',
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

// What the Gravity pixel's getCAPIData() returns in the browser, sent along
// with the event.
const CAPI_USER_DATA = {
  grclid: 'grc_7f3a',
  grcpid: 'cmp_2',
  grpuid: 'pub_5',
  gradid: 'ad_3',
  grsig: 'sig_9b1e',
  graid: 'gra_4',
  visitor_id: 'vis_81c2',
  session_id: 'ses_42',
  client_user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
};
const CAPI_CLIENT_CONTEXT = {
  timezone: 'Europe/Berlin',
  screen: '1920x1080',
  viewport: '1440x900',
  platform: 'MacIntel',
  connection: '4g',
};

export const pixel: Flow.StepExample = {
  title: 'Purchase with the Gravity pixel',
  description:
    "The user_data and client_context of the Gravity pixel's getCAPIData(), sent along with the order, reach Gravity unchanged; the email is added hashed.",
  in: getEvent('order complete', {
    id: 'ev-1700000903',
    timestamp: 1700000903000,
    data: {
      id: 'ORD-301',
      total: 99,
      currency: 'EUR',
      gravity: {
        user_data: CAPI_USER_DATA,
        client_context: CAPI_CLIENT_CONTEXT,
      },
    },
    user: { email: 'Jane@Example.com' },
  }),
  mapping: {
    name: 'Purchase',
    data: {
      map: {
        user_data: 'data.gravity.user_data',
        client_context: 'data.gravity.client_context',
        email: 'user.email',
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
            event_time: 1700000903,
            event_id: 'ev-1700000903',
            action_source: 'website',
            user_data: { ...CAPI_USER_DATA, em: [EMAIL_SHA256] },
            client_context: CAPI_CLIENT_CONTEXT,
            custom_data: { value: 99, currency: 'EUR', order_id: 'ORD-301' },
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

/** Gravity rejects the event in an HTTP 200 answer. */
export const rejected: Flow.StepExample = {
  public: false,
  title: 'Rejected by Gravity',
  description:
    'Gravity answers HTTP 200 with the status error for the event: the push fails with transport, not retryable, and the event goes to the dead-letter queue. Test mode checks each event at once; a live request answers accepted and Gravity processes the event later.',
  in: getEvent('order complete', {
    id: 'ev-1700000991',
    timestamp: 1700000991000,
  }),
  mapping: { name: 'Purchase' },
  respond: {
    status: 200,
    body: {
      events_received: 1,
      events_processed: 0,
      events_errored: 1,
      results: [
        {
          event_id: 'ev-1700000991',
          status: 'error',
          attributed: false,
          error: 'Invalid event',
        },
      ],
      test_mode: true,
    },
  },
  outcome: { status: 'failed', code: 'transport', retryable: false },
};

/** A negative value is not sent. */
export const invalidValue: Flow.StepExample = {
  public: false,
  title: 'Invalid value',
  description:
    'A value that is negative or not a number fails the push with missing-input, not retryable, and nothing is sent.',
  in: getEvent('order complete', {
    id: 'ev-1700000992',
    timestamp: 1700000992000,
    data: { total: -5 },
  }),
  mapping: { name: 'Purchase', data: { map: { value: 'data.total' } } },
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

/** A currency that is not a 3-letter code is not sent. */
export const invalidCurrency: Flow.StepExample = {
  public: false,
  title: 'Invalid currency',
  description:
    'A currency that is not a 3-letter ISO 4217 code fails the push with missing-input, not retryable, and nothing is sent, so Gravity never books the value as USD.',
  in: getEvent('order complete', {
    id: 'ev-1700000993',
    timestamp: 1700000993000,
    data: { total: 10, currency: 'euro' },
  }),
  mapping: {
    name: 'Purchase',
    data: { map: { value: 'data.total', currency: 'data.currency' } },
  },
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

/** An action_source Gravity does not list is not sent. */
export const invalidActionSource: Flow.StepExample = {
  public: false,
  title: 'Invalid action source',
  description:
    "A mapped action_source that is not one of Gravity's values fails the push with missing-input, not retryable, and nothing is sent.",
  in: getEvent('order complete', {
    id: 'ev-1700000994',
    timestamp: 1700000994000,
  }),
  mapping: {
    name: 'Purchase',
    data: { map: { action_source: { value: 'store' } } },
  },
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};
