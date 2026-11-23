import type { Flow, WalkerOS } from '@walkeros/core';
import type { Rule } from '../types';
import { createEvent, getEvent } from '@walkeros/core';

/**
 * Reditus step examples.
 *
 * At push time, the destination calls
 * `env.sendServer(endpoint, JSON.stringify(body), options)` once:
 * - conversion: `POST <url>/v2/tracking/conversion` with
 *   `{ affiliate_slug?, advocate_slug?, email?, uid?, gr_id? }`;
 * - payment: `POST <url>/v1/payments` with `{ idempotency_key, amount
 *   (integer, minor units), currency, referral_uid?, referral_email?,
 *   subscription_id?, interval?, interval_count? }`.
 *
 * The test fixture pins `apiKey = 's3cr3t'` and the default url.
 */
export type StepExample = Flow.StepExample & {
  in: WalkerOS.Event;
  mapping?: Rule;
};

const URL = 'https://api.getreditus.com/api';
const OPTIONS = {
  headers: {
    Authorization: 'Bearer s3cr3t',
    'Content-Type': 'application/json',
  },
};
const MISSING_INPUT: Flow.StepOutcome = {
  status: 'failed',
  code: 'missing-input',
  retryable: false,
};
const TRANSPORT: Flow.StepOutcome = {
  status: 'failed',
  code: 'transport',
  retryable: false,
};

export const signUp: StepExample = {
  title: 'Referred sign-up',
  description:
    'A sign-up of a visitor who came through a partner link is sent as a conversion with the affiliate slug from the link, the gr_id from the Reditus cookie and your own customer id instead of the email.',
  in: createEvent({
    name: 'user register',
    id: 'ev-1700000900',
    timestamp: 1700000900000,
    data: { id: 'cus_42', affiliate: 'john', gr_id: 'gr_7f3a' },
  }),
  mapping: {
    data: {
      map: {
        uid: 'data.id',
        affiliate_slug: 'data.affiliate',
        gr_id: 'data.gr_id',
      },
    },
  },
  out: [
    [
      'sendServer',
      `${URL}/v2/tracking/conversion`,
      JSON.stringify({
        affiliate_slug: 'john',
        uid: 'cus_42',
        gr_id: 'gr_7f3a',
      }),
      OPTIONS,
    ],
  ],
};

