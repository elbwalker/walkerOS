import type { Flow } from '@walkeros/core';
import { createEvent, getEvent } from '@walkeros/core';

/**
 * GA4 Measurement Protocol step examples.
 *
 * At push time, the destination calls
 * `env.sendServer(endpoint, JSON.stringify(body), options)` where
 * `endpoint = ${settings.url}?measurement_id=...&api_secret=...` and
 * `body = { client_id, user_id?, timestamp_micros?, consent, events: [{ name, params }] }`.
 *
 * The test fixture pins `measurementId = 'G-TEST123'` and
 * `apiSecret = 's3cr3t'`. Example events are older than 72 hours, so
 * `timestamp_micros` is left out (GA4 would refuse it) and GA4 uses the
 * reception time.
 */
const ENDPOINT =
  'https://www.google-analytics.com/mp/collect?measurement_id=G-TEST123&api_secret=s3cr3t';
const OPTIONS = { headers: { 'Content-Type': 'application/json' } };
const DENIED = { ad_user_data: 'DENIED', ad_personalization: 'DENIED' };
const GRANTED = { ad_user_data: 'GRANTED', ad_personalization: 'GRANTED' };

export const purchase: Flow.StepExample = {
  title: 'Purchase',
  description:
    'A completed order joins the visitor GA4 session as a purchase with value, currency and transaction id; marketing consent grants the ad signals.',
  in: getEvent('order complete', {
    id: 'ev-1700000900',
    timestamp: 1700000900000,
    data: { id: 'ORD-300', total: 249.99, currency: 'EUR' },
    globals: {
      ga_client_id: '1234567890.1699990000',
      ga_session_id: '1699999000',
    },
    consent: { marketing: true },
  }),
  mapping: {
    name: 'purchase',
    data: {
      map: {
        client_id: 'globals.ga_client_id',
        session_id: 'globals.ga_session_id',
        params: {
          map: {
            value: 'data.total',
            currency: 'data.currency',
            transaction_id: 'data.id',
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
        client_id: '1234567890.1699990000',
        consent: GRANTED,
        events: [
          {
            name: 'purchase',
            params: {
              value: 249.99,
              currency: 'EUR',
              transaction_id: 'ORD-300',
              session_id: '1699999000',
              engagement_time_msec: 1,
            },
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const generateLead: Flow.StepExample = {
  title: 'Lead with user id',
  description:
    'A demo request is sent as generate_lead with the visitor GA4 client id and the signed-in user id.',
  in: createEvent({
    name: 'demo request',
    id: 'ev-1700000901',
    timestamp: 1700000901000,
    data: { location: 'hero' },
    user: { id: 'user-42' },
    globals: { ga_client_id: '1234567890.1699990000' },
  }),
  mapping: {
    name: 'generate_lead',
    data: {
      map: {
        client_id: 'globals.ga_client_id',
        user_id: 'user.id',
        params: { map: { location: 'data.location' } },
      },
    },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        client_id: '1234567890.1699990000',
        user_id: 'user-42',
        consent: DENIED,
        events: [
          {
            name: 'generate_lead',
            params: { location: 'hero', engagement_time_msec: 1 },
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

export const withoutClientId: Flow.StepExample = {
  title: 'Event without GA4 client id',
  description:
    'Without a _ga client id, a stable one is derived from the event id so the event still counts (as a new user) and a retry keeps the same id.',
  in: createEvent({
    name: 'user register',
    id: 'ev-1700000902',
    timestamp: 1700000902000,
    data: { method: 'email' },
  }),
  mapping: {
    name: 'sign_up',
    data: { map: { params: { map: { method: 'data.method' } } } },
  },
  out: [
    [
      'sendServer',
      ENDPOINT,
      JSON.stringify({
        client_id: '735042307.1700000902',
        consent: DENIED,
        events: [
          {
            name: 'sign_up',
            params: { method: 'email', engagement_time_msec: 1 },
          },
        ],
      }),
      OPTIONS,
    ],
  ],
};

/** A silent rule sends nothing to GA4. */
export const silentRule: Flow.StepExample = {
  public: false,
  description: 'A rule with silent: true sends no request to GA4.',
  in: getEvent('page view', { timestamp: 1700000990000 }),
  mapping: { silent: true },
  out: [],
};
