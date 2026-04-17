import type { WalkerOS, Collector } from '@walkeros/core';
import type { Config, Destination, Settings } from '../types';
import {
  clone,
  getEvent,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import { hashUserData } from '../hash';

const { env } = examples;

describe('Server Destination Snapchat', () => {
  let destination: Destination;
  let elb: WalkerOS.Elb;
  const accessToken = 's3cr3t';
  const pixelId = 'PIX-ABC-123';
  const mockSendServer = jest.fn();

  const testEnv = clone(env.push);
  testEnv.sendServer = mockSendServer;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockSendServer.mockResolvedValue({
      ok: true,
      data: JSON.stringify({ status: 'OK', request_id: 'req-1' }),
    });

    destination = jest.requireActual('../').default;

    ({ elb } = await startFlow({
      tagging: 2,
    }));
  });

  async function getConfig(settings: Partial<Settings> = {}) {
    const mockCollector = {} as Collector.Instance;
    return (await destination.init({
      config: { settings: settings as Settings },
      collector: mockCollector,
      env: testEnv,
      logger: createMockLogger(),
      id: 'test-snapchat',
    })) as Config;
  }

  test('init - missing accessToken throws', async () => {
    const mockCollector = {} as Collector.Instance;
    await expect(
      destination.init({
        config: {},
        collector: mockCollector,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-snapchat',
      }),
    ).rejects.toThrow('Config settings accessToken missing');
  });

  test('init - missing pixelId throws', async () => {
    const mockCollector = {} as Collector.Instance;
    await expect(
      destination.init({
        config: { settings: { accessToken } as Settings },
        collector: mockCollector,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-snapchat',
      }),
    ).rejects.toThrow('Config settings pixelId missing');
  });

  test('init - valid settings returns config with defaults', async () => {
    const config = await getConfig({ accessToken, pixelId });
    expect(config).toEqual(
      expect.objectContaining({
        settings: {
          accessToken,
          pixelId,
          action_source: 'WEB',
          url: 'https://tr.snapchat.com/v3/',
        },
      }),
    );
  });

  test('sends correct URL with access_token query param', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-snapchat',
      }),
    );

    expect(mockSendServer).toHaveBeenCalled();
    const [url, , options] = mockSendServer.mock.calls[0];
    expect(url).toBe(
      `https://tr.snapchat.com/v3/${pixelId}/events?access_token=${accessToken}`,
    );
    // Token MUST be in URL (query param), not headers
    expect(url).toContain(accessToken);
    expect(options).toBeUndefined();
  });

  test('body includes data array with single event', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-snapchat',
      }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(body.data).toHaveLength(1);
  });

  test('event has event_name, event_time (unix seconds int), action_source WEB, event_source_url, event_id', async () => {
    const event = getEvent('page view', {
      timestamp: 1700000900000,
      source: {
        type: 'server',
        id: 'https://example.com/page',
        previous_id: '',
      },
    });
    const config: Config = {
      settings: { accessToken, pixelId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-snapchat',
      }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    const snap = body.data[0];
    expect(snap.event_name).toBe('page view');
    expect(snap.event_time).toBe(1700000900);
    expect(Number.isInteger(snap.event_time)).toBe(true);
    expect(snap.action_source).toBe('WEB');
    expect(snap.event_source_url).toBe('https://example.com/page');
    expect(snap.event_id).toBe(event.id);
  });

  test('properties go into custom_data (not flat on event root)', async () => {
    const dest = jest.requireActual('../').default;
    const event = getEvent('order complete', {
      timestamp: 1700000900000,
      data: { id: 'ORD-1', total: 100, currency: 'EUR' },
      source: {
        type: 'server',
        id: 'https://example.com/checkout',
        previous_id: '',
      },
    });

    elb(
      'walker destination',
      { ...dest, env: testEnv },
      {
        settings: { accessToken, pixelId },
        mapping: {
          order: {
            complete: {
              name: 'PURCHASE',
              data: {
                map: {
                  custom_data: {
                    map: {
                      value: 'data.total',
                      currency: 'data.currency',
                      transaction_id: 'data.id',
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    await elb(event);

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    const snap = body.data[0];
    expect(snap.custom_data).toEqual({
      value: 100,
      currency: 'EUR',
      transaction_id: 'ORD-1',
    });
    // Properties should NOT be flat on event root
    expect((snap as Record<string, unknown>).value).toBeUndefined();
    expect((snap as Record<string, unknown>).currency).toBeUndefined();
  });

  test('user_data present as empty object when no identity set', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-snapchat',
      }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    const snap = body.data[0];
    expect(snap.user_data).toBeDefined();
    expect(snap.user_data).toEqual({});
  });

  test('testMode swaps endpoint to /events/validate', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId, testMode: true },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-snapchat',
      }),
    );

    const [url] = mockSendServer.mock.calls[0];
    expect(url).toBe(
      `https://tr.snapchat.com/v3/${pixelId}/events/validate?access_token=${accessToken}`,
    );
  });

  test('user data is hashed', async () => {
    const event = getEvent('form submit', {
      user: { email: 'test@example.com' },
    });
    const config: Config = {
      settings: {
        accessToken,
        pixelId,
        user_data: { em: 'user.email' },
      },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-snapchat',
      }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    const userData = body.data[0].user_data;
    expect(userData.em).toBeDefined();
    expect(userData.em).toMatch(/^[a-f0-9]{64}$/);
    expect(userData.em).not.toBe('test@example.com');
  });

  test('user_data mapping resolves from settings', async () => {
    const event = getEvent('form submit', {
      user: { email: 'u@example.com', id: 'user-123' },
    });
    const config: Config = {
      settings: {
        accessToken,
        pixelId,
        user_data: { em: 'user.email', external_id: 'user.id' },
      },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-snapchat',
      }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    const userData = body.data[0].user_data;
    expect(userData.em).toMatch(/^[a-f0-9]{64}$/);
    expect(userData.external_id).toMatch(/^[a-f0-9]{64}$/);
  });

  test('hashing via hashUserData helper', async () => {
    const result = await hashUserData({
      em: 'm@i.l',
      sc_cookie1: 'cookie',
    });
    expect(result.em).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sc_cookie1).toBe('cookie');

    const result2 = await hashUserData({ em: 'm@i.l', ph: '+1234' }, ['em']);
    expect(result2.em).toBe('m@i.l');
    expect(result2.ph).toMatch(/^[a-f0-9]{64}$/);
  });

  test('environment customization', async () => {
    const customSendServer = jest.fn();
    customSendServer.mockResolvedValue({
      ok: true,
      data: JSON.stringify({ status: 'OK' }),
    });

    const customEnv = { sendServer: customSendServer };
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: customEnv,
        id: 'test-snapchat',
      }),
    );

    expect(customSendServer).toHaveBeenCalled();
    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('error response throws', async () => {
    mockSendServer.mockResolvedValue({
      ok: false,
      error: '401',
    });

    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
    };

    await expect(
      destination.push(
        event,
        createMockContext({
          config,
          env: testEnv,
          id: 'test-snapchat',
        }),
      ),
    ).rejects.toThrow();
  });

  test('integration - init + push via startFlow', async () => {
    const dest = jest.requireActual('../').default;
    const event = getEvent('page view', {
      timestamp: 1700000900000,
      source: {
        type: 'server',
        id: 'https://example.com/home',
        previous_id: '',
      },
    });

    elb(
      'walker destination',
      { ...dest, env: testEnv },
      {
        settings: { accessToken, pixelId },
      },
    );

    await elb(event);

    expect(mockSendServer).toHaveBeenCalledTimes(1);
    const [url, bodyStr] = mockSendServer.mock.calls[0];
    expect(url).toBe(
      `https://tr.snapchat.com/v3/${pixelId}/events?access_token=${accessToken}`,
    );
    const body = JSON.parse(bodyStr);
    expect(body.data[0].event_name).toBe('page view');
    expect(body.data[0].event_source_url).toBe('https://example.com/home');
  });
});
