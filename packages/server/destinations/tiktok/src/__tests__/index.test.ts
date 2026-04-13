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
import { hashUserData } from '../hash';

const { env } = examples;

describe('Server Destination TikTok', () => {
  let destination: Destination;
  let elb: WalkerOS.Elb;
  const accessToken = 's3cr3t';
  const pixelCode = 'C0ABC123';
  const mockSendServer = jest.fn();

  const testEnv = clone(env.push);
  testEnv.sendServer = mockSendServer;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mockSendServer to default successful response
    mockSendServer.mockResolvedValue({
      ok: true,
      data: JSON.stringify({ code: 0, message: 'OK' }),
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
      id: 'test-tiktok',
    })) as Config;
  }

  test('init - missing pixelCode throws', async () => {
    const mockCollector = {} as Collector.Instance;
    await expect(
      destination.init({
        config: { settings: { accessToken } as Settings },
        collector: mockCollector,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-tiktok',
      }),
    ).rejects.toThrow('Config settings pixelCode missing');
  });

  test('init - missing accessToken throws', async () => {
    const mockCollector = {} as Collector.Instance;
    await expect(
      destination.init({
        config: {},
        collector: mockCollector,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-tiktok',
      }),
    ).rejects.toThrow('Config settings accessToken missing');
  });

  test('init - valid settings returns config with defaults', async () => {
    const config = await getConfig({ accessToken, pixelCode });
    expect(config).toEqual(
      expect.objectContaining({
        settings: {
          accessToken,
          pixelCode,
          partner_name: 'walkerOS',
        },
      }),
    );
  });

  test('sends Access-Token header', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelCode },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-tiktok',
      }),
    );

    expect(mockSendServer).toHaveBeenCalled();
    const [url, body, options] = mockSendServer.mock.calls[0];
    expect(options).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          'Access-Token': accessToken,
        }),
      }),
    );
    // Token NOT in URL
    expect(url).not.toContain(accessToken);
  });

  test('sends correct URL', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelCode },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-tiktok',
      }),
    );

    const [url] = mockSendServer.mock.calls[0];
    expect(url).toBe(
      'https://business-api.tiktok.com/open_api/v1.3/event/track/',
    );
  });

  test('body includes pixel_code, partner_name, data', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelCode, partner_name: 'walkerOS' },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-tiktok',
      }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.pixel_code).toBe(pixelCode);
    expect(requestBody.partner_name).toBe('walkerOS');
    expect(requestBody.data).toHaveLength(1);
  });

  test('event data has event, event_id, timestamp', async () => {
    const event = getEvent('page view', { timestamp: 1700000900000 });
    const config: Config = {
      settings: { accessToken, pixelCode },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-tiktok',
      }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const eventData = requestBody.data[0];
    expect(eventData.event).toBe('page view');
    expect(eventData.event_id).toBe(event.id);
    expect(eventData.timestamp).toBe('2023-11-14T22:28:20.000Z');
  });

  test('test_event_code included when set', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelCode, test_event_code: 'TEST12345' },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-tiktok',
      }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.test_event_code).toBe('TEST12345');
  });

  test('context.page.url from event.source.id', async () => {
    const event = getEvent('page view', {
      source: {
        type: 'server',
        id: 'https://example.com/page',
        previous_id: '',
      },
    });
    const config: Config = {
      settings: { accessToken, pixelCode },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-tiktok',
      }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.data[0].context.page.url).toBe(
      'https://example.com/page',
    );
  });

  test('user data is hashed', async () => {
    const event = getEvent('form submit', {
      user: { email: 'test@example.com' },
    });
    const config: Config = {
      settings: {
        accessToken,
        pixelCode,
        user_data: { email: { key: 'user.email' } },
      },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-tiktok',
      }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const userData = requestBody.data[0].context.user;
    expect(userData.email).toBeDefined();
    // Should be hashed (64 hex chars)
    expect(userData.email).toMatch(/^[a-f0-9]{64}$/);
    expect(userData.email).not.toBe('test@example.com');
  });

  test('hashing', async () => {
    const result = await hashUserData({
      email: 'm@i.l',
      ttp: 'cookie',
    });
    expect(result.email).toMatch(/^[a-f0-9]{64}$/);
    expect(result.ttp).toBe('cookie');

    // Respect doNotHash
    const result2 = await hashUserData(
      { email: 'm@i.l', phone_number: '+1234' },
      ['email'],
    );
    expect(result2.email).toBe('m@i.l');
    expect(result2.phone_number).toMatch(/^[a-f0-9]{64}$/);
  });

  test('environment customization', async () => {
    const customSendServer = jest.fn();
    customSendServer.mockResolvedValue({
      ok: true,
      data: JSON.stringify({ code: 0, message: 'OK' }),
    });

    const customEnv = { sendServer: customSendServer };
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelCode },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: customEnv,
        id: 'test-tiktok',
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
      settings: { accessToken, pixelCode },
    };

    await expect(
      destination.push(
        event,
        createMockContext({
          config,
          env: testEnv,
          id: 'test-tiktok',
        }),
      ),
    ).rejects.toThrow();
  });
});
