import type { Collector, WalkerOS } from '@walkeros/core';
import type { Settings } from '../types';
import {
  clone,
  createMockContext,
  createMockLogger,
  getEvent,
  StepError,
} from '@walkeros/core';
import { destinationReditus as destination } from '..';
import { examples } from '../dev';

describe('Server Destination Reditus', () => {
  const apiKey = 's3cr3t';
  const mockSendServer = jest.fn();
  const testEnv = clone(examples.env.push);
  testEnv.sendServer = mockSendServer;

  const call = () => mockSendServer.mock.calls[0];
  const body = () => JSON.parse(call()[1]);
  const event: WalkerOS.Event = getEvent('order complete', {
    id: 'ev-1',
    timestamp: 1700000900000,
  });

  async function push(
    data: Record<string, unknown>,
    settings: Partial<Settings> = {},
    rule?: Record<string, unknown>,
  ) {
    return destination.push(
      event,
      createMockContext({
        config: { settings: { apiKey, ...settings } },
        data,
        env: testEnv,
        ...(rule ? { rule } : {}),
      }),
    );
  }

  async function init(settings: Record<string, unknown>) {
    return destination.init({
      config: { settings: settings as unknown as Settings },
      collector: {} as Collector.Instance,
      env: testEnv,
      logger: createMockLogger(),
      id: 'test-reditus',
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({ data: {} });
  });

  test('init fails without apiKey or with an unknown type', async () => {
    await expect(init({})).rejects.toThrow('Config settings apiKey missing');
    await expect(init({ apiKey, type: 'refund' })).rejects.toThrow(
      'type must be "conversion" or "payment"',
    );
  });

  test('conversion by default, with Bearer token', async () => {
    await push({ email: 'a@b.c', gr_id: 'gr_1' });
    expect(call()[0]).toBe(
      'https://api.getreditus.com/api/v2/tracking/conversion',
    );
    expect(call()[2].headers.Authorization).toBe('Bearer s3cr3t');
    expect(body()).toEqual({ email: 'a@b.c', gr_id: 'gr_1' });
  });

  test('custom url without trailing slash duplication', async () => {
    await push(
      { uid: 'u1', advocate_slug: 'adv' },
      {
        url: 'https://example.com/api/',
      },
    );
    expect(call()[0]).toBe('https://example.com/api/v2/tracking/conversion');
  });

  test('conversion needs email or uid', async () => {
    await expect(push({ gr_id: 'gr_1' })).rejects.toMatchObject({
      code: 'mapping',
      retryable: false,
    });
    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('conversion needs a referral identifier', async () => {
    await expect(push({ email: 'a@b.c' })).rejects.toThrow(
      'needs gr_id, affiliate_slug or advocate_slug',
    );
  });

  test('settings type payment applies when the rule sets none', async () => {
    await push({ email: 'a@b.c', amount: 10 }, { type: 'payment' });
    expect(call()[0]).toBe('https://api.getreditus.com/api/v1/payments');
    expect(body()).toEqual({
      idempotency_key: 'ev-1',
      amount: 1000,
      currency: 'eur',
      referral_email: 'a@b.c',
    });
  });

  test('rule type wins over settings type', async () => {
    await push(
      { email: 'a@b.c', gr_id: 'gr_1' },
      { type: 'payment' },
      {
        settings: { type: 'conversion' },
      },
    );
    expect(call()[0]).toContain('/v2/tracking/conversion');
  });

  test('payment fields', async () => {
    await push(
      {
        uid: 'u1',
        amount: '19.99',
        currency: 'USD',
        subscription_id: 'sub_1',
        interval: 'month',
        interval_count: 3,
        idempotency_key: 'pay_1',
      },
      { type: 'payment' },
    );
    expect(body()).toEqual({
      idempotency_key: 'pay_1',
      amount: 1999,
      currency: 'usd',
      referral_uid: 'u1',
      subscription_id: 'sub_1',
      interval: 'month',
      interval_count: 3,
    });
  });

  test('payment drops an unknown interval and a non-integer count', async () => {
    await push(
      { uid: 'u1', amount: 5, interval: 'week', interval_count: 1.5 },
      { type: 'payment' },
    );
    expect(body()).not.toHaveProperty('interval');
    expect(body()).not.toHaveProperty('interval_count');
  });

  test('payment needs a positive amount and a customer', async () => {
    await expect(push({ uid: 'u1' }, { type: 'payment' })).rejects.toThrow(
      'positive amount',
    );
    await expect(push({ amount: 5 }, { type: 'payment' })).rejects.toThrow(
      'needs uid or email',
    );
    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('409 on a conversion counts as delivered', async () => {
    mockSendServer.mockRejectedValue(
      new StepError('HTTP 409', { code: 'transport', status: 409 }),
    );
    await expect(push({ uid: 'u1', gr_id: 'gr_1' })).resolves.toBeUndefined();
  });

  test('404 on a payment counts as delivered', async () => {
    mockSendServer.mockRejectedValue(
      new StepError('HTTP 404', { code: 'transport', status: 404 }),
    );
    await expect(
      push({ uid: 'u1', amount: 5 }, { type: 'payment' }),
    ).resolves.toBeUndefined();
  });

  test('other errors fail the push', async () => {
    mockSendServer.mockRejectedValue(
      new StepError('HTTP 404', { code: 'transport', status: 404 }),
    );
    await expect(push({ uid: 'u1', gr_id: 'gr_1' })).rejects.toThrow(
      'HTTP 404',
    );
    mockSendServer.mockRejectedValue(
      new StepError('HTTP 500', { code: 'transport', status: 500 }),
    );
    await expect(
      push({ uid: 'u1', amount: 5 }, { type: 'payment' }),
    ).rejects.toThrow('HTTP 500');
  });

  test('silent rule sends nothing', async () => {
    await push({ uid: 'u1', gr_id: 'gr_1' }, {}, { silent: true });
    expect(mockSendServer).not.toHaveBeenCalled();
  });
});
