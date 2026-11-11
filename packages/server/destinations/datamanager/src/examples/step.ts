import type { Flow } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';

/**
 * Google Data Manager step examples.
 *
 * At push time, the destination calls
 * `env.sendServer(url, body, { headers, timeout })` where:
 *   - `url` is `${settings.url}/events:ingest` (default
 *     `https://datamanager.googleapis.com/v1`)
 *   - `body` is the JSON-stringified `{ events: [dataManagerEvent], destinations }` payload
 *   - `headers` are the ones `env.authClient.getRequestHeaders()` returns,
 *     as a plain object (`sendServer` posts and adds the JSON content type)
 *   - `timeout` is the destination's `config.timeout`, or the collector's
 *     default of 10000 ms
 *
 * The example env's auth client answers a fixed token, so the captured
 * header is stable (`authorization: 'Bearer ya29.c.test_token'`).
 *
 * Event fields are emitted in the order the destination constructs them
 * (insertion order matters for `JSON.stringify` string equality):
 *   eventTimestamp, transactionId?, clientId?, userId?, userData?,
 *   adIdentifiers?, conversionValue?, currency?, cartData?, eventName?,
 *   [eventSource is appended last by push.ts when not already present].
 *
 * Emails are normalized (whitespace removed, lowercase; gmail.com and
 * googlemail.com addresses drop their dots and their +alias) and hashed
 * with SHA-256. A value that already is a SHA-256 digest passes lowercased,
 * not hashed again.
 */
const ENDPOINT = 'https://datamanager.googleapis.com/v1/events:ingest';
const DESTINATIONS = [
  {
    operatingAccount: {
      accountId: '1234567890',
      accountType: 'GOOGLE_ADS',
    },
    productDestinationId: '987654321',
  },
];
const SEND_OPTIONS = {
  headers: { authorization: 'Bearer ya29.c.test_token' },
  timeout: 10000,
};

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'A completed order is posted to Google Data Manager as a purchase conversion with hashed user identifiers.',
  in: getEvent('order complete', {
    id: 'ev-1700000900000',
    timestamp: 1700000900000,
    data: { id: 'ORD-600', value: 149.99, currency: 'EUR' },
    user: { id: 'user-abc', email: 'buyer@example.com' },
    source: { type: 'express', platform: 'server' },
  }),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        transactionId: 'data.id',
        conversionValue: 'data.value',
        currency: { key: 'data.currency', value: 'USD' },
        eventName: { value: 'purchase' },
        userId: 'user.id',
        email: 'user.email',
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
            eventTimestamp: '2023-11-14T22:28:20.000Z',
            transactionId: 'ORD-600',
            userId: 'user-abc',
            userData: {
              userIdentifiers: [
                {
                  // sha256('buyer@example.com')
                  emailAddress:
                    '6a6c26195c3682faa816966af789717c3bfa834eee6c599d667d2b3429c27cfd',
                },
              ],
            },
            conversionValue: 149.99,
            currency: 'EUR',
            eventName: 'purchase',
            eventSource: 'WEB',
          },
        ],
        destinations: DESTINATIONS,
        encoding: 'HEX',
      }),
      SEND_OPTIONS,
    ],
  ],
};

export const lead: Flow.StepExample = {
  title: 'Lead',
  description:
    'A demo request form submission is sent to Data Manager as a generate_lead conversion with a hashed email.',
  in: createEvent({
    name: 'form submit',
    id: 'ev-1700000901000',
    timestamp: 1700000901000,
    data: { type: 'demo-request' },
    user: { email: 'prospect@example.com' },
    source: { type: 'express', platform: 'server' },
  }),
  mapping: {
    name: 'generate_lead',
    data: {
      map: {
        transactionId: 'id',
        eventName: { value: 'generate_lead' },
        conversionValue: { value: 10 },
        currency: { value: 'USD' },
        email: 'user.email',
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
            eventTimestamp: '2023-11-14T22:28:21.000Z',
            transactionId: 'ev-1700000901000',
            userData: {
              userIdentifiers: [
                {
                  // sha256('prospect@example.com')
                  emailAddress:
                    '395ec5f334be0ab5b28568a1e7f6ed5ea80e443fb1ce3d803340586a3df46642',
                },
              ],
            },
            conversionValue: 10,
            currency: 'USD',
            eventName: 'generate_lead',
            eventSource: 'WEB',
          },
        ],
        destinations: DESTINATIONS,
        encoding: 'HEX',
      }),
      SEND_OPTIONS,
    ],
  ],
};

/** A silent rule sends nothing to the Data Manager API. */
export const silentRule: Flow.StepExample = {
  public: false,
  description:
    'A rule with silent: true sends no request to the Data Manager API.',
  in: getEvent('page view', { timestamp: 1700000990000 }),
  mapping: { silent: true },
  out: [],
};

/**
 * No transaction id: an order complete event without data has no
 * transactionId, which a Google Ads destination requires, so the push fails
 * with missing-input instead of counting as delivered.
 */
export const orderWithoutTransactionId: Flow.StepExample = {
  public: false,
  description:
    'An order complete event without a transaction id cannot be sent for a Google Ads destination: the push fails with missing-input instead of counting as delivered.',
  in: {
    name: 'order complete',
    entity: 'order',
    action: 'complete',
    timestamp: 1700000991000,
  },
  out: [],
  outcome: { status: 'failed', code: 'missing-input', retryable: false },
};

/** Google refuses the request: the answer names the reason and the field. */
export const refusedRequest: Flow.StepExample = {
  public: false,
  description:
    "Google refuses the request, for example a customer ID with hyphens: the push fails, is not retried, and the ERROR line names Google's reason and field.",
  in: purchase.in,
  mapping: purchase.mapping,
  respond: {
    status: 400,
    body: {
      error: {
        code: 400,
        message: 'Request contains an invalid argument.',
        status: 'INVALID_ARGUMENT',
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.BadRequest',
            fieldViolations: [
              {
                field: 'destinations[0].login_account.account_id',
                description: 'String is not a valid number.',
                reason: 'INVALID_NUMBER_FORMAT',
              },
            ],
          },
        ],
      },
    },
  },
  outcome: { status: 'failed', code: 'transport', retryable: false },
};

/** Google's documented 429 for the per-minute project quota. */
export const quotaExhausted: Flow.StepExample = {
  public: false,
  description:
    "Google's per-minute quota for the project is used up: the push fails and may be redelivered; the ERROR line names the quota.",
  in: purchase.in,
  mapping: purchase.mapping,
  respond: {
    status: 429,
    body: {
      error: {
        code: 429,
        status: 'RESOURCE_EXHAUSTED',
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            reason: 'RATE_LIMIT_EXCEEDED',
            metadata: {
              quota_limit: 'IngestionMutateRequestsPerMinutePerProject',
            },
          },
        ],
      },
    },
  },
  outcome: { status: 'failed', code: 'transport', retryable: true },
};
