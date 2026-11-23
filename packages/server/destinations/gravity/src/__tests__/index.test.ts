import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { createEvent, createIngest, Logger } from '@walkeros/core';
import { destinationGravity } from '..';
import type { Env, Settings } from '../types';

interface Run {
  data?: WalkerOS.Properties;
  settings?: Partial<Settings>;
  ingest?: Record<string, unknown>;
  event?: WalkerOS.DeepPartialEvent;
}

/**
 * What Gravity receives on a real collector when each key of the event data
 * is mapped to the data key of the same name, and the ERROR lines written.
 * The client IP and user agent are off unless a run sets them.
 */
async function send({ data = {}, settings = {}, ingest, event = {} }: Run) {
  const requests: Array<{ url: string; body: string }> = [];
  const errors: unknown[] = [];
  const env: Env = {
    sendServer: async (url, body) => {
      requests.push({ url, body: String(body) });
      return { data: { results: [{ status: 'accepted' }] } };
    },
  };
  const { collector } = await startFlow({
    logger: {
      handler: (level, message, context) => {
        if (level === Logger.Level.ERROR) errors.push([message, context]);
      },
    },
    destinations: {
      gravity: {
        code: destinationGravity,
        config: {
          settings: {
            apiKey: 's3cr3t',
            ip: false,
            userAgent: false,
            ...settings,
          },
          mapping: {
            order: {
              complete: {
                name: 'Purchase',
                data: {
                  map: Object.fromEntries(
                    Object.keys(data).map((key) => [key, `data.${key}`]),
                  ),
                },
              },
            },
          },
        },
        env,
      },
    },
  });
  const result = await collector.push(
    createEvent({
      name: 'order complete',
      id: 'ev-1',
      timestamp: 1700000900500,
      source: {
        type: 'express',
        platform: 'server',
        url: 'https://shop.example.com/x',
      },
      ...event,
      data,
    }),
    ingest ? { ingest: { ...createIngest('test'), ...ingest } } : undefined,
  );
  await collector.command('shutdown');

  expect(result.ok).toBe(true);
  const body = JSON.parse(requests[0].body);
  return { url: requests[0].url, body, conversion: body.data[0], errors };
}

// sha256 digests, computed outside the code under test.
const EMAIL =
  '8c87b489ce35cf2e2f39f80e282cb2e804932a56a213983eeeb428407d43b52d'; // jane@example.com
const PHONE =
  'd6736136ea896c1bfdc553e0e86e702c70d060d805696ca3e4e9e0961353860a'; // 15551234567
const JANE = '81f8f6dde88365f3928796ec7aa53f72820b06db8664f5fe76a7eb13e24546a2'; // jane
const DOE = '799ef92a11af918e3fb741df42934f3b568ed2d93ac1df74f1b8d41a27932a6f'; // doe
const EMAIL_OF_EMAIL =
  '6a2f1064f0f8a66b4c42208204fe233d14bd6fc181f718270e4d136c38709da0'; // EMAIL hashed as an email

// What the Gravity pixel's getCAPIData() returns as user_data.
const PIXEL = {
  grclid: 'grc_1',
  grcpid: 'cmp_2',
  grpuid: 'pub_3',
  gradid: 'ad_4',
  grsig: 'sig_5',
  graid: 'gra_6',
  oppref: 'ref_7',
  visitor_id: 'vis_8',
  session_id: 'ses_9',
  client_user_agent: 'Mozilla/5.0 pixel',
};

