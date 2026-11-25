import type { WalkerOS } from '@walkeros/core';
import type { StepExample } from '../examples/step';
import type { Env, Settings } from '../types';
import { startFlow } from '@walkeros/collector';
import { runExamples } from '@walkeros/collector/dev';
import { createEvent, Logger, StepError } from '@walkeros/core';
import { destinationReditus } from '..';
import { examples } from '../dev';

const { signUp, payment, referralExists, paymentReplayed, notReferred } =
  examples.step;

interface Request {
  url: string;
  body: unknown;
}

/**
 * Pushes an example's event through a real collector, the destination
 * registered as `reditus` and Reditus answering as the example's `respond`:
 * the push result, the requests made and the WARN and ERROR lines written
 * (the logger runs at WARN; its default level is ERROR).
 */
async function run(example: StepExample, settings: Partial<Settings> = {}) {
  const requests: Request[] = [];
  const lines: unknown[] = [];
  const { respond } = example;
  const env: Env = {
    sendServer: async (url, data) => {
      requests.push({ url, body: JSON.parse(String(data)) });
      if (respond?.status)
        throw new StepError(`HTTP ${respond.status}`, {
          code: 'transport',
          status: respond.status,
          body: respond.body,
        });
      return { data: {} };
    },
  };
  const { entity, action } = example.in;
  const { collector } = await startFlow({
    logger: {
      level: Logger.Level.WARN,
      handler: (level, message, context) => {
        if (level === Logger.Level.ERROR || level === Logger.Level.WARN)
          lines.push([level, message, context]);
      },
    },
    destinations: {
      reditus: {
        code: destinationReditus,
        config: {
          settings: { apiKey: 's3cr3t', ...settings },
          mapping: example.mapping
            ? { [entity]: { [action]: example.mapping } }
            : undefined,
        },
        env,
      },
    },
  });
  const result = await collector.push(example.in);
  await collector.command('shutdown');
  return { result, requests, lines };
}

describe('Server Destination Reditus', () => {
  it.each<[string, Record<string, unknown>]>([
    ['without apiKey', {}],
    [
      'with a type other than conversion or payment',
      { apiKey: 's3cr3t', type: 'refund' },
    ],
  ])('does not start %s: every push fails with config', (_, settings) =>
    runExamples(
      'destination',
      destinationReditus,
      {
        refused: {
          ...signUp,
          out: [],
          outcome: { status: 'failed', code: 'config', retryable: false },
        },
      },
      { settings, env: examples.env },
    ),
  );

  it.each<[string, StepExample, unknown[]]>([
    ['409 "Referral already exists"', referralExists, []],
    ['400 "idempotency_key has already been taken"', paymentReplayed, []],
    [
      '404 "Referral not found"',
      notReferred,
      [
        [
          Logger.Level.WARN,
          expect.stringContaining(
            'Reditus skipped payment: referral not found',
          ),
          {
            step: 'destination.reditus',
            code: 'not-referred',
            status: 404,
            event: 'subscription start',
          },
        ],
      ],
    ],
  ])(
    '%s counts as delivered, with its WARN lines and no ERROR line',
    async (_, example, expected) => {
      const { result, requests, lines } = await run(example);
      expect(requests).toHaveLength(1);
      expect(result.ok).toBe(true);
      expect(lines).toEqual(expected);
    },
  );

  it.each<[string, StepExample, Partial<Settings>, string]>([
    [
      'a url with a trailing slash',
      signUp,
      { url: 'https://example.com/api/' },
      'https://example.com/api/v2/tracking/conversion',
    ],
    [
      'settings type payment when the rule sets none',
      { ...payment, mapping: { data: payment.mapping?.data } },
      { type: 'payment' },
      'https://api.getreditus.com/api/v1/payments',
    ],
    [
      'the rule type over settings type',
      {
        ...signUp,
        mapping: { ...signUp.mapping, settings: { type: 'conversion' } },
      },
      { type: 'payment' },
      'https://api.getreditus.com/api/v2/tracking/conversion',
    ],
  ])('calls the endpoint of %s', async (_, example, settings, url) => {
    const { requests } = await run(example, settings);
    expect(requests.map((request) => request.url)).toEqual([url]);
  });

  it.each<[string, WalkerOS.Properties, Record<string, unknown>]>([
    [
      'email, a monthly interval and its count',
      {
        email: 'jane@example.com',
        idempotency_key: 'pay_1',
        amount: 1999,
        currency: 'USD',
        interval: 'month',
        interval_count: 3,
      },
      {
        idempotency_key: 'pay_1',
        amount: 1999,
        currency: 'usd',
        referral_email: 'jane@example.com',
        interval: 'month',
        interval_count: 3,
      },
    ],
    [
      'an unknown interval and a count that is no integer left out',
      {
        uid: 'cus_42',
        idempotency_key: 'pay_1',
        amount: 500,
        currency: 'eur',
        subscription_id: 'sub_1',
        interval: 'week',
        interval_count: 1.5,
      },
      {
        idempotency_key: 'pay_1',
        amount: 500,
        currency: 'eur',
        referral_uid: 'cus_42',
        subscription_id: 'sub_1',
      },
    ],
  ])('sends a payment with %s', async (_, data, body) => {
    const { requests } = await run({
      in: createEvent({
        name: 'order complete',
        timestamp: 1700000903000,
        data,
      }),
      mapping: { settings: { type: 'payment' }, data: 'data' },
    });
    expect(requests.map((request) => request.body)).toEqual([body]);
  });
});
