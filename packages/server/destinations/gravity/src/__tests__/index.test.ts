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
import { destinationGravity as destination } from '..';
import { examples } from '../dev';

describe('Server Destination Gravity', () => {
  const apiKey = 's3cr3t';
  const mockSendServer = jest.fn();
  const testEnv = clone(examples.env.push);
  testEnv.sendServer = mockSendServer;

  const body = () => JSON.parse(mockSendServer.mock.calls[0][1]);
  const conversion = () => body().data[0];

  function event(props: Partial<WalkerOS.Event> = {}): WalkerOS.Event {
    return {
      ...getEvent('order complete', {
        id: 'ev-1',
        timestamp: 1700000900500,
        source: {
          type: 'express',
          platform: 'server',
          url: 'https://shop.example.com/x',
        },
        ...props,
      }),
      name: 'Purchase',
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
        config: { settings: { apiKey, ...settings } },
        data,
        env: testEnv,
        ...extra,
      }),
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({
      data: { results: [{ status: 'success' }] },
    });
  });

  test('init fails without apiKey', async () => {
    await expect(
      destination.init({
        config: {},
        collector: {} as Collector.Instance,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-gravity',
      }),
    ).rejects.toThrow('Config settings apiKey missing');
  });

  test('posts to the endpoint with the Bearer key', async () => {
    await push(event());
    const [url, , options] = mockSendServer.mock.calls[0];
    expect(url).toBe('https://api.trygravity.com/gateway/events');
    expect(options.headers.Authorization).toBe('Bearer s3cr3t');
  });

  test('event name, time in seconds, id, source', async () => {
    await push(event());
    expect(conversion()).toEqual({
      event_name: 'Purchase',
      event_time: 1700000900,
      event_id: 'ev-1',
      action_source: 'website',
      event_source_url: 'https://shop.example.com/x',
      user_data: {},
    });
  });

  test('test_event_code, action_source and url settings', async () => {
    await push(
      event(),
      {},
      {
        test_event_code: 'TEST1',
        action_source: 'app',
        url: 'https://example.com/events',
      },
    );
    expect(mockSendServer.mock.calls[0][0]).toBe('https://example.com/events');
    expect(body().test_event_code).toBe('TEST1');
    expect(conversion().action_source).toBe('app');
  });

  test('email and phone normalised and hashed, digests kept', async () => {
    const digest = await getHashServer('x@y.z');
    await push(event(), {
      email: [' Jane@Example.com', digest.toUpperCase()],
      phone: '+49 (151) 234',
      external_id: ['a', 7],
    });
    expect(conversion().user_data).toEqual({
      em: [await getHashServer('jane@example.com'), digest],
      ph: [await getHashServer('49151234')],
      external_id: ['a', '7'],
    });
  });

  test('every Gravity click parameter goes to user_data', async () => {
    const clicks = {
      grclid: '1',
      grcpid: '2',
      grpuid: '3',
      gradid: '4',
      grsig: '5',
      graid: '6',
      oppref: '7',
    };
    await push(event(), clicks);
    expect(conversion().user_data).toEqual(clicks);
  });

  test('client IP and user agent from ingest, mapped values win', async () => {
    const ingest = {
      ...createIngest('test'),
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0 test',
    };
    await push(event(), { ip_address: '10.0.0.1' }, {}, { ingest });
    expect(conversion().user_data).toEqual({
      client_ip_address: '10.0.0.1',
      client_user_agent: 'Mozilla/5.0 test',
    });
    mockSendServer.mockClear();
    await push(event(), {}, { ip: false, userAgent: false }, { ingest });
    expect(conversion().user_data).toEqual({});
  });

  test('custom_data: currency defaults to USD, order id alone', async () => {
    await push(event(), { value: '10.5' });
    expect(conversion().custom_data).toEqual({ value: 10.5, currency: 'USD' });
    mockSendServer.mockClear();
    await push(event(), { order_id: 'O1', currency: 'EUR' });
    expect(conversion().custom_data).toEqual({ order_id: 'O1' });
  });

  test('client_context passes through', async () => {
    await push(event(), { client_context: { page: 'x' } });
    expect(conversion().client_context).toEqual({ page: 'x' });
  });

  test('invalid value or currency fails without a request', async () => {
    await expect(push(event(), { value: -1 })).rejects.toMatchObject({
      code: 'mapping',
      retryable: false,
    });
    await expect(push(event(), { value: 1, currency: 'euro' })).rejects.toThrow(
      '3-letter code',
    );
    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('an error status in a 200 answer fails the push', async () => {
    mockSendServer.mockResolvedValue({
      data: { results: [{ status: 'error', error: 'invalid event' }] },
    });
    await expect(push(event())).rejects.toMatchObject({
      message: 'Gravity rejected the event: invalid event',
      retryable: false,
    });
  });

  test('a phone without digits is dropped', async () => {
    await push(event(), { phone: '()' });
    expect(conversion().user_data).toEqual({});
  });

  test('client fields follow the event consent, not the collector one', async () => {
    const ingest = { ...createIngest('test'), ip: '203.0.113.7' };
    const consented = { key: 'ingest.ip', consent: { marketing: true } };
    await push(
      event({ consent: {} }),
      {},
      { ip: consented, userAgent: false },
      { ingest, collector: { consent: { marketing: true } } },
    );
    expect(conversion().user_data).toEqual({});

    mockSendServer.mockClear();
    await push(
      event({ consent: { marketing: true } }),
      {},
      { ip: consented, userAgent: false },
      { ingest },
    );
    expect(conversion().user_data).toEqual({
      client_ip_address: '203.0.113.7',
    });
  });

  test('client field callbacks receive the event', async () => {
    await push(
      event({ user: { id: 'u1', userAgent: 'Mozilla/5.0 from event' } }),
      {},
      {
        ip: false,
        userAgent: {
          fn: (_: unknown, context: { event?: WalkerOS.DeepPartialEvent }) =>
            context.event?.user?.userAgent,
        },
      },
    );
    expect(conversion().user_data).toEqual({
      client_user_agent: 'Mozilla/5.0 from event',
    });
  });

  test('silent rule sends nothing', async () => {
    await push(event(), {}, {}, { rule: { silent: true } });
    expect(mockSendServer).not.toHaveBeenCalled();
  });
});