describe('Gravity user_data hashing', () => {
  it.each<[string, WalkerOS.Properties, Settings['doNotHash'], object]>([
    [
      'email is trimmed and lowercased',
      { email: ' Jane@Example.com ' },
      undefined,
      { em: [EMAIL] },
    ],
    [
      "phone keeps only digits: Gravity's three forms hash the same",
      { phone: ['+1 (555) 123-4567', '15551234567', '+15551234567'] },
      undefined,
      { ph: [PHONE, PHONE, PHONE] },
    ],
    [
      'names are trimmed and lowercased',
      { first_name: ' Jane ', last_name: 'DOE' },
      undefined,
      { fn: JANE, ln: DOE },
    ],
    [
      'a value that looks like a digest is hashed',
      { email: EMAIL },
      undefined,
      { em: [EMAIL_OF_EMAIL] },
    ],
    [
      'doNotHash sends the digest as mapped',
      { email: EMAIL },
      ['em'],
      { em: [EMAIL] },
    ],
    [
      'empty values are left out',
      { email: '', phone: '()', first_name: ' ' },
      undefined,
      {},
    ],
    [
      'external_id is a list of text, not hashed',
      { external_id: ['user-1', 7] },
      undefined,
      { external_id: ['user-1', '7'] },
    ],
  ])('%s', async (_, data, doNotHash, expected) => {
    const { conversion, errors } = await send({
      data,
      settings: { doNotHash },
    });
    expect(conversion.user_data).toEqual(expected);
    expect(errors).toEqual([]);
  });
});

describe("Gravity pixel's user_data", () => {
  it.each<[string, Run, object]>([
    ['is sent unchanged', { data: { user_data: PIXEL } }, PIXEL],
    [
      'em in it is hashed',
      { data: { user_data: { em: 'Jane@Example.com' } } },
      { em: [EMAIL] },
    ],
    [
      'its click parameters win over mapped ones, which fill the rest',
      {
        data: {
          user_data: { grclid: 'p1', grsig: 'p2' },
          grclid: 'm1',
          grcpid: 'm2',
        },
      },
      { grclid: 'p1', grsig: 'p2', grcpid: 'm2' },
    ],
    [
      'a mapped user agent wins over its user agent',
      {
        data: {
          user_data: { client_user_agent: 'pixel' },
          user_agent: 'mapped',
        },
      },
      { client_user_agent: 'mapped' },
    ],
    [
      'its user agent wins over ingest',
      {
        data: { user_data: { client_user_agent: 'pixel' } },
        settings: { userAgent: undefined },
        ingest: { userAgent: 'ingest' },
      },
      { client_user_agent: 'pixel' },
    ],
  ])('%s', async (_, run, expected) => {
    const { conversion, errors } = await send(run);
    expect(conversion.user_data).toEqual(expected);
    expect(errors).toEqual([]);
  });
});

describe('Gravity left out values', () => {
  it.each<[string, WalkerOS.Properties, object, string]>([
    [
      'a data key Gravity does not know',
      { emial: 'jane@example.com', grclid: 'g' },
      { grclid: 'g' },
      'Gravity left out emial (not a Gravity field)',
    ],
    [
      'a user_data key Gravity does not know',
      { user_data: { grclid: 'g', email: 'jane@example.com' } },
      { grclid: 'g' },
      'Gravity left out user_data.email (not a Gravity user_data key)',
    ],
    [
      'a list where Gravity takes one value',
      { first_name: ['Jane', 'Joan'], last_name: 'Doe' },
      { ln: DOE },
      'Gravity left out user_data.fn (a list, Gravity takes one value)',
    ],
    [
      'values of the wrong type',
      {
        user_data: 'grc_1',
        visitor_id: { id: 1 },
        client_context: 'Europe/Berlin',
        contents: 'p1',
        predicted_ltv: 'high',
      },
      {},
      'Gravity left out contents (not a list of objects), predicted_ltv (not a number), user_data (not an object), visitor_id (not text), client_context (not an object)',
    ],
  ])(
    '%s: sent without them, one ERROR line',
    async (_, data, userData, message) => {
      const { conversion, errors } = await send({ data });
      expect(conversion.user_data).toEqual(userData);
      expect(errors).toEqual([
        [
          expect.stringContaining(message),
          { step: 'destination.gravity', code: 'mapping', event: 'Purchase' },
        ],
      ]);
    },
  );
});

