import type { WalkerOS } from '@walkeros/core';
import type { Env, RequestBody, Rule, Settings } from '../types';
import { startFlow } from '@walkeros/collector';
import { createEvent, createIngest, Logger } from '@walkeros/core';
import { destinationOpenAIAds } from '..';

const SOURCE = {
  type: 'express',
  platform: 'server',
  url: 'https://shop.example.com/x',
};

interface Run {
  settings?: Partial<Settings>;
  ingest?: Record<string, unknown>;
  consent?: WalkerOS.Consent;
}

/**
 * One event through a real collector into the destination, its rule mapped
 * for the event: the push result, the requests made and the ERROR lines.
 */
async function send(
  event: WalkerOS.DeepPartialEvent,
  rule: Rule,
  { settings, ingest, consent }: Run = {},
) {
  const urls: string[] = [];
  const bodies: RequestBody[] = [];
  const errors: unknown[] = [];
  const env: Env = {
    sendServer: async (url, body) => {
      urls.push(url);
      bodies.push(JSON.parse(String(body)));
      return { data: {} };
    },
  };
  const [entity, action] = (event.name ?? '').split(' ');
  const { collector } = await startFlow({
    consent,
    logger: {
      handler: (level, message, context) => {
        if (level === Logger.Level.ERROR) errors.push([message, context]);
      },
    },
    destinations: {
      openai: {
        code: destinationOpenAIAds,
        config: {
          settings: { apiKey: 's3cr3t', pixelId: 'px_abc123', ...settings },
          mapping: { [entity]: { [action]: rule } },
        },
        env,
      },
    },
  });

  const result = await collector.push(
    event,
    ingest ? { ingest: { ...createIngest('test'), ...ingest } } : undefined,
  );
  await collector.command('shutdown');

  return {
    result,
    url: urls[0],
    body: bodies[0],
    conversion: bodies[0]?.events[0],
    errors,
  };
}

const order = (data: WalkerOS.Properties = {}) =>
  createEvent({ name: 'order complete', data, source: SOURCE });

describe('OpenAI Ads request', () => {
  it.each<[string, Partial<Settings>, Omit<RequestBody, 'events'>]>([
    [
      'names walkerOS as the integration on every request',
      {},
      { integration_source: 'walkeros' },
    ],
    [
      'adds validate_only when it is true',
      { validate_only: true },
      { validate_only: true, integration_source: 'walkeros' },
    ],
    [
      'leaves validate_only out unless it is true',
      { validate_only: false },
      { integration_source: 'walkeros' },
    ],
  ])('%s', async (_, settings, expected) => {
    const { body } = await send(
      order(),
      { name: 'order_created' },
      {
        settings,
      },
    );
    const { events, ...top } = body;
    expect(events).toHaveLength(1);
    expect(top).toEqual(expected);
  });

  it('joins the pixel id to the endpoint safely', async () => {
    const { url } = await send(
      order(),
      { name: 'order_created' },
      { settings: { pixelId: 'px a&b' } },
    );
    expect(url).toBe('https://bzr.openai.com/v1/events?pid=px%20a%26b');
  });
});

describe('OpenAI Ads amounts', () => {
  // ISO 4217 minor units: HUF, IDR and IQD are where the runtime's own
  // currency data differs.
  it.each<[string | number, string, number, string]>([
    [1000, 'HUF', 100000, 'HUF'],
    [15000, 'IDR', 1500000, 'IDR'],
    [1000, 'IQD', 1000000, 'IQD'],
    [1200, 'JPY', 1200, 'JPY'],
    [1.5, 'KWD', 1500, 'KWD'],
    ['99.9', 'eur', 9990, 'EUR'],
    [0, 'USD', 0, 'USD'],
  ])('%p %s is sent as %i %s', async (amount, currency, minor, code) => {
    const { conversion } = await send(order({ amount, currency }), {
      name: 'order_created',
      data: { map: { amount: 'data.amount', currency: 'data.currency' } },
    });
    expect(conversion.data).toEqual({
      type: 'contents',
      amount: minor,
      currency: code,
    });
  });
});

describe('OpenAI Ads unsendable events', () => {
  it.each<[string, Rule, WalkerOS.Properties]>([
    ['a rule named custom', { name: 'custom' }, {}],
    [
      'an action_source OpenAI does not know',
      { name: 'lead_created', data: { map: { action_source: 'data.source' } } },
      { source: 'store' },
    ],
    [
      'a negative amount',
      {
        name: 'order_created',
        data: { map: { amount: 'data.total', currency: 'data.currency' } },
      },
      { total: -1, currency: 'EUR' },
    ],
    [
      'a content amount without any currency',
      { name: 'order_created', data: { map: { contents: 'data.items' } } },
      { items: [{ id: 'sku', amount: 5 }] },
    ],
  ])('%s fails with missing-input and sends nothing', async (_, rule, data) => {
    const { result, body } = await send(order(data), rule);
    expect(result.failed?.openai?.reason).toMatchObject({
      code: 'missing-input',
      retryable: false,
    });
    expect(body).toBeUndefined();
  });
});

