import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * X (Twitter) Conversions API step examples.
 *
 * At push time, the destination calls
 * `env.sendServer(url, body, { headers })` where:
 *   - `url` is `${settings.url}${apiVersion}/measurement/conversions/${pixelId}`
 *   - `body` is the JSON-stringified `{ conversions: [conversion] }` payload
 *   - `headers` is `{ Authorization: '<OAuth-1.0a>', 'Content-Type': 'application/json' }`
 *
 * The test fixture pins `pixelId = 'o8z6j'`, `eventId = 'tw-o8z6j-o8z21'`.
 * OAuth 1.0a signing is non-deterministic (nonce + timestamp), so the test
 * normalizes the `Authorization` header to a stable marker before comparing.
 *
 * Body fields are emitted in the order the destination constructs them
 * (insertion order matters for `JSON.stringify` string equality):
 *   conversion_time, event_id, identifiers, conversion_id, value? (string).
 *
 * Emails are normalized (trim + lowercase) and hashed with SHA-256.
 */
const ENDPOINT = 'https://ads-api.x.com/12/measurement/conversions/o8z6j';
const HEADERS = {
  headers: {
    Authorization: '<OAUTH_SIGNATURE>',
    'Content-Type': 'application/json',
  },
};

export const purchase: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000900000,
    data: { total: 249.99, currency: 'EUR' },
    user: { email: 'jane@example.com' },
    source: { type: 'server', id: 'https://shop.example.com', previous_id: '' },
  }),
  mapping: {
    settings: {
      value: 'data.total',
      currency: { key: 'data.currency', value: 'EUR' },
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        conversions: [
          {
            conversion_time: '2023-11-14T22:28:20.000Z',
            event_id: 'tw-o8z6j-o8z21',
            identifiers: [
              {
                hashed_email:
                  '8c87b489ce35cf2e2f39f80e282cb2e804932a56a213983eeeb428407d43b52d',
              },
            ],
            conversion_id: '1700000900000-gr0up-1',
            value: '249.99',
          },
        ],
      }),
      HEADERS,
    ],
  ],
};

export const lead: Flow.StepExample = {
  in: getEvent('form submit', {
    timestamp: 1700000901000,
    user: { email: 'user@example.com' },
    source: { type: 'server', id: 'https://example.com', previous_id: '' },
  }),
  mapping: undefined,
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        conversions: [
          {
            conversion_time: '2023-11-14T22:28:21.000Z',
            event_id: 'tw-o8z6j-o8z21',
            identifiers: [
              {
                hashed_email:
                  'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
              },
            ],
            conversion_id: '1700000901000-gr0up-1',
          },
        ],
      }),
      HEADERS,
    ],
  ],
};

export const purchaseWithTwclid: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000902000,
    data: { total: 89.99, currency: 'USD' },
    user: { email: 'buyer@co.com' },
    context: { twclid: ['23opevjt88psuo13lu8d020qkn', 0] },
    source: { type: 'server', id: 'https://shop.example.com', previous_id: '' },
  }),
  mapping: {
    settings: {
      value: 'data.total',
      currency: { key: 'data.currency', value: 'USD' },
    },
    data: {
      map: {
        user_data: {
          map: {
            twclid: 'context.twclid',
          },
        },
      },
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        conversions: [
          {
            conversion_time: '2023-11-14T22:28:22.000Z',
            event_id: 'tw-o8z6j-o8z21',
            identifiers: [
              {
                hashed_email:
                  '484c39bfb51212665d9673805c112b5ba04cbf0460b6d3f00bcdc18b92afed66',
              },
              { twclid: '23opevjt88psuo13lu8d020qkn' },
            ],
            conversion_id: '1700000902000-gr0up-1',
            value: '89.99',
          },
        ],
      }),
      HEADERS,
    ],
  ],
};