export const affiliateSlug: StepExample = {
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

export const payment: StepExample = {
  title: 'Payment',
  description:
    "A first subscription payment of a referred customer is sent as a Reditus payment: the amount in cents as the event carries it, keyed by the payment processor's payment id.",
  in: createEvent({
    name: 'subscription start',
    id: 'ev-1700000902',
    timestamp: 1700000902000,
    data: {
      customer: 'cus_42',
      subscription: 'sub_9',
      payment: 'pay_7c1d',
      amount: 9900,
      currency: 'EUR',
      interval: 'year',
    },
  }),
  mapping: {
    settings: { type: 'payment' },
    data: {
      map: {
        uid: 'data.customer',
        idempotency_key: 'data.payment',
        amount: 'data.amount',
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
        idempotency_key: 'pay_7c1d',
        amount: 9900,
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
export const silentRule: StepExample = {
  public: false,
  description: 'A rule with silent: true sends no request to Reditus.',
  in: getEvent('page view', { timestamp: 1700000990000 }),
  mapping: { silent: true },
  out: [],
};

/* Answers outside 2xx that count as delivered, told apart by their body. */

export const referralExists: StepExample = {
  ...signUp,
  public: false,
  title: 'Referral already exists',
  description:
    'Reditus answers 409 "Referral already exists": the referral is there already, so the conversion counts as delivered.',
  respond: { status: 409, body: { error: 'Referral already exists' } },
};

export const paymentReplayed: StepExample = {
  ...payment,
  public: false,
  title: 'Payment sent again',
  description:
    'Reditus answers 400 "idempotency_key has already been taken" to a payment it already has: it counts as delivered.',
  respond: {
    status: 400,
    body: {
      errors: [{ details: { idempotency_key: ['has already been taken'] } }],
    },
  },
};

export const notReferred: StepExample = {
  ...payment,
  public: false,
  title: 'Customer not referred',
  description:
    'Reditus answers 404 "Referral not found" to a payment of a customer it has no referral for: it counts as delivered and is reported at WARN, since a uid or email mapped from the wrong field gets the same answer.',
  respond: {
    status: 404,
    body: { errors: [{ details: 'Referral not found' }] },
  },
};

/* Answers that fail: the status alone is never enough. */

export const otherConflict: StepExample = {
  ...signUp,
  public: false,
  title: 'Other 409',
  description:
    'A conversion answered 409 without the body "Referral already exists" fails with transport, not retryable, and the event goes to the dead-letter queue.',
  respond: { status: 409, body: { error: 'Conflict' } },
  outcome: TRANSPORT,
};

export const paymentNotFound: StepExample = {
  ...payment,
  public: false,
  title: 'Payment answered 404 by something else',
  description:
    'A payment answered 404 without the body "Referral not found", for example from a url without /api, fails with transport, not retryable, and the event goes to the dead-letter queue.',
  respond: { status: 404 },
  outcome: TRANSPORT,
};

export const paymentRefused: StepExample = {
  ...payment,
  public: false,
  title: 'Payment refused',
  description:
    'Reditus answers 400 to a payment with a validation error, for a rejected or expired referral, or for a terminated partnership: the payment fails with transport, not retryable, and the event goes to the dead-letter queue.',
  respond: { status: 400 },
  outcome: TRANSPORT,
};

/* Events Reditus cannot take: nothing is sent, the push fails. */

/** An event the rule of `target` cannot turn into a Reditus call. */
function unsendable(
  target: StepExample,
  event: WalkerOS.Event,
  title: string,
  description: string,
): StepExample {
  return {
    public: false,
    title,
    description,
    in: event,
    mapping: target.mapping,
    out: [],
    outcome: MISSING_INPUT,
  };
}

/** The event without user, data, globals and context. */
const bare = (event: WalkerOS.Event): WalkerOS.Event => ({
  ...event,
  data: {},
  user: {},
  globals: {},
  context: {},
});

export const signUpWithoutCustomer = unsendable(
  signUp,
  bare(signUp.in),
  'Sign-up without uid or email',
  'Reditus needs a uid or an email for a conversion: a sign-up whose rule resolves neither fails with missing-input, and nothing is sent.',
);

export const signUpWithoutSlug = unsendable(
  signUp,
  { ...signUp.in, data: { id: 'cus_42', gr_id: 'gr_7f3a' } },
  'Conversion without a slug',
  "Reditus needs the partner's affiliate_slug or advocate_slug for a conversion: a sign-up with only the gr_id cookie fails with missing-input, and nothing is sent.",
);

export const demoWithoutCustomer = unsendable(
  affiliateSlug,
  bare(affiliateSlug.in),
  'Demo request without uid or email',
  'A demo request whose rule resolves neither a uid nor an email fails with missing-input, and nothing is sent.',
);

export const paymentWithoutCustomer = unsendable(
  payment,
  bare(payment.in),
  'Payment without uid or email',
  'Reditus needs a uid or an email to find the referral of a payment: a payment whose rule resolves neither fails with missing-input, and nothing is sent.',
);

export const paymentWithoutKey = unsendable(
  payment,
  {
    ...payment.in,
    data: { customer: 'cus_42', amount: 9900, currency: 'EUR' },
  },
  'Payment without idempotency_key',
  "Reditus needs an idempotency_key for every payment, to never credit it twice and to match a refund later: a payment without one fails with missing-input. Map your payment processor's payment id.",
);

export const paymentAmountInUnits = unsendable(
  payment,
  {
    ...payment.in,
    data: {
      customer: 'cus_42',
      payment: 'pay_7c1d',
      amount: 99.9,
      currency: 'EUR',
    },
  },
  'Payment amount not in minor units',
  'Reditus takes the amount as an integer in minor units (cents): an amount such as 99.9 fails with missing-input instead of being rounded or converted.',
);

export const paymentWithoutCurrency = unsendable(
  payment,
  {
    ...payment.in,
    data: { customer: 'cus_42', payment: 'pay_7c1d', amount: 9900 },
  },
  'Payment without currency',
  'Reditus needs the currency of a payment and has no default: a payment without one fails with missing-input, and nothing is sent.',
);
