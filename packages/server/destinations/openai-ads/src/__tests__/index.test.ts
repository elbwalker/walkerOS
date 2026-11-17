import type { Collector, WalkerOS } from '@walkeros/core';
import type { Settings } from '../types';
import {
  clone,
  createIngest,
  createMockContext,
  createMockLogger,
  getEvent,
} from '@walkeros/core';
import { getHashServer } from '@walkeros/server-core';
import { destinationOpenAIAds as destination } from '..';
import { hashList, normalizeEmail, normalizePhone } from '../hash';
import { examples } from '../dev';

describe('Server Destination OpenAI Ads', () => {
  const apiKey = 's3cr3t';
  const pixelId = 'px_abc123';
  const mockSendServer = jest.fn();
  const testEnv = clone(examples.env.push);
  testEnv.sendServer = mockSendServer;

  const sent = () => JSON.parse(mockSendServer.mock.calls[0][1]);
  const conversion = () => sent().events[0];

  function event(
    name: string,
    props: Partial<WalkerOS.Event> = {},
  ): WalkerOS.Event {
    return {
      ...getEvent('order complete', {
        id: 'ev-1',
        timestamp: 1700000900000,
        source: {
          type: 'express',
          platform: 'server',
          url: 'https://shop.example.com/x',
        },
        ...props,
      }),
      name,
    };
  }

  async function push(
    walkerEvent: WalkerOS.Event,
    data: Record<string, unknown> = {},
    settings: Partial<Settings> = {},
    extra: Record<string, unknown> = {},
  ) {
    return destination.push(
      walkerEvent,
      createMockContext({
        config: { settings: { apiKey, pixelId, ...settings } },
        data,
        env: testEnv,
        ...extra,
      }),
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({ data: {} });
  });

  test('init fails without apiKey and pixelId', async () => {
    await expect(
      destination.init({
        config: {},
        collector: {} as Collector.Instance,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-openai-ads',
      }),
    ).rejects.toThrow('Config settings apiKey, pixelId missing');
  });

  test('posts to the endpoint with the pixel id and Bearer key', async () => {
    await push(event('order_created'));
    const [url, , options] = mockSendServer.mock.calls[0];
    expect(url).toBe('https://bzr.openai.com/v1/events?pid=px_abc123');
    expect(options.headers.Authorization).toBe('Bearer s3cr3t');
  });

  test('custom url and pixel id are joined safely', async () => {
    await push(
      event('order_created'),
      {},
      {
        url: 'https://example.com/v1/events/',
        pixelId: 'px a&b',
      },
    );
    expect(mockSendServer.mock.calls[0][0]).toBe(
      'https://example.com/v1/events?pid=px%20a%26b',
    );
  });

  test('validate_only and integration_source at the top level', async () => {
    await push(
      event('order_created'),
      {},
      {
        validate_only: true,
        integration_source: 'walkerOS',
      },
    );
    expect(sent().validate_only).toBe(true);
    expect(sent().integration_source).toBe('walkerOS');
  });

  test('validate_only is left out unless true', async () => {
    await push(event('order_created'), {}, { validate_only: false });
    expect(sent()).not.toHaveProperty('validate_only');
  });

  test('event id, type, time and source', async () => {
    await push(event('order_created'));
    expect(conversion()).toMatchObject({
      id: 'ev-1',
      type: 'order_created',
      timestamp_ms: 1700000900000,
      source_url: 'https://shop.example.com/x',
      action_source: 'web',
      data: { type: 'contents' },
    });
  });

  test('event name with spaces becomes the type', async () => {
    await push(event('lead created'));
    expect(conversion().type).toBe('lead_created');
    expect(conversion().data.type).toBe('customer_action');
  });

  test('unknown name is a custom event', async () => {
    await push(event('Demo_Booked'), { plan_id: 'p1' });
    expect(conversion().type).toBe('custom');
    expect(conversion().custom_event_name).toBe('demo_booked');
    expect(conversion().data).toEqual({ type: 'custom', plan_id: 'p1' });
  });

  test('invalid custom name fails without a request', async () => {
    await expect(push(event('demo booked!'))).rejects.toMatchObject({
      code: 'mapping',
      retryable: false,
    });
    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('web event without source url fails', async () => {
    const noUrl = event('order_created', {
      source: { type: 'express', platform: 'server' },
    });
    await expect(push(noUrl)).rejects.toThrow('needs a source_url');
    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('mobile_app event needs no source url', async () => {
    const noUrl = event('order_created', {
      source: { type: 'express', platform: 'server' },
    });
    await push(noUrl, {}, { action_source: 'mobile_app' });
    expect(conversion().action_source).toBe('mobile_app');
    expect(conversion()).not.toHaveProperty('source_url');
  });

  test('mapped source_url wins', async () => {
    await push(event('order_created'), {
      source_url: 'https://other.example.com/',
    });
    expect(conversion().source_url).toBe('https://other.example.com/');
  });

  test('amount in minor units, currency uppercased', async () => {
    await push(event('order_created'), { amount: '99.9', currency: 'usd' });
    expect(conversion().data).toEqual({
      type: 'contents',
      amount: 9990,
      currency: 'USD',
    });
  });

  test('zero-decimal currency', async () => {
    await push(event('order_created'), { amount: 1200, currency: 'JPY' });
    expect(conversion().data.amount).toBe(1200);
  });

  test('amount without currency fails', async () => {
    await expect(push(event('order_created'), { amount: 10 })).rejects.toThrow(
      'needs a currency',
    );
  });

  test('negative amount fails', async () => {
    await expect(
      push(event('order_created'), { amount: -1, currency: 'EUR' }),
    ).rejects.toThrow('positive number');
  });

  test('plan_id only on plan and custom events', async () => {
    await push(event('order_created'), { plan_id: 'p1' });
    expect(conversion().data).not.toHaveProperty('plan_id');
    mockSendServer.mockClear();
    await push(event('trial_started'), { plan_id: 'p1' });
    expect(conversion().data).toEqual({
      type: 'plan_enrollment',
      plan_id: 'p1',
    });
  });

  test('identity fields are normalised and hashed', async () => {
    await push(event('lead_created'), {
      email: [' Jane@Example.com ', 'jane@example.com'],
      phone: '+49 (151) 234-567',
      external_id: ' user-42 ',
      oppref: 'opp_1',
      obref: 'ob_1',
      country: ['de', 'fr'],
    });
    expect(conversion().oppref).toBe('opp_1');
    expect(conversion().user).toEqual({
      emails_sha256: [await getHashServer('jane@example.com')],
      phone_numbers_sha256: [await getHashServer('49151234567')],
      external_ids_sha256: [await getHashServer('user-42')],
      obref: 'ob_1',
      countries: ['DE', 'FR'],
    });
  });

  test('client IP and user agent from ingest, mapped values win', async () => {
    const ingest = {
      ...createIngest('test'),
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0 test',
    };
    await push(event('lead_created'), {}, {}, { ingest });
    expect(conversion().user).toEqual({
      user_agent: 'Mozilla/5.0 test',
      ip_address: '203.0.113.7',
    });

    mockSendServer.mockClear();
    await push(
      event('lead_created'),
      { ip_address: '10.0.0.1' },
      {},
      {
        ingest,
      },
    );
    expect(conversion().user.ip_address).toBe('10.0.0.1');

    mockSendServer.mockClear();
    await push(
      event('lead_created'),
      {},
      { ip: false, userAgent: false },
      {
        ingest,
      },
    );
    expect(conversion()).not.toHaveProperty('user');
  });

  test('client fields follow the event consent, not the collector one', async () => {
    const ingest = { ...createIngest('test'), ip: '203.0.113.7' };
    const consented = { key: 'ingest.ip', consent: { marketing: true } };
    await push(
      event('lead_created', { consent: {} }),
      {},
      { ip: consented, userAgent: false },
      { ingest, collector: { consent: { marketing: true } } },
    );
    expect(conversion()).not.toHaveProperty('user');

    mockSendServer.mockClear();
    await push(
      event('lead_created', { consent: { marketing: true } }),
      {},
      { ip: consented, userAgent: false },
      { ingest },
    );
    expect(conversion().user).toEqual({ ip_address: '203.0.113.7' });
  });

  test('client field callbacks receive the event', async () => {
    await push(
      event('lead_created', {
        user: { id: 'u1', userAgent: 'Mozilla/5.0 from event' },
      }),
      {},
      {
        ip: false,
        userAgent: {
          fn: (_: unknown, context: { event?: WalkerOS.DeepPartialEvent }) =>
            context.event?.user?.userAgent,
        },
      },
    );
    expect(conversion().user).toEqual({ user_agent: 'Mozilla/5.0 from event' });
  });

  test('silent rule sends nothing', async () => {
    await push(event('order_created'), {}, {}, { rule: { silent: true } });
    expect(mockSendServer).not.toHaveBeenCalled();
  });
});

describe('hashList', () => {
  test('keeps an existing digest, dedupes, keeps three values', async () => {
    const digest = await getHashServer('a@b.c');
    expect(
      await hashList(
        [digest.toUpperCase(), 'A@b.c', 'x@y.z', 'u@v.w', 'q@r.s'],
        normalizeEmail,
      ),
    ).toEqual([
      digest,
      await getHashServer('x@y.z'),
      await getHashServer('u@v.w'),
    ]);
  });

  test('values that normalise to nothing do not take a slot', async () => {
    expect(
      await hashList([' ', 'a@b.c', 'd@e.f', 'g@h.i'], normalizeEmail),
    ).toEqual([
      await getHashServer('a@b.c'),
      await getHashServer('d@e.f'),
      await getHashServer('g@h.i'),
    ]);
    expect(await hashList('()', normalizePhone)).toBeUndefined();
  });

  test('empty input gives undefined', async () => {
    expect(await hashList(undefined, normalizePhone)).toBeUndefined();
    expect(await hashList(['', null], normalizePhone)).toBeUndefined();
  });

  test('phone keeps digits without leading + or zeroes', () => {
    expect(normalizePhone('+33 (0)6 12-34.56')).toBe('330612' + '3456');
    expect(normalizePhone('0049 151')).toBe('49151');
  });
});
