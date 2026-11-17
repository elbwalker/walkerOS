import type { Collector, WalkerOS } from '@walkeros/core';
import type { Settings } from '../types';
import {
  clone,
  createMockContext,
  createMockLogger,
  getEvent,
} from '@walkeros/core';
import { destinationGA4 as destination } from '..';
import { fallbackClientId } from '../push';
import { examples } from '../dev';

describe('Server Destination GA4 Measurement Protocol', () => {
  const settings: Settings = { measurementId: 'G-TEST123', apiSecret: 'a&b' };
  const mockSendServer = jest.fn();
  const testEnv = clone(examples.env.push);
  testEnv.sendServer = mockSendServer;

  const body = () => JSON.parse(mockSendServer.mock.calls[0][1]);

  function event(props: Partial<WalkerOS.Event> = {}): WalkerOS.Event {
    return getEvent('order complete', {
      id: 'ev-1',
      timestamp: 1700000900000,
      consent: {},
      ...props,
    });
  }

  async function push(
    walkerEvent: WalkerOS.Event,
    data: Record<string, unknown> = {},
    extra: Partial<Settings> = {},
    rule?: Record<string, unknown>,
  ) {
    return destination.push(
      walkerEvent,
      createMockContext({
        config: { settings: { ...settings, ...extra } },
        data,
        env: testEnv,
        ...(rule ? { rule } : {}),
      }),
    );
  }

  async function init(config: Record<string, unknown>) {
    return destination.init({
      config: { settings: config as unknown as Settings },
      collector: {} as Collector.Instance,
      env: testEnv,
      logger: createMockLogger(),
      id: 'test-ga4',
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({ data: {} });
  });

  test('init checks measurementId and apiSecret', async () => {
    await expect(init({})).rejects.toThrow(
      'Config settings measurementId, apiSecret missing',
    );
    await expect(
      init({ measurementId: 'UA-1', apiSecret: 'x' }),
    ).rejects.toThrow('must look like G-XXXX');
  });

  test('endpoint carries encoded measurement id and secret', async () => {
    await push(event());
    expect(mockSendServer.mock.calls[0][0]).toBe(
      'https://www.google-analytics.com/mp/collect?measurement_id=G-TEST123&api_secret=a%26b',
    );
  });

  test('custom url (EU collection)', async () => {
    await push(
      event(),
      {},
      {
        url: 'https://region1.google-analytics.com/mp/collect',
      },
    );
    expect(mockSendServer.mock.calls[0][0]).toMatch(
      /^https:\/\/region1\.google-analytics\.com\/mp\/collect\?/,
    );
  });

  test('event name: spaces become _, invalid names fail', async () => {
    await push({ ...event(), name: 'order complete' });
    expect(body().events[0].name).toBe('order_complete');
    mockSendServer.mockClear();
    await expect(
      push({ ...event(), name: '1 bad-name' }),
    ).rejects.toMatchObject({ code: 'mapping', retryable: false });
    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('valid client id and session id are kept', async () => {
    await push(event(), { client_id: '123.456', session_id: 1699999000 });
    expect(body().client_id).toBe('123.456');
    expect(body().events[0].params.session_id).toBe('1699999000');
  });

  test('malformed client id and session id are replaced or dropped', async () => {
    await push(event(), { client_id: 'GA1.1.123.456', session_id: 'abc' });
    expect(body().client_id).toBe(await fallbackClientId(event()));
    expect(body().events[0].params).not.toHaveProperty('session_id');
  });

  test('fallback client id is stable per event id', async () => {
    const a = await fallbackClientId(event());
    const b = await fallbackClientId(event());
    expect(a).toBe(b);
    expect(a).toMatch(/^\d+\.1700000900$/);
    expect(await fallbackClientId(event({ id: 'ev-2' }))).not.toBe(a);
  });

  test('value is a number, an invalid one is dropped', async () => {
    await push(event(), { params: { value: '19.9', currency: 'EUR' } });
    expect(body().events[0].params.value).toBe(19.9);
    mockSendServer.mockClear();
    await push(event(), { params: { value: 'n/a' } });
    expect(body().events[0].params).not.toHaveProperty('value');
  });

  test('ad signals follow the marketing consent', async () => {
    await push(event({ consent: { marketing: true } }));
    expect(body().consent).toEqual({
      ad_user_data: 'GRANTED',
      ad_personalization: 'GRANTED',
    });
    mockSendServer.mockClear();
    await push(event({ consent: { analytics: true } }));
    expect(body().consent.ad_user_data).toBe('DENIED');
  });

  test('timestamp_micros only for events under 72 hours', async () => {
    const recent = Date.now() - 1000;
    await push(event({ timestamp: recent }));
    expect(body().timestamp_micros).toBe(recent * 1000);
    mockSendServer.mockClear();
    await push(event());
    expect(body()).not.toHaveProperty('timestamp_micros');
  });

  test('user_id only when a non-empty string', async () => {
    await push(event(), { user_id: 'u1' });
    expect(body().user_id).toBe('u1');
    mockSendServer.mockClear();
    await push(event(), { user_id: '' });
    expect(body()).not.toHaveProperty('user_id');
  });

  test('silent rule sends nothing', async () => {
    await push(event(), {}, {}, { silent: true });
    expect(mockSendServer).not.toHaveBeenCalled();
  });
});
