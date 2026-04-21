import type { Flow } from '@walkeros/core';
import { getEvent } from '@walkeros/core';

/**
 * Google Data Manager step examples.
 *
 * At push time, the destination calls
 * `env.fetch(url, { method, headers, body })` where:
 *   - `url` is `${settings.url}/events:ingest` (default
 *     `https://datamanager.googleapis.com/v1`)
 *   - `method` is `'POST'`
 *   - `headers` is `{ Authorization: 'Bearer <accessToken>', 'Content-Type': 'application/json' }`
 *   - `body` is the JSON-stringified `{ events: [dataManagerEvent], destinations }` payload
 *
 * The access token is obtained from `env.authClient` via `getAccessToken`.
 * The test fixture mocks both so the captured Authorization header is stable
 * (`Bearer ya29.c.test_token`).
 *
 * Event fields are emitted in the order the destination constructs them
 * (insertion order matters for `JSON.stringify` string equality):
 *   eventTimestamp, transactionId?, clientId?, userId?, userData?,
 *   adIdentifiers?, conversionValue?, currency?, cartData?, eventName?,
 *   [eventSource is appended last by push.ts when not already present].
 *
 * Emails are normalized (trim, lowercase, strip dots for Gmail) and hashed
 * with SHA-256.
 */
const ENDPOINT = 'https://datamanager.googleapis.com/v1/events:ingest';
const DESTINATIONS = [
  {
    operatingAccount: {
      accountId: '123-456-7890',
      accountType: 'GOOGLE_ADS',
    },
    productDestinationId: 'AW-CONVERSION-123',
  },
];
const INIT_OPTIONS = (body: string) => ({
  method: 'POST',
  headers: {
    Authorization: 'Bearer ya29.c.test_token',
    'Content-Type': 'application/json',
  },
  body,
});

export const purchase: Flow.StepExample = {
  in: getEvent('order complete', {
    timestamp: 1700000900000,
    data: { id: 'ORD-600', total: 149.99, currency: 'EUR' },
    user: { id: 'user-abc', email: 'buyer@example.com' },
    source: { type: 'server', id: '', previous_id: '' },
  }),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        transactionId: 'data.id',
        conversionValue: 'data.total',
        currency: { key: 'data.currency', value: 'USD' },
        eventName: { value: 'purchase' },
        userId: 'user.id',
        email: 'user.email',
      },
    },
  },
  out: [
    [
      'fetch',
      ENDPOINT,
      INIT_OPTIONS(
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
        }),
      ),
    ],
  ],
};

export const lead: Flow.StepExample = {
  in: getEvent('form submit', {
    timestamp: 1700000901000,
    data: { type: 'demo-request' },
    user: { email: 'prospect@example.com' },
    source: { type: 'server', id: '', previous_id: '' },
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
      'fetch',
      ENDPOINT,
      INIT_OPTIONS(
        JSON.stringify({
          events: [
            {
              eventTimestamp: '2023-11-14T22:28:21.000Z',
              transactionId: '1700000901000-gr0up-1',
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
        }),
      ),
    ],
  ],
};

export const ga4PageView: Flow.StepExample = {
  in: getEvent('page view', {
    timestamp: 1700000902000,
    data: { title: 'Pricing', url: 'https://example.com/pricing' },
    user: { id: 'visitor-55' },
    source: { type: 'server', id: '', previous_id: '' },
  }),
  mapping: {
    name: 'page_view',
    data: {
      map: {
        transactionId: 'id',
        eventName: { value: 'page_view' },
        userId: 'user.id',
      },
    },
  },
  out: [
    [
      'fetch',
      ENDPOINT,
      INIT_OPTIONS(
        JSON.stringify({
          events: [
            {
              eventTimestamp: '2023-11-14T22:28:22.000Z',
              transactionId: '1700000902000-gr0up-1',
              userId: 'visitor-55',
              eventName: 'page_view',
              eventSource: 'WEB',
            },
          ],
          destinations: DESTINATIONS,
        }),
      ),
    ],
  ],
};
