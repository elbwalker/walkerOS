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

describe('Server Destination Bing', () => {
  let destination: Destination;
  let elb: WalkerOS.Elb;
  const accessToken = 's3cr3t';
  const tagId = 'UET-12345';
  const mockSendServer = jest.fn();

  const testEnv = clone(env.push);
  testEnv.sendServer = mockSendServer;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockSendServer.mockResolvedValue({
      ok: true,
      data: JSON.stringify({ status: 'OK', requestId: 'req-1' }),
    });

    destination = jest.requireActual('../').default;

    ({ elb } = await startFlow());
  });

  async function getConfig(settings: Partial<Settings> = {}) {
    const mockCollector = {} as Collector.Instance;
    return (await destination.init({
      config: { settings: settings as Settings },
      collector: mockCollector,
      env: testEnv,
      logger: createMockLogger(),
      id: 'test-bing',
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
        id: 'test-bing',
      }),
    ).rejects.toThrow('Config settings accessToken missing');
  });

  test('init - missing tagId throws', async () => {
    const mockCollector = {} as Collector.Instance;
    await expect(
      destination.init({
        config: { settings: { accessToken } as Settings },
        collector: mockCollector,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-bing',
      }),
    ).rejects.toThrow('Config settings tagId missing');
  });

  test('init - valid settings returns config with defaults', async () => {
    const config = await getConfig({ accessToken, tagId });
    expect(config).toEqual(
      expect.objectContaining({
        settings: expect.objectContaining({
          accessToken,
          tagId,
          url: 'https://capi.uet.microsoft.com/v1/',
          dataProvider: 'walkerOS',
        }),
      }),
    );
  });

  test('sends correct URL with tagId in path', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, tagId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-bing',
      }),
    );

    expect(mockSendServer).toHaveBeenCalled();
    const [url, , options] = mockSendServer.mock.calls[0];
    expect(url).toBe(`https://capi.uet.microsoft.com/v1/${tagId}/events`);
    // Token MUST be in Authorization header, NOT in URL
    expect(url).not.toContain(accessToken);
    expect(options).toBeDefined();
    expect(options.headers.Authorization).toBe(`Bearer ${accessToken}`);
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  test('body includes data array with single event and dataProvider', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, tagId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-bing',
      }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(body.data).toHaveLength(1);
    expect(body.dataProvider).toBe('walkerOS');
  });

  test('event has eventType (default custom), eventId, eventTime (unix seconds int), eventSourceUrl, adStorageConsent', async () => {
    const event = getEvent('page view', {
      timestamp: 1700000900000,
      source: {
        type: 'browser',
        platform: 'web',
        url: 'https://example.com/page',
      },
    });
    const config: Config = {
      settings: { accessToken, tagId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-bing',
      }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    const bing = body.data[0];
    expect(bing.eventType).toBe('custom');
    expect(bing.eventName).toBe('page view');
    expect(bing.eventTime).toBe(1700000900);
    expect(Number.isInteger(bing.eventTime)).toBe(true);
    expect(bing.eventSourceUrl).toBe('https://example.com/page');
    expect(bing.eventId).toBe(event.id);
    expect(bing.adStorageConsent).toBe('G');
  });

  test('eventType "pageLoad" when mapping.settings.eventType is "pageLoad"', async () => {
    const dest = jest.requireActual('../').default;
    const event = getEvent('page view', {
      timestamp: 1700000900000,
      source: {
        type: 'browser',
        platform: 'web',
        url: 'https://example.com/home',
      },
    });

    elb(
      'walker destination',
      { ...dest, env: testEnv },
      {
        settings: { accessToken, tagId },
        mapping: {
          page: {
            view: {
              settings: { eventType: 'pageLoad' },
            },
          },
        },
      },
    );

    await elb(event);

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    const bing = body.data[0];
    expect(bing.eventType).toBe('pageLoad');
    // pageLoad events should not include eventName
    expect(bing.eventName).toBeUndefined();
  });

  test('properties go into customData (not flat on event root)', async () => {
    const dest = jest.requireActual('../').default;
    const event = getEvent('order complete', {
      timestamp: 1700000900000,
      data: { id: 'ORD-1', total: 100, currency: 'EUR' },
      source: {
        type: 'browser',
        platform: 'web',
        url: 'https://example.com/checkout',
      },
    });

    elb(
      'walker destination',
      { ...dest, env: testEnv },
      {
        settings: { accessToken, tagId },
        mapping: {
          order: {
            complete: {
              name: 'purchase',
              data: {
                map: {
                  customData: {
                    map: {
                      value: 'data.total',
                      currency: 'data.currency',
                      transactionId: 'data.id',
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
    const bing = body.data[0];
    expect(bing.customData).toEqual({
      value: 100,
      currency: 'EUR',
      transactionId: 'ORD-1',
    });
    expect((bing as Record<string, unknown>).value).toBeUndefined();
    expect((bing as Record<string, unknown>).currency).toBeUndefined();
  });

  test('userData present as empty object when no identity set', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, tagId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-bing',
      }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    const bing = body.data[0];
    expect(bing.userData).toBeDefined();
    expect(bing.userData).toEqual({});
  });

  test('continueOnValidationError passed through when set', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, tagId, continueOnValidationError: true },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-bing',
      }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(body.continueOnValidationError).toBe(true);
  });

  test('user data is hashed (em)', async () => {
    const event = getEvent('form submit', {
      user: { email: 'test@example.com' },
    });
    const config: Config = {
      settings: {
        accessToken,
        tagId,
        user_data: { em: 'user.email' },
      },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-bing',
      }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    const userData = body.data[0].userData;
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
        tagId,
        user_data: { em: 'user.email', externalId: 'user.id' },
      },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-bing',
      }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    const userData = body.data[0].userData;
    expect(userData.em).toMatch(/^[a-f0-9]{64}$/);
    // externalId is NOT hashed in Bing CAPI
    expect(userData.externalId).toBe('user-123');
  });

  test('hashing via hashUserData helper', async () => {
    const result = await hashUserData({
      em: 'user@example.com',
      externalId: 'ext-1',
    });
    expect(result.em).toMatch(/^[a-f0-9]{64}$/);
    expect(result.externalId).toBe('ext-1');

    const result2 = await hashUserData(
      { em: 'user@example.com', ph: '+1234' },
      ['em'],
    );
    expect(result2.em).toBe('user@example.com');
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
      settings: { accessToken, tagId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: customEnv,
        id: 'test-bing',
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
      settings: { accessToken, tagId },
    };

    await expect(
      destination.push(
        event,
        createMockContext({
          config,
          env: testEnv,
          id: 'test-bing',
        }),
      ),
    ).rejects.toThrow();
  });

  test('integration - init + push via startFlow', async () => {
    const dest = jest.requireActual('../').default;
    const event = getEvent('page view', {
      timestamp: 1700000900000,
      source: {
        type: 'browser',
        platform: 'web',
        url: 'https://example.com/home',
      },
    });

    elb(
      'walker destination',
      { ...dest, env: testEnv },
      {
        settings: { accessToken, tagId },
      },
    );

    await elb(event);

    expect(mockSendServer).toHaveBeenCalledTimes(1);
    const [url, bodyStr, options] = mockSendServer.mock.calls[0];
    expect(url).toBe(`https://capi.uet.microsoft.com/v1/${tagId}/events`);
    expect(options.headers.Authorization).toBe(`Bearer ${accessToken}`);
    const body = JSON.parse(bodyStr);
    expect(body.dataProvider).toBe('walkerOS');
    expect(body.data[0].eventType).toBe('custom');
    expect(body.data[0].eventName).toBe('page view');
    expect(body.data[0].eventSourceUrl).toBe('https://example.com/home');
  });
});
