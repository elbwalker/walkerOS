import type { Flow } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';

/**
 * OpenAI Ads Conversions API step examples.
 *
 * At push time, the destination calls
 * `env.sendServer(endpoint, JSON.stringify(body), options)` where
 * `endpoint = ${settings.url}?pid=${settings.pixelId}` and
 * `body = { validate_only?, integration_source?, events: [conversion] }`.
 *
 * The test fixture pins `apiKey = 's3cr3t'` and `pixelId = 'px_abc123'`.
 *
 * Conversion keys are emitted in this order (insertion order matters for
 * `JSON.stringify` string equality): id, type, custom_event_name?,
 * timestamp_ms, oppref?, source_url, action_source, user?, data.
 *
 * `email`, `phone` and `external_id` are normalised and SHA-256 hashed into
 * `emails_sha256`, `phone_numbers_sha256` and `external_ids_sha256`.
 * `amount` is sent in integer minor units of `currency`.
 */
const ENDPOINT = 'https://bzr.openai.com/v1/events?pid=px_abc123';
const OPTIONS = {
  headers: {
    Authorization: 'Bearer s3cr3t',
    'Content-Type': 'application/json',
  },
};
const SOURCE = {
  type: 'express',
  platform: 'server',
  url: 'https://shop.example.com/checkout/complete',
};

// sha256('jane@example.com'), sha256('user-42')
const EMAIL_SHA256 =
  '8c87b489ce35cf2e2f39f80e282cb2e804932a56a213983eeeb428407d43b52d';
const EXTERNAL_ID_SHA256 =
  '6d894aa3ee802549d7f340e7c1cf0d1c1cb14cd84f768d92ffaa6785337c4997';

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'A completed order is sent to OpenAI Ads as order_created with the amount in minor units, the hashed email and the oppref click reference.',
  in: getEvent('order complete', {
    id: 'ev-1700000900',
    timestamp: 1700000900000,
    data: {
      id: 'ORD-300',
      total: 249.99,
      currency: 'eur',
      email: ' Jane@Example.com ',
      oppref: 'opp_7f3a',
    },
    source: SOURCE,
  }),
  mapping: {
    name: 'order_created',
    data: {
      map: {
        amount: 'data.total',
        currency: 'data.currency',
        email: 'data.email',
        oppref: 'data.oppref',
      },
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        events: [
          {
            id: 'ev-1700000900',
            type: 'order_created',
            timestamp_ms: 1700000900000,
            oppref: 'opp_7f3a',
            source_url: 'https://shop.example.com/checkout/complete',
            action_source: 'web',
            user: { emails_sha256: [EMAIL_SHA256] },
            data: { type: 'contents', amount: 24999, currency: 'EUR' },
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
    'A demo request form is sent to OpenAI Ads as lead_created with the hashed email.',
  in: createEvent({
    name: 'form submit',
    id: 'ev-1700000901',
    timestamp: 1700000901000,
    data: { type: 'demo', email: 'jane@example.com' },
    source: { ...SOURCE, url: 'https://shop.example.com/demo' },
  }),
  mapping: {
    name: 'lead_created',
    data: { map: { email: 'data.email' } },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        events: [
          {
            id: 'ev-1700000901',
            type: 'lead_created',
            timestamp_ms: 1700000901000,
            source_url: 'https://shop.example.com/demo',
            action_source: 'web',
            user: { emails_sha256: [EMAIL_SHA256] },
            data: { type: 'customer_action' },
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const registration: Flow.StepExample = {
  title: 'Registration',
  description:
    'A sign-up is sent to OpenAI Ads as registration_completed with the hashed user id as external id.',
  in: createEvent({
    name: 'user register',
    id: 'ev-1700000902',
    timestamp: 1700000902000,
    data: { id: 'user-42' },
    source: { ...SOURCE, url: 'https://shop.example.com/signup' },
  }),
  mapping: {
    name: 'registration_completed',
    data: { map: { external_id: 'data.id' } },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        events: [
          {
            id: 'ev-1700000902',
            type: 'registration_completed',
            timestamp_ms: 1700000902000,
            source_url: 'https://shop.example.com/signup',
            action_source: 'web',
            user: { external_ids_sha256: [EXTERNAL_ID_SHA256] },
            data: { type: 'customer_action' },
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const subscription: Flow.StepExample = {
  title: 'Subscription',
  description:
    'A paid subscription is sent to OpenAI Ads as subscription_created with its plan and amount.',
  in: createEvent({
    name: 'subscription start',
    id: 'ev-1700000903',
    timestamp: 1700000903000,
    data: { plan: 'business_yearly', price: 990, currency: 'USD' },
    source: { ...SOURCE, url: 'https://shop.example.com/billing' },
  }),
  mapping: {
    name: 'subscription_created',
    data: {
      map: {
        plan_id: 'data.plan',
        amount: 'data.price',
        currency: 'data.currency',
      },
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        events: [
          {
            id: 'ev-1700000903',
            type: 'subscription_created',
            timestamp_ms: 1700000903000,
            source_url: 'https://shop.example.com/billing',
            action_source: 'web',
            data: {
              type: 'plan_enrollment',
              amount: 99000,
              currency: 'USD',
              plan_id: 'business_yearly',
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
    'A mapped name that is not a standard type is sent as a custom event with that name.',
  in: createEvent({
    name: 'demo booked',
    id: 'ev-1700000904',
    timestamp: 1700000904000,
    data: {},
    source: { ...SOURCE, url: 'https://shop.example.com/demo/booked' },
  }),
  mapping: { name: 'demo_booked' },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        events: [
          {
            id: 'ev-1700000904',
            type: 'custom',
            custom_event_name: 'demo_booked',
            timestamp_ms: 1700000904000,
            source_url: 'https://shop.example.com/demo/booked',
            action_source: 'web',
            data: { type: 'custom' },
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

/** A silent rule sends nothing to OpenAI Ads. */
export const silentRule: Flow.StepExample = {
  public: false,
  description: 'A rule with silent: true sends no request to OpenAI Ads.',
  in: getEvent('page view', { timestamp: 1700000990000 }),
  mapping: { silent: true },
  out: [],
};
