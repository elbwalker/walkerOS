import type { WalkerOS, Collector } from '@walkeros/core';
import type { Config, Destination, Rules, Settings } from '../types';
import {
  clone,
  getEvent,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';

const { env } = examples;

describe('Server Destination Twitter', () => {
  let destination: Destination;
  let elb: WalkerOS.Elb;
  const pixelId = 'o8z6j';
  const eventId = 'tw-o8z6j-o8z21';
  const consumerKey = 'consumer-key';
  const consumerSecret = 'consumer-secret';
  const accessToken = 'access-token';
  const accessTokenSecret = 'access-token-secret';
  const mockSendServer = jest.fn();

  const baseSettings: Settings = {
    pixelId,
    eventId,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
    apiVersion: '12',
  };

  const testEnv = clone(env.push);
  testEnv.sendServer = mockSendServer;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockSendServer.mockResolvedValue({
      ok: true,
      data: { request_id: 'mock-request-id' },
    });

    destination = jest.requireActual('../').default;

    ({ elb } = await startFlow());
  });

  async function initConfig(settings: Partial<Settings> = {}) {
    const mockCollector = {} as Collector.Instance;
    return (await destination.init({
      config: { settings: settings as Settings },
      collector: mockCollector,
      env: testEnv,
      logger: createMockLogger(),
      id: 'test-twitter',
    })) as Config;
  }

  test('init - missing pixelId throws', async () => {
    await expect(
      initConfig({
        eventId,
        consumerKey,
        consumerSecret,
        accessToken,
        accessTokenSecret,
      }),
    ).rejects.toThrow('Config settings pixelId missing');
  });

  test('init - missing eventId throws', async () => {
    await expect(
      initConfig({
        pixelId,
        consumerKey,
        consumerSecret,
        accessToken,
        accessTokenSecret,
      }),
    ).rejects.toThrow('Config settings eventId missing');
  });

  test('init - missing consumerKey throws', async () => {
    await expect(
      initConfig({
        pixelId,
        eventId,
        consumerSecret,
        accessToken,
        accessTokenSecret,
      }),
    ).rejects.toThrow('Config settings consumerKey missing');
  });

  test('init - missing consumerSecret throws', async () => {
    await expect(
      initConfig({
        pixelId,
        eventId,
        consumerKey,
        accessToken,
        accessTokenSecret,
      }),
    ).rejects.toThrow('Config settings consumerSecret missing');
  });

  test('init - missing accessToken throws', async () => {
    await expect(
      initConfig({
        pixelId,
        eventId,
        consumerKey,
        consumerSecret,
        accessTokenSecret,
      }),
    ).rejects.toThrow('Config settings accessToken missing');
  });

  test('init - missing accessTokenSecret throws', async () => {
    await expect(
      initConfig({
        pixelId,
        eventId,
        consumerKey,
        consumerSecret,
        accessToken,
      }),
    ).rejects.toThrow('Config settings accessTokenSecret missing');
  });

  test('init - valid config returns correctly', async () => {
    const config = await initConfig(baseSettings);
    expect(config).toEqual(
      expect.objectContaining({
        settings: {
          pixelId,
          eventId,
          consumerKey,
          consumerSecret,
          accessToken,
          accessTokenSecret,
          apiVersion: '12',
        },
      }),
    );
  });

  test('init - default apiVersion is 12', async () => {
    const config = await initConfig({
      pixelId,
      eventId,
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
    });
    expect(config.settings.apiVersion).toBe('12');
  });

  test('init - custom apiVersion preserved', async () => {
    const config = await initConfig({ ...baseSettings, apiVersion: '13' });
    expect(config.settings.apiVersion).toBe('13');
  });

  test('environment customization', async () => {
    const customSendServer = jest.fn();
    customSendServer.mockResolvedValue({ ok: true, data: {} });

    const customEnv = { sendServer: customSendServer };
    const event = getEvent('form submit', {
      user: { email: 'test@test.com' },
    });
    const config: Config = { settings: baseSettings };

    await destination.push(
      event,
      createMockContext({
        config,
        env: customEnv,
        id: 'test-twitter',
      }),
    );

    expect(customSendServer).toHaveBeenCalled();
    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('error handling - non-ok response triggers throw', async () => {
    mockSendServer.mockResolvedValue({
      ok: false,
      data: { message: 'Invalid auth' },
      error: '401 Unauthorized',
    });

    const event = getEvent('form submit', {
      user: { email: 'test@test.com' },
    });
    const config: Config = { settings: baseSettings };

    await expect(
      destination.push(
        event,
        createMockContext({
          config,
          env: testEnv,
          id: 'test-twitter',
        }),
      ),
    ).rejects.toThrow();
  });

  test('OAuth Authorization header is present and well-formed', async () => {
    const event = getEvent('form submit', {
      user: { email: 'test@test.com' },
    });
    const config: Config = { settings: baseSettings };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-twitter' }),
    );

    expect(mockSendServer).toHaveBeenCalled();
    const options = mockSendServer.mock.calls[0][2];
    const authHeader = options.headers.Authorization;
    expect(typeof authHeader).toBe('string');
    expect(authHeader.startsWith('OAuth ')).toBe(true);
    expect(authHeader).toContain('oauth_consumer_key');
    expect(authHeader).toContain('oauth_signature');
    expect(authHeader).toContain('oauth_token');
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  test('endpoint uses default URL with apiVersion and pixelId', async () => {
    const event = getEvent('form submit', {
      user: { email: 'test@test.com' },
    });
    const config: Config = { settings: baseSettings };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-twitter' }),
    );

    const calledUrl = mockSendServer.mock.calls[0][0];
    expect(calledUrl).toBe(
      `https://ads-api.x.com/12/measurement/conversions/${pixelId}`,
    );
  });

  test('endpoint uses custom URL override', async () => {
    const event = getEvent('form submit', {
      user: { email: 'test@test.com' },
    });
    const config: Config = {
      settings: { ...baseSettings, url: 'https://custom.example.com/' },
    };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-twitter' }),
    );

    const calledUrl = mockSendServer.mock.calls[0][0];
    expect(calledUrl).toBe(
      `https://custom.example.com/12/measurement/conversions/${pixelId}`,
    );
  });

  test('email hashing - email is SHA-256 hashed, trimmed, lowercased', async () => {
    const event = getEvent('form submit', {
      user: { email: '  User@Example.COM  ' },
    });
    const config: Config = { settings: baseSettings };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-twitter' }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const identifiers = requestBody.conversions[0].identifiers;
    expect(identifiers).toHaveLength(1);
    expect(identifiers[0]).toEqual({
      hashed_email:
        'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
    });
  });

  test('email hashing - doNotHash skips hashing', async () => {
    const event = getEvent('form submit', {
      user: { email: 'already-hashed-email' },
    });
    const config: Config = {
      settings: { ...baseSettings, doNotHash: ['email'] },
    };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-twitter' }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.conversions[0].identifiers[0]).toEqual({
      hashed_email: 'already-hashed-email',
    });
  });

  test('phone hashing - phone is SHA-256 hashed', async () => {
    const event = getEvent('form submit', {
      user: { phone: '+1234567890' },
    });
    const config: Config = { settings: baseSettings };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-twitter' }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const identifiers = requestBody.conversions[0].identifiers;
    expect(identifiers).toHaveLength(1);
    expect(identifiers[0]).toHaveProperty('hashed_phone_number');
    const hashed = identifiers[0].hashed_phone_number;
    expect(typeof hashed).toBe('string');
    expect(hashed.length).toBe(64);
    expect(hashed).not.toBe('+1234567890');
  });

  test('twclid passthrough - not hashed', async () => {
    const event = getEvent('form submit', {
      user: { email: 'test@test.com' },
      context: { twclid: ['raw-twclid-value', 0] },
    });
    const config: Config = {
      settings: {
        ...baseSettings,
        user_data: { twclid: 'context.twclid' },
      },
    };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-twitter' }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const identifiers = requestBody.conversions[0].identifiers;
    const twclidId = identifiers.find(
      (id: Record<string, string>) => 'twclid' in id,
    );
    expect(twclidId).toEqual({ twclid: 'raw-twclid-value' });
  });

  test('no primary identifier - event is skipped', async () => {
    const event = getEvent('form submit', {
      user: { id: 'user-123' },
    });
    const config: Config = { settings: baseSettings };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-twitter' }),
    );

    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('conversion_time is ISO 8601 format', async () => {
    const event = getEvent('form submit', {
      timestamp: 1700000900000,
      user: { email: 'test@test.com' },
    });
    const config: Config = { settings: baseSettings };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-twitter' }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.conversions[0].conversion_time).toBe(
      '2023-11-14T22:28:20.000Z',
    );
  });

  test('conversion_id equals event.id', async () => {
    const event = getEvent('form submit', {
      user: { email: 'test@test.com' },
    });
    const config: Config = { settings: baseSettings };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-twitter' }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.conversions[0].conversion_id).toBe(event.id);
  });

  test('value is cast to string in payload', async () => {
    const event = getEvent('order complete', {
      timestamp: 1700000000000,
      data: { total: 99.99, currency: 'EUR' },
      user: { email: 'test@test.com' },
    });
    const config: Config = {
      settings: baseSettings,
      mapping: {
        order: {
          complete: {
            settings: {
              value: 'data.total',
              currency: { key: 'data.currency', value: 'EUR' },
            },
          },
        },
      } as Rules,
    };

    const { elb: flowElb } = await startFlow();
    const destinationWithEnv = { ...destination, env: testEnv };
    await flowElb('walker destination', destinationWithEnv, config);
    await flowElb(event);

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const conversion = requestBody.conversions[0];
    expect(conversion.value).toBe('99.99');
    expect(typeof conversion.value).toBe('string');
  });

  test('per-event eventId override via mapping.settings.eventId', async () => {
    const event = getEvent('order complete', {
      user: { email: 'test@test.com' },
    });
    const config: Config = {
      settings: baseSettings,
      mapping: {
        order: {
          complete: {
            settings: {
              eventId: { value: 'tw-override-abc12' },
            },
          },
        },
      } as Rules,
    };

    const { elb: flowElb } = await startFlow();
    const destinationWithEnv = { ...destination, env: testEnv };
    await flowElb('walker destination', destinationWithEnv, config);
    await flowElb(event);

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.conversions[0].event_id).toBe('tw-override-abc12');
  });

  test('number_items passthrough as integer', async () => {
    const event = getEvent('order complete', {
      data: { count: 3 },
      user: { email: 'test@test.com' },
    });
    const config: Config = {
      settings: baseSettings,
      mapping: {
        order: {
          complete: {
            settings: {
              number_items: 'data.count',
            },
          },
        },
      } as Rules,
    };

    const { elb: flowElb } = await startFlow();
    const destinationWithEnv = { ...destination, env: testEnv };
    await flowElb('walker destination', destinationWithEnv, config);
    await flowElb(event);

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.conversions[0].number_items).toBe(3);
  });

  test('identifiers array - each is a separate single-key object', async () => {
    const event = getEvent('order complete', {
      user: { email: 'test@test.com', phone: '+1234567890' },
      context: { twclid: ['raw-twclid', 0] },
    });
    const config: Config = {
      settings: {
        ...baseSettings,
        user_data: { twclid: 'context.twclid' },
      },
    };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-twitter' }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const identifiers = requestBody.conversions[0].identifiers;
    expect(identifiers.length).toBeGreaterThanOrEqual(3);
    for (const id of identifiers) {
      expect(Object.keys(id).length).toBe(1);
    }
  });
});
