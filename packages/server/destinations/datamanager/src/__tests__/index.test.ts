import type { WalkerOS } from '@walkeros/core';
import type {
  AuthClient,
  Config,
  DestinationInterface,
  Env,
  Settings,
} from '../types';
import {
  createIngest,
  createMockContext,
  createMockLogger,
  getEvent,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';

// Init builds its client through the library: record what it is built from.
const mockGoogleAuthOptions = jest.fn();
const mockGetClient = jest.fn();
jest.mock('google-auth-library', () => ({
  __esModule: true,
  GoogleAuth: class {
    constructor(options: unknown) {
      mockGoogleAuthOptions(options);
    }
    getClient() {
      return mockGetClient();
    }
  },
}));

describe('Server Destination Data Manager', () => {
  let destination: DestinationInterface;
  let elb: WalkerOS.Elb;
  const mockAccessToken = 'ya29.c.test_token';
  const mockGetRequestHeaders = jest.fn();
  const mockAuthClient: AuthClient = {
    getRequestHeaders: mockGetRequestHeaders,
  };
  const mockSendServer = jest.fn();
  const mockLogger = createMockLogger();
  const realFetch = globalThis.fetch;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockGetClient.mockResolvedValue(mockAuthClient);
    mockGetRequestHeaders.mockResolvedValue(
      new Headers({ authorization: `Bearer ${mockAccessToken}` }),
    );
    mockSendServer.mockResolvedValue({
      data: { requestId: 'test-request-id-123' },
    });

    globalThis.fetch = jest.fn(() => {
      throw new Error('a test reached the network');
    });

    destination = jest.requireActual('../').default;

    ({ elb } = await startFlow());
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  async function getConfig(settings: Settings) {
    return await destination.init({
      config: { settings },
      collector: createMockContext().collector,
      env: {},
      logger: mockLogger,
      id: 'test-dm',
    });
  }

  describe('init', () => {
    test('throws error when destinations is missing', async () => {
      await expect(
        destination.init({
          config: {},
          collector: createMockContext().collector,
          env: {},
          logger: mockLogger,
          id: 'test-dm',
        }),
      ).rejects.toThrow('Config settings destinations missing or empty');
    });

    test('throws error when destinations is empty', async () => {
      await expect(
        destination.init({
          config: {
            settings: { destinations: [] },
          },
          collector: createMockContext().collector,
          env: {},
          logger: mockLogger,
          id: 'test-dm',
        }),
      ).rejects.toThrow('Config settings destinations missing or empty');
    });

    test('succeeds with valid configuration', async () => {
      const config = await getConfig({
        destinations: [
          {
            operatingAccount: {
              accountId: '123-456-7890',
              accountType: 'GOOGLE_ADS',
            },
            productDestinationId: 'AW-CONVERSION-123',
          },
        ],
      });

      expect(config).toEqual(
        expect.objectContaining({
          settings: expect.objectContaining({
            destinations: expect.arrayContaining([
              expect.objectContaining({
                operatingAccount: expect.objectContaining({
                  accountId: '123-456-7890',
                  accountType: 'GOOGLE_ADS',
                }),
              }),
            ]),
          }),
          env: expect.objectContaining({
            authClient: mockAuthClient,
          }),
        }),
      );
    });

    test('keeps an injected authClient and does not create one', async () => {
      const injected: Env['authClient'] = examples.env.push.authClient;
      const result = await destination.init({
        config: { settings: defaultSettings },
        collector: createMockContext().collector,
        env: { authClient: injected },
        logger: mockLogger,
        id: 'test-dm',
      });
      expect(mockGoogleAuthOptions).not.toHaveBeenCalled();
      expect(
        result && 'env' in result ? result.env?.authClient : undefined,
      ).toBe(injected);
    });

    test('creates auth client during init', async () => {
      await getConfig({
        credentials: {
          client_email: 'test@example.com',
          private_key:
            '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        },
        destinations: [
          {
            operatingAccount: {
              accountId: '123-456-7890',
              accountType: 'GOOGLE_ADS',
            },
            productDestinationId: 'AW-CONVERSION-123',
          },
        ],
      });

      expect(mockGoogleAuthOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: expect.objectContaining({
            client_email: 'test@example.com',
          }),
        }),
      );
    });
  });

  const defaultSettings: Settings = {
    destinations: [
      {
        operatingAccount: {
          accountId: '123-456-7890',
          accountType: 'GOOGLE_ADS',
        },
        productDestinationId: 'AW-CONVERSION-123',
      },
    ],
  };

  const defaultConfig: Config = {
    settings: defaultSettings,
    data: {
      map: {
        transactionId: 'id',
      },
    },
  };

  describe('client IP and user agent auto-fill', () => {
    const ingest = {
      ...createIngest('test'),
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0 test',
    };
    const env = { authClient: mockAuthClient, sendServer: mockSendServer };
    const sentDeviceInfo = () =>
      JSON.parse(mockSendServer.mock.calls[0][1]).events[0].eventDeviceInfo;

    test('fills client IP and user agent from ingest by default', async () => {
      await destination.push(
        getEvent('order complete'),
        createMockContext({ config: { ...defaultConfig, env }, env, ingest }),
      );
      expect(sentDeviceInfo()).toEqual({
        ipAddress: '203.0.113.7',
        userAgent: 'Mozilla/5.0 test',
      });
    });

    test('falls back to event.user.ip and userAgent', async () => {
      const event = getEvent('order complete', {
        user: { id: 'us3r', ip: '198.51.100.2', userAgent: 'UA2' },
      });
      await destination.push(
        event,
        createMockContext({ config: { ...defaultConfig, env }, env }),
      );
      expect(sentDeviceInfo()).toEqual({
        ipAddress: '198.51.100.2',
        userAgent: 'UA2',
      });
    });

    test('sends neither when disabled with false', async () => {
      const config: Config = {
        ...defaultConfig,
        settings: { ...defaultSettings, ip: false, userAgent: false },
        env,
      };
      await destination.push(
        getEvent('order complete'),
        createMockContext({ config, env, ingest }),
      );
      expect(sentDeviceInfo()).toBeUndefined();
    });

    test('lets an explicitly mapped value win', async () => {
      await destination.push(
        getEvent('order complete'),
        createMockContext({
          config: { ...defaultConfig, env },
          data: { ipAddress: '10.0.0.1' },
          env,
          ingest,
        }),
      );
      expect(sentDeviceInfo()).toEqual({
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0 test',
      });
    });
  });

  describe('push', () => {
    test('sends event to Data Manager API', async () => {
      const event = getEvent('order complete');
      event.data.id = 'ORDER-123';
      event.data.value = 99.99;
      event.data.currency = 'USD';

      const config: Config = {
        ...defaultConfig,
        env: { authClient: mockAuthClient, sendServer: mockSendServer },
      };

      await destination.push(
        event,
        createMockContext({
          config,
          env: config.env!,
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      expect(mockGetRequestHeaders).toHaveBeenCalled();
      expect(mockSendServer).toHaveBeenCalledWith(
        'https://datamanager.googleapis.com/v1/events:ingest',
        expect.any(String),
        expect.objectContaining({
          headers: { authorization: `Bearer ${mockAccessToken}` },
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.events).toHaveLength(1);
      expect(requestBody.destinations).toEqual(defaultSettings.destinations);
    });

    test('includes event timestamp in RFC 3339 format', async () => {
      const event = getEvent('page view');

      await destination.push(
        event,
        createMockContext({
          config: defaultConfig,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      const eventTimestamp = requestBody.events[0].eventTimestamp;

      // Verify RFC 3339 format (ISO 8601)
      expect(eventTimestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    test('applies default eventSource (WEB) when not specified', async () => {
      const event = getEvent('page view');

      await destination.push(
        event,
        createMockContext({
          config: defaultConfig,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.events[0].eventSource).toBe('WEB');
    });

    test('applies custom eventSource from settings', async () => {
      const event = getEvent('page view');

      const config: Config = {
        ...defaultConfig,
        settings: {
          ...defaultSettings,
          eventSource: 'APP',
        },
      };

      await destination.push(
        event,
        createMockContext({
          config,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.events[0].eventSource).toBe('APP');
    });

    test('includes consent information', async () => {
      const event = getEvent('order complete');
      event.consent = { marketing: true, personalization: false };

      await destination.push(
        event,
        createMockContext({
          config: defaultConfig,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.events[0].consent).toEqual({
        adUserData: 'CONSENT_GRANTED',
        adPersonalization: 'CONSENT_DENIED',
      });
    });

    test('applies request-level consent', async () => {
      const event = getEvent('page view');

      const config: Config = {
        ...defaultConfig,
        settings: {
          ...defaultSettings,
          consent: {
            adUserData: 'CONSENT_GRANTED',
            adPersonalization: 'CONSENT_GRANTED',
          },
        },
      };

      await destination.push(
        event,
        createMockContext({
          config,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.consent).toEqual({
        adUserData: 'CONSENT_GRANTED',
        adPersonalization: 'CONSENT_GRANTED',
      });
    });

    test('uses validateOnly mode for testing', async () => {
      const event = getEvent('page view');

      const config: Config = {
        ...defaultConfig,
        settings: {
          ...defaultSettings,
          validateOnly: true,
        },
      };

      await destination.push(
        event,
        createMockContext({
          config,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.validateOnly).toBe(true);
    });

    test('delivers a 2xx answer without a request id', async () => {
      mockSendServer.mockResolvedValue({ data: {} });

      await expect(
        destination.push(
          getEvent('page view'),
          createMockContext({
            config: defaultConfig,
            env: { authClient: mockAuthClient, sendServer: mockSendServer },
            logger: mockLogger,
            id: 'test-dm',
          }),
        ),
      ).resolves.toBeUndefined();
    });

    test('uses custom URL when provided', async () => {
      const event = getEvent('page view');

      const config: Config = {
        ...defaultConfig,
        settings: {
          ...defaultSettings,
          url: 'https://custom-endpoint.com/v1',
        },
      };

      await destination.push(
        event,
        createMockContext({
          config,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      expect(mockSendServer).toHaveBeenCalledWith(
        'https://custom-endpoint.com/v1/events:ingest',
        expect.any(String),
        expect.any(Object),
      );
    });

    test('supports multiple destinations', async () => {
      const event = getEvent('order complete');

      const config: Config = {
        ...defaultConfig,
        settings: {
          destinations: [
            {
              operatingAccount: {
                accountId: '123-456-7890',
                accountType: 'GOOGLE_ADS',
              },
              productDestinationId: 'AW-CONVERSION-123',
            },
            {
              operatingAccount: {
                accountId: '987654321',
                accountType: 'GOOGLE_ANALYTICS_PROPERTY',
              },
              productDestinationId: 'G-XXXXXXXXXX',
            },
          ],
        },
        data: {
          map: {
            transactionId: 'id',
            eventName: { value: 'purchase' },
          },
        },
      };

      await destination.push(
        event,
        createMockContext({
          config,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.destinations).toHaveLength(2);
    });
  });

  describe('environment customization', () => {
    test('uses the sendServer of its env', async () => {
      const customSendServer = jest.fn();
      customSendServer.mockResolvedValue({ data: { requestId: 'custom-123' } });

      const event = getEvent('page view');

      await destination.push(
        event,
        createMockContext({
          config: {
            ...defaultConfig,
            settings: {
              destinations: [
                {
                  operatingAccount: {
                    accountId: '123-456-7890',
                    accountType: 'GOOGLE_ADS',
                  },
                  productDestinationId: 'AW-CONVERSION-123',
                },
              ],
            },
          },
          env: { authClient: mockAuthClient, sendServer: customSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      expect(customSendServer).toHaveBeenCalled();
      expect(mockSendServer).not.toHaveBeenCalled();
    });

    test('applies Settings guided helpers (userData)', async () => {
      const event = getEvent('order complete');
      event.user = { id: 'user@example.com' };
      event.data.phone = '+1234567890';

      const config: Config = {
        ...defaultConfig,
        settings: {
          destinations: [
            {
              operatingAccount: {
                accountId: '123-456-7890',
                accountType: 'GOOGLE_ADS',
              },
              productDestinationId: 'AW-CONVERSION-123',
            },
          ],
          userData: {
            email: 'user.id',
            phone: 'data.phone',
          },
        },
      };

      await destination.push(
        event,
        createMockContext({
          config,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.events[0].userData).toBeDefined();
      expect(requestBody.events[0].userData.userIdentifiers.length).toBe(2);
    });

    test('applies Settings guided helpers (userId, clientId)', async () => {
      const event = getEvent('page view');
      event.user = { id: 'user-123', device: 'device-456' };

      const config: Config = {
        ...defaultConfig,
        settings: {
          destinations: [
            {
              operatingAccount: {
                accountId: '123-456-7890',
                accountType: 'GOOGLE_ADS',
              },
              productDestinationId: 'AW-CONVERSION-123',
            },
          ],
          userId: 'user.id',
          clientId: 'user.device',
        },
      };

      await destination.push(
        event,
        createMockContext({
          config,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.events[0].userId).toBe('user-123');
      expect(requestBody.events[0].clientId).toBe('device-456');
    });

    test('applies Settings guided helpers (sessionAttributes)', async () => {
      const event = getEvent('order complete');
      event.context = {
        sessionAttributes: ['gad_source=1&gad_campaignid=123', 0],
      };

      const config: Config = {
        ...defaultConfig,
        settings: {
          destinations: [
            {
              operatingAccount: {
                accountId: '123-456-7890',
                accountType: 'GOOGLE_ADS',
              },
              productDestinationId: 'AW-CONVERSION-123',
            },
          ],
          sessionAttributes: 'context.sessionAttributes.0',
        },
      };

      await destination.push(
        event,
        createMockContext({
          config,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.events[0].adIdentifiers).toBeDefined();
      expect(requestBody.events[0].adIdentifiers.sessionAttributes).toBe(
        'gad_source=1&gad_campaignid=123',
      );
    });

    test('event mapping overrides Settings helpers', async () => {
      const event = getEvent('order complete');
      event.user = { id: 'default-user' };

      const config: Config = {
        ...defaultConfig,
        settings: {
          destinations: [
            {
              operatingAccount: {
                accountId: '123-456-7890',
                accountType: 'GOOGLE_ADS',
              },
              productDestinationId: 'AW-CONVERSION-123',
            },
          ],
          userId: 'user.id', // Settings helper
        },
        data: {
          map: {
            transactionId: 'id',
            userId: { value: 'override-user' }, // Event mapping override
          },
        },
      };

      await destination.push(
        event,
        createMockContext({
          config,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.events[0].userId).toBe('override-user');
    });
  });

  describe('consent mapping', () => {
    test('maps consent from Settings using string field names', async () => {
      const event = getEvent('order complete');
      event.consent = {
        ads: true,
        targeting: false,
      };

      const config: Config = {
        ...defaultConfig,
        settings: {
          destinations: [
            {
              operatingAccount: {
                accountId: '123-456-7890',
                accountType: 'GOOGLE_ADS',
              },
              productDestinationId: 'AW-CONVERSION-123',
            },
          ],
          consentAdUserData: 'ads',
          consentAdPersonalization: 'targeting',
        },
      };

      await destination.push(
        event,
        createMockContext({
          config,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.events[0].consent).toEqual({
        adUserData: 'CONSENT_GRANTED',
        adPersonalization: 'CONSENT_DENIED',
      });
    });

    test('maps consent from Settings using boolean static values', async () => {
      const event = getEvent('order complete');

      const config: Config = {
        ...defaultConfig,
        settings: {
          destinations: [
            {
              operatingAccount: {
                accountId: '123-456-7890',
                accountType: 'GOOGLE_ADS',
              },
              productDestinationId: 'AW-CONVERSION-123',
            },
          ],
          consentAdUserData: true,
          consentAdPersonalization: false,
        },
      };

      await destination.push(
        event,
        createMockContext({
          config,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.events[0].consent).toEqual({
        adUserData: 'CONSENT_GRANTED',
        adPersonalization: 'CONSENT_DENIED',
      });
    });

    test('falls back to event.consent with hardcoded field names', async () => {
      const event = getEvent('order complete');
      event.consent = {
        marketing: true,
        personalization: false,
      };

      const config: Config = {
        ...defaultConfig,
        settings: {
          destinations: [
            {
              operatingAccount: {
                accountId: '123-456-7890',
                accountType: 'GOOGLE_ADS',
              },
              productDestinationId: 'AW-CONVERSION-123',
            },
          ],
        },
      };

      await destination.push(
        event,
        createMockContext({
          config,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.events[0].consent).toEqual({
        adUserData: 'CONSENT_GRANTED',
        adPersonalization: 'CONSENT_DENIED',
      });
    });

    test('mapped consent overrides event.consent', async () => {
      const event = getEvent('order complete');
      event.consent = {
        marketing: false, // This should be ignored
        ads: true, // This should be used via Settings mapping
      };

      const config: Config = {
        ...defaultConfig,
        settings: {
          destinations: [
            {
              operatingAccount: {
                accountId: '123-456-7890',
                accountType: 'GOOGLE_ADS',
              },
              productDestinationId: 'AW-CONVERSION-123',
            },
          ],
          consentAdUserData: 'ads',
        },
      };

      await destination.push(
        event,
        createMockContext({
          config,
          env: { authClient: mockAuthClient, sendServer: mockSendServer },
          logger: mockLogger,
          id: 'test-dm',
        }),
      );

      const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
      expect(requestBody.events[0].consent).toEqual({
        adUserData: 'CONSENT_GRANTED',
      });
    });
  });
});