describe('Gravity event fields', () => {
  it.each<[string, Run, object]>([
    [
      'name, time in seconds, walkerOS id, default action source, page URL',
      {},
      {
        data: [
          {
            event_name: 'Purchase',
            event_time: 1700000900,
            event_id: 'ev-1',
            action_source: 'website',
            event_source_url: 'https://shop.example.com/x',
            user_data: {},
          },
        ],
      },
    ],
    [
      'a mapped event_id wins, cut to 128 characters',
      { data: { event_id: 'o'.repeat(130) } },
      { data: [{ event_id: 'o'.repeat(128) }] },
    ],
    [
      'a mapped action_source wins over the setting',
      {
        data: { action_source: 'phone_call' },
        settings: { action_source: 'app' },
      },
      { data: [{ action_source: 'phone_call' }] },
    ],
    [
      'test_event_code and a mapped source_url',
      {
        data: { source_url: 'https://shop.example.com/thanks' },
        settings: { test_event_code: 'TEST1' },
      },
      {
        test_event_code: 'TEST1',
        data: [{ event_source_url: 'https://shop.example.com/thanks' }],
      },
    ],
    [
      'custom data',
      {
        data: {
          value: '10.5',
          currency: 'eur',
          order_id: 7,
          contents: [{ id: 'p1', quantity: 2, item_price: 5.25 }],
          content_name: 'Shoe',
          content_category: 'Shoes',
          predicted_ltv: 120,
        },
      },
      {
        data: [
          {
            custom_data: {
              value: 10.5,
              currency: 'EUR',
              order_id: '7',
              contents: [{ id: 'p1', quantity: 2, item_price: 5.25 }],
              content_name: 'Shoe',
              content_category: 'Shoes',
              predicted_ltv: 120,
            },
          },
        ],
      },
    ],
    [
      'a value without currency is sent without one',
      { data: { value: 0 } },
      { data: [{ custom_data: { value: 0 } }] },
    ],
    [
      'client_context passes through',
      { data: { client_context: { timezone: 'Europe/Berlin' } } },
      { data: [{ client_context: { timezone: 'Europe/Berlin' } }] },
    ],
  ])('%s', async (_, run, expected) => {
    const { body, errors } = await send(run);
    expect(body).toMatchObject(expected);
    expect(errors).toEqual([]);
  });

  it('posts to the endpoint, or the url setting', async () => {
    expect((await send({})).url).toBe(
      'https://api.trygravity.com/gateway/events',
    );
    expect(
      (await send({ settings: { url: 'https://example.com/events' } })).url,
    ).toBe('https://example.com/events');
  });
});

describe('Gravity client IP and user agent', () => {
  const ingest = { ip: '203.0.113.7', userAgent: 'Mozilla/5.0 ingest' };
  const consented = { key: 'ingest.ip', consent: { marketing: true } };

  it.each<[string, Run, object]>([
    [
      'come from ingest by default',
      { settings: { ip: undefined, userAgent: undefined }, ingest },
      {
        client_ip_address: '203.0.113.7',
        client_user_agent: 'Mozilla/5.0 ingest',
      },
    ],
    [
      'a mapped ip_address wins',
      {
        data: { ip_address: '10.0.0.1' },
        settings: { ip: undefined, userAgent: undefined },
        ingest,
      },
      {
        client_ip_address: '10.0.0.1',
        client_user_agent: 'Mozilla/5.0 ingest',
      },
    ],
    ['false switches them off', { ingest }, {}],
    [
      'a consent-scoped setting is left out without that consent',
      { settings: { ip: consented }, ingest, event: { consent: {} } },
      {},
    ],
    [
      'a consent-scoped setting sends with the event consent',
      {
        settings: { ip: consented },
        ingest,
        event: { consent: { marketing: true } },
      },
      { client_ip_address: '203.0.113.7' },
    ],
    [
      'a callback receives the event',
      {
        settings: {
          userAgent: { fn: (_value, context) => context.event.user?.userAgent },
        },
        event: { user: { id: 'u1', userAgent: 'Mozilla/5.0 event' } },
      },
      { client_user_agent: 'Mozilla/5.0 event' },
    ],
  ])('%s', async (_, run, expected) => {
    const { conversion } = await send(run);
    expect(conversion.user_data).toEqual(expected);
  });
});
