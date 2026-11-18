import type { Flow } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';

/**
 * Reditus step examples.
 *
 * At push time, the destination calls
 * `env.sendServer(endpoint, JSON.stringify(body), options)` once:
 * - conversion: `POST <url>/v2/tracking/conversion` with
 *   `{ affiliate_slug?, advocate_slug?, email?, uid?, gr_id? }`;
 * - payment: `POST <url>/v1/payments` with `{ idempotency_key, amount
 *   (cents), currency, referral_uid?, referral_email?, subscription_id?,
 *   interval?, interval_count? }`.
 *
 * The test fixture pins `apiKey = 's3cr3t'` and the default url.
 */
const URL = 'https://api.getreditus.com/api';
const OPTIONS = {
  headers: {
    Authorization: 'Bearer s3cr3t',
    'Content-Type': 'application/json',
  },
};

export const signUp: Flow.StepExample = {
  title: 'Referred sign-up',
  description:
    'A sign-up of a visitor who came through a Reditus link is sent as a conversion with the gr_id from the Reditus cookie.',
  in: createEvent({
    name: 'user register',
    id: 'ev-1700000900',
    timestamp: 1700000900000,
    data: { id: 'cus_42', email: 'jane@example.com', gr_id: 'gr_7f3a' },
  }),
  mapping: {
    data: {
      map: { uid: 'data.id', email: 'data.email', gr_id: 'data.gr_id' },
    },
  },
  out: [
    [
      'sendServer',
      `${URL}/v2/tracking/conversion`,
      JSON.stringify({
        email: 'jane@example.com',
        uid: 'cus_42',
        gr_id: 'gr_7f3a',
      }),
      OPTIONS,
    ],
  ],
};

export const affiliateSlug: Flow.StepExample = {
  title: 'Conversion by affiliate slug',
  description:
    'A demo request with the affiliate slug kept from the landing URL is sent as a conversion.',
  in: createEvent({
    name: 'form submit',
    id: 'ev-1700000901',
    timestamp: 1700000901000,
    data: { type: 'demo', email: 'jane@example.com', ref: 'partner-x' },
  }),
  mapping: {
    data: { map: { email: 'data.email', affiliate_slug: 'data.ref' } },
  },
  out: [
    [
      'sendServer',
      `${URL}/v2/tracking/conversion`,
      JSON.stringify({
        affiliate_slug: 'partner-x',
        email: 'jane@example.com',
      }),
      OPTIONS,
    ],
  ],
};

export const payment: Flow.StepExample = {
  title: 'Payment',
  description:
    'A first subscription payment of a referred customer is sent as a Reditus payment in cents, keyed by the event id.',
  in: createEvent({
    name: 'subscription start',
    id: 'ev-1700000902',
    timestamp: 1700000902000,
    data: {
      customer: 'cus_42',
      subscription: 'sub_9',
      total: 99.9,
      currency: 'EUR',
      interval: 'year',
    },
  }),
  mapping: {
    settings: { type: 'payment' },
    data: {
      map: {
        uid: 'data.customer',
        amount: 'data.total',
        currency: 'data.currency',
        subscription_id: 'data.subscription',
        interval: 'data.interval',
        interval_count: { value: 1 },
      },
    },
  },
  out: [
    [
      'sendServer',
      `${URL}/v1/payments`,
      JSON.stringify({
        idempotency_key: 'ev-1700000902',
        amount: 9990,
        currency: 'eur',
        referral_uid: 'cus_42',
        subscription_id: 'sub_9',
        interval: 'year',
        interval_count: 1,
      }),
      OPTIONS,
    ],
  ],
};

/** A silent rule sends nothing to Reditus. */
export const silentRule: Flow.StepExample = {
  public: false,
  description: 'A rule with silent: true sends no request to Reditus.',
  in: getEvent('page view', { timestamp: 1700000990000 }),
  mapping: { silent: true },
  out: [],
};