describe('OpenAI Ads values it leaves out', () => {
  const lead = (map: Record<string, string>): Rule => ({
    name: 'lead_created',
    data: { map },
  });
  const purchase = (map: Record<string, string>): Rule => ({
    name: 'order_created',
    data: { map },
  });

  it.each<[string, Rule, WalkerOS.Properties, Record<string, unknown>, string]>(
    [
      [
        'a key OpenAI does not take',
        lead({ em: 'data.email' }),
        { email: 'a@b.c' },
        { data: { type: 'customer_action' } },
        'em (not an OpenAI key)',
      ],
      [
        'rule data that is not an object',
        { name: 'lead_created', data: 'data.email' },
        { email: 'a@b.c' },
        { data: { type: 'customer_action' } },
        'the rule data (not an object)',
      ],
      [
        'a phone that is not 8 to 15 digits',
        lead({ phone: 'data.phone' }),
        { phone: '0170/1234567' },
        { data: { type: 'customer_action' } },
        'phone (not 8 to 15 digits)',
      ],
      [
        'a fourth value of a list',
        lead({ country: 'data.countries' }),
        { countries: ['DE', 'FR', 'IT', 'ES'] },
        { user: { countries: ['DE', 'FR', 'IT'] } },
        'country (more than 3 values)',
      ],
      [
        'a country that is not a two-letter code',
        lead({ country: 'data.countries' }),
        { countries: [' de', 'Germany'] },
        { user: { countries: ['DE'] } },
        'country (not a two-letter code)',
      ],
      [
        'a list under a key that takes one value',
        lead({ obref: 'data.obref' }),
        { obref: ['a', 'b'] },
        { data: { type: 'customer_action' } },
        'obref (not one text value)',
      ],
      [
        'a plan id on an event without plans',
        purchase({ plan_id: 'data.plan' }),
        { plan: 'p1' },
        { data: { type: 'contents' } },
        'plan_id (not on contents events)',
      ],
      [
        'contents on an event without contents',
        lead({ contents: 'data.items' }),
        { items: [{ id: 'sku' }] },
        { data: { type: 'customer_action' } },
        'contents (not on customer_action events)',
      ],
      [
        'a quantity that is not a whole number',
        purchase({ contents: 'data.items' }),
        { items: [{ id: 'sku', quantity: 1.5 }] },
        { data: { type: 'contents', contents: [{ id: 'sku' }] } },
        'contents quantity (not a whole number)',
      ],
    ],
  )(
    'sends the event without %s and reports it in one ERROR line',
    async (_, rule, data, expected, reason) => {
      const { result, conversion, errors } = await send(order(data), rule, {
        settings: { ip: false, userAgent: false },
      });
      expect(result.ok).toBe(true);
      expect(conversion).toMatchObject(expected);
      expect(errors).toEqual([
        [
          expect.stringContaining(`OpenAI Ads left out ${reason}`),
          { step: 'destination.openai', code: 'mapping', event: rule.name },
        ],
      ]);
    },
  );
});

describe('OpenAI Ads client IP and user agent', () => {
  const ingest = { ip: '203.0.113.7', userAgent: 'Mozilla/5.0 test' };
  const lead: Rule = { name: 'lead_created' };
  const consented = { key: 'ingest.ip', consent: { marketing: true } };

  it.each<[string, WalkerOS.DeepPartialEvent, Rule, Run, unknown]>([
    [
      'come from the ingest by default',
      order(),
      lead,
      { ingest },
      { user_agent: 'Mozilla/5.0 test', ip_address: '203.0.113.7' },
    ],
    [
      'give way to a mapped value',
      order(),
      { ...lead, data: { map: { ip_address: { value: '10.0.0.1' } } } },
      { ingest, settings: { userAgent: false } },
      { ip_address: '10.0.0.1' },
    ],
    [
      'are switched off with false',
      order(),
      lead,
      { ingest, settings: { ip: false, userAgent: false } },
      undefined,
    ],
    [
      'follow the event consent over the collector one',
      { ...order(), consent: { marketing: false } },
      lead,
      {
        ingest,
        consent: { marketing: true },
        settings: { ip: consented, userAgent: false },
      },
      undefined,
    ],
    [
      'are sent with the consent the event grants',
      { ...order(), consent: { marketing: true } },
      lead,
      { ingest, settings: { ip: consented, userAgent: false } },
      { ip_address: '203.0.113.7' },
    ],
    [
      'pass the event to a callback',
      { ...order(), user: { id: 'u1', userAgent: 'Mozilla/5.0 from event' } },
      lead,
      {
        settings: {
          ip: false,
          userAgent: {
            fn: (_: unknown, context: { event?: WalkerOS.DeepPartialEvent }) =>
              context.event?.user?.userAgent,
          },
        },
      },
      { user_agent: 'Mozilla/5.0 from event' },
    ],
  ])('%s', async (_, event, rule, run, user) => {
    const { conversion } = await send(event, rule, run);
    expect(conversion.user).toEqual(user);
  });
});
