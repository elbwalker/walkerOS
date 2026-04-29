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

describe('Server Destination LinkedIn', () => {
  let destination: Destination;
  let elb: WalkerOS.Elb;
  const accessToken = 's3cr3t';
  const conversionRuleId = '12345678';
  const mockSendServer = jest.fn();

  const testEnv = clone(env.push);
  testEnv.sendServer = mockSendServer;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockSendServer.mockResolvedValue({
      ok: true,
      data: {},
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
      id: 'test-linkedin',
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
        id: 'test-linkedin',
      }),
    ).rejects.toThrow('Config settings accessToken missing');
  });

  test('init - missing conversionRuleId throws', async () => {
    const mockCollector = {} as Collector.Instance;
    await expect(
      destination.init({
        config: { settings: { accessToken, conversionRuleId: '' } },
        collector: mockCollector,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-linkedin',
      }),
    ).rejects.toThrow('Config settings conversionRuleId missing');
  });

  test('init - valid config returns correctly', async () => {
    const config = await getConfig({ accessToken, conversionRuleId });
    expect(config).toEqual(
      expect.objectContaining({
        settings: { accessToken, conversionRuleId, apiVersion: '202604' },
      }),
    );
  });

  test('init - default apiVersion is 202604', async () => {
    const config = await getConfig({ accessToken, conversionRuleId });
    expect(config.settings.apiVersion).toBe('202604');
  });

  test('init - custom apiVersion is preserved', async () => {
    const config = await getConfig({
      accessToken,
      conversionRuleId,
      apiVersion: '202501',
    });
    expect(config.settings.apiVersion).toBe('202501');
  });

  test('environment customization', async () => {
    const customSendServer = jest.fn();
    customSendServer.mockResolvedValue({ ok: true, data: {} });

    const customEnv = { sendServer: customSendServer };
    const event = getEvent('form submit', {
      user: { email: 'test@test.com' },
    });
    const config: Config = {
      settings: { accessToken, conversionRuleId, apiVersion: '202604' },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: customEnv,
        id: 'test-linkedin',
      }),
    );

    expect(customSendServer).toHaveBeenCalled();
    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('error handling - non-ok response triggers throw', async () => {
    mockSendServer.mockResolvedValue({
      ok: false,
      data: { message: 'Invalid token' },
      error: '401 Unauthorized',
    });

    const event = getEvent('form submit', {
      user: { email: 'test@test.com' },
    });
    const config: Config = {
      settings: { accessToken, conversionRuleId, apiVersion: '202604' },
    };

    await expect(
      destination.push(
        event,
        createMockContext({
          config,
          env: testEnv,
          id: 'test-linkedin',
        }),
      ),
    ).rejects.toThrow();
  });

  test('headers - all 5 required headers are sent', async () => {
    const event = getEvent('form submit', {
      user: { email: 'test@test.com' },
    });
    const config: Config = {
      settings: {
        accessToken,
        conversionRuleId,
        apiVersion: '202604',
      },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-linkedin',
      }),
    );

    expect(mockSendServer).toHaveBeenCalled();
    const options = mockSendServer.mock.calls[0][2];
    expect(options.headers).toEqual({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'X-RestLi-Method': 'BATCH_CREATE',
      'Linkedin-Version': '202604',
    });
  });

  test('headers - custom apiVersion in Linkedin-Version header', async () => {
    const event = getEvent('form submit', {
      user: { email: 'test@test.com' },
    });
    const config: Config = {
      settings: {
        accessToken,
        conversionRuleId,
        apiVersion: '202501',
      },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-linkedin',
      }),
    );

    const options = mockSendServer.mock.calls[0][2];
    expect(options.headers['Linkedin-Version']).toBe('202501');
  });

  test('email hashing - email is SHA-256 hashed, lowercase trimmed', async () => {
    const event = getEvent('form submit', {
      user: { email: '  User@Example.COM  ' },
    });
    const config: Config = {
      settings: { accessToken, conversionRuleId, apiVersion: '202604' },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-linkedin',
      }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const userIds = requestBody.elements[0].user.userIds;
    expect(userIds).toHaveLength(1);
    expect(userIds[0].idType).toBe('SHA256_EMAIL');
    // Should be SHA-256 of "user@example.com" (trimmed + lowered)
    expect(userIds[0].idValue).toBe(
      'b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514',
    );
  });

  test('email hashing - doNotHash skips hashing', async () => {
    const event = getEvent('form submit', {
      user: { email: 'already-hashed-value' },
    });
    const config: Config = {
      settings: {
        accessToken,
        conversionRuleId,
        apiVersion: '202604',
        doNotHash: ['email'],
      },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-linkedin',
      }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const userIds = requestBody.elements[0].user.userIds;
    expect(userIds[0].idValue).toBe('already-hashed-value');
  });

  test('no userIds skips - event without email or li_fat_id does not call sendServer', async () => {
    const event = getEvent('form submit', {
      user: { id: 'user-123' },
    });
    const config: Config = {
      settings: { accessToken, conversionRuleId, apiVersion: '202604' },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-linkedin',
      }),
    );

    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('conversion value - amount is string in payload', async () => {
    const event = getEvent('order complete', {
      timestamp: 1700000000000,
      data: { total: 99.99, currency: 'EUR' },
      user: { email: 'test@test.com' },
    });
    const config: Config = {
      settings: { accessToken, conversionRuleId, apiVersion: '202604' },
      mapping: {
        order: {
          complete: {
            settings: {
              conversion: {
                map: {
                  value: 'data.total',
                  currency: { key: 'data.currency', value: 'EUR' },
                },
              },
            },
          },
        },
      } as Rules,
    };

    const { elb } = await startFlow();
    const destinationWithEnv = { ...destination, env: testEnv };
    await elb('walker destination', destinationWithEnv, config);
    await elb(event);

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const cv = requestBody.elements[0].conversionValue;
    expect(cv.amount).toBe('99.99');
    expect(typeof cv.amount).toBe('string');
    expect(cv.currencyCode).toBe('EUR');
  });

  test('per-event ruleId override', async () => {
    const event = getEvent('order complete', {
      timestamp: 1700000000000,
      user: { email: 'test@test.com' },
    });
    const config: Config = {
      settings: { accessToken, conversionRuleId, apiVersion: '202604' },
      mapping: {
        order: {
          complete: {
            settings: {
              conversion: {
                map: {
                  ruleId: { value: '99999999' },
                },
              },
            },
          },
        },
      } as Rules,
    };

    const { elb } = await startFlow();
    const destinationWithEnv = { ...destination, env: testEnv };
    await elb('walker destination', destinationWithEnv, config);
    await elb(event);

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.elements[0].conversion).toBe(
      'urn:lla:llaPartnerConversion:99999999',
    );
  });

  test('conversionHappenedAt uses event.timestamp in milliseconds', async () => {
    const event = getEvent('form submit', {
      timestamp: 1700000900000,
      user: { email: 'test@test.com' },
    });
    const config: Config = {
      settings: { accessToken, conversionRuleId, apiVersion: '202604' },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-linkedin',
      }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.elements[0].conversionHappenedAt).toBe(1700000900000);
  });

  test('eventId from event.id for deduplication', async () => {
    const event = getEvent('form submit', {
      timestamp: 1700000900000,
      user: { email: 'test@test.com' },
    });
    const config: Config = {
      settings: { accessToken, conversionRuleId, apiVersion: '202604' },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-linkedin',
      }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.elements[0].eventId).toBe(event.id);
  });

  test('endpoint uses default URL', async () => {
    const event = getEvent('form submit', {
      user: { email: 'test@test.com' },
    });
    const config: Config = {
      settings: { accessToken, conversionRuleId, apiVersion: '202604' },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-linkedin',
      }),
    );

    const calledUrl = mockSendServer.mock.calls[0][0];
    expect(calledUrl).toBe('https://api.linkedin.com/rest/conversionEvents');
  });

  test('endpoint uses custom URL', async () => {
    const event = getEvent('form submit', {
      user: { email: 'test@test.com' },
    });
    const config: Config = {
      settings: {
        accessToken,
        conversionRuleId,
        apiVersion: '202604',
        url: 'https://custom.api.com/rest/',
      },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-linkedin',
      }),
    );

    const calledUrl = mockSendServer.mock.calls[0][0];
    expect(calledUrl).toBe('https://custom.api.com/rest/conversionEvents');
  });
});
