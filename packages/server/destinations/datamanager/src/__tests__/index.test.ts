import type { WalkerOS, Collector } from '@walkeros/core';
import type { Config, DestinationInterface, Settings } from '../types';
import { getEvent } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';

describe('Server Destination Data Manager', () => {
  let destination: DestinationInterface;
  let elb: WalkerOS.Elb;
  const accessToken = 'ya29.c.test_token';
  const mockFetch = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mockFetch to default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        requestId: 'test-request-id-123',
        validationErrors: [],
      }),
    });

    // Set global fetch mock
    global.fetch = mockFetch;

    destination = jest.requireActual('../').default;

    ({ elb } = await startFlow({
      tagging: 2,
    }));
  });

  afterEach(() => {
    delete (global as { fetch?: unknown }).fetch;
  });

  async function getConfig(settings: Partial<Settings> = {}) {
    const mockCollector = {} as Collector.Instance;
    return (await destination.init({
      config: { settings: settings as Settings },
      collector: mockCollector,
      env: {},
    })) as Config;
  }

  describe('init', () => {
    test('throws error when accessToken is missing', async () => {
      const mockCollector = {} as Collector.Instance;
      await expect(
        destination.init({
          config: {},
          collector: mockCollector,
          env: {},
        }),
      ).rejects.toThrow('Config settings accessToken missing');
    });

    test('throws error when destinations is missing', async () => {
      const mockCollector = {} as Collector.Instance;
      await expect(
        destination.init({
          config: { settings: { accessToken } as Settings },
          collector: mockCollector,
          env: {},
        }),
      ).rejects.toThrow('Config settings destinations missing or empty');
    });

    test('succeeds with valid configuration', async () => {
      const config = await getConfig({
        accessToken,
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
            accessToken,
            destinations: expect.arrayContaining([
              expect.objectContaining({
                operatingAccount: expect.objectContaining({
                  accountId: '123-456-7890',
                  accountType: 'GOOGLE_ADS',
                }),
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('push', () => {
    const defaultSettings: Settings = {
      accessToken,
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

    test('sends event to Data Manager API', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('order complete');
      (event.data as Record<string, unknown>).id = 'ORDER-123';
      (event.data as Record<string, unknown>).total = 99.99;
      (event.data as Record<string, unknown>).currency = 'USD';

      const config: Config = {
        settings: defaultSettings,
      };

      await destination.push(event, {
        config,
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://datamanager.googleapis.com/v1/events:ingest',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }),
        }),
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.events).toHaveLength(1);
      expect(requestBody.destinations).toEqual(defaultSettings.destinations);
    });

    test('includes event timestamp in RFC 3339 format', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('page view');

      await destination.push(event, {
        config: { settings: defaultSettings },
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const eventTimestamp = requestBody.events[0].eventTimestamp;

      // Verify RFC 3339 format (ISO 8601)
      expect(eventTimestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    test('includes transactionId for deduplication', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('order complete');
      (event.data as Record<string, unknown>).id = 'TXN-12345';

      const config: Config = {
        settings: defaultSettings,
        data: {
          map: {
            transactionId: 'data.id',
          },
        },
      };

      await destination.push(event, {
        config,
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.events[0].transactionId).toBe('TXN-12345');
    });

    test('includes conversionValue and currency', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('order complete');
      (event.data as Record<string, unknown>).total = 199.99;
      (event.data as Record<string, unknown>).currency = 'EUR';

      const config: Config = {
        settings: defaultSettings,
        data: {
          map: {
            conversionValue: 'data.total',
            currency: 'data.currency',
          },
        },
      };

      await destination.push(event, {
        config,
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.events[0].conversionValue).toBe(199.99);
      expect(requestBody.events[0].currency).toBe('EUR');
    });

    test('applies eventSource from settings', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('page view');

      const config: Config = {
        settings: {
          ...defaultSettings,
          eventSource: 'WEB',
        },
      };

      await destination.push(event, {
        config,
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.events[0].eventSource).toBe('WEB');
    });

    test('includes consent information', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('order complete');
      event.consent = { marketing: true, personalization: false };

      await destination.push(event, {
        config: { settings: defaultSettings },
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.events[0].consent).toEqual({
        adUserData: 'CONSENT_GRANTED',
        adPersonalization: 'CONSENT_DENIED',
      });
    });

    test('applies request-level consent', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('page view');

      const config: Config = {
        settings: {
          ...defaultSettings,
          consent: {
            adUserData: 'CONSENT_GRANTED',
            adPersonalization: 'CONSENT_GRANTED',
          },
        },
      };

      await destination.push(event, {
        config,
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.consent).toEqual({
        adUserData: 'CONSENT_GRANTED',
        adPersonalization: 'CONSENT_GRANTED',
      });
    });

    test('uses validateOnly mode for testing', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('page view');

      const config: Config = {
        settings: {
          ...defaultSettings,
          validateOnly: true,
        },
      };

      await destination.push(event, {
        config,
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.validateOnly).toBe(true);
    });

    test('includes testEventCode when provided', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('page view');

      const config: Config = {
        settings: {
          ...defaultSettings,
          testEventCode: 'TEST12345',
        },
      };

      await destination.push(event, {
        config,
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.testEventCode).toBe('TEST12345');
    });

    test('throws error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid request',
      });

      const mockCollector = {} as Collector.Instance;
      const event = getEvent('page view');

      await expect(
        destination.push(event, {
          config: { settings: defaultSettings },
          collector: mockCollector,
          env: { fetch: mockFetch },
        }),
      ).rejects.toThrow('Data Manager API error (400)');
    });

    test('throws error on validation errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          requestId: 'test-123',
          validationErrors: [
            {
              code: 'INVALID_FIELD',
              message: 'Field is invalid',
              fieldPath: 'events[0].transactionId',
            },
          ],
        }),
      });

      const mockCollector = {} as Collector.Instance;
      const event = getEvent('page view');

      await expect(
        destination.push(event, {
          config: { settings: defaultSettings },
          collector: mockCollector,
          env: { fetch: mockFetch },
        }),
      ).rejects.toThrow('Validation errors');
    });

    test('uses custom URL when provided', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('page view');

      const config: Config = {
        settings: {
          ...defaultSettings,
          url: 'https://custom-endpoint.com/v1',
        },
      };

      await destination.push(event, {
        config,
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom-endpoint.com/v1/events:ingest',
        expect.any(Object),
      );
    });

    test('supports multiple destinations', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('order complete');

      const config: Config = {
        settings: {
          accessToken,
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
      };

      await destination.push(event, {
        config,
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.destinations).toHaveLength(2);
    });
  });

  describe('environment customization', () => {
    test('uses custom fetch function', async () => {
      const customFetch = jest.fn();
      customFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ requestId: 'custom-123' }),
      });

      const mockCollector = {} as Collector.Instance;
      const event = getEvent('page view');

      await destination.push(event, {
        config: {
          settings: {
            accessToken,
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
        collector: mockCollector,
        env: { fetch: customFetch },
      });

      expect(customFetch).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('applies Settings guided helpers (userData)', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('order complete');
      event.user = { id: 'user@example.com' };
      (event.data as Record<string, unknown>).phone = '+1234567890';

      const config: Config = {
        settings: {
          accessToken,
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

      await destination.push(event, {
        config,
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.events[0].userData).toBeDefined();
      expect(requestBody.events[0].userData.userIdentifiers.length).toBe(2);
    });

    test('applies Settings guided helpers (userId, clientId)', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('page view');
      event.user = { id: 'user-123', device: 'device-456' };

      const config: Config = {
        settings: {
          accessToken,
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

      await destination.push(event, {
        config,
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.events[0].userId).toBe('user-123');
      expect(requestBody.events[0].clientId).toBe('device-456');
    });

    test('applies Settings guided helpers (sessionAttributes)', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('order complete');
      event.context = {
        sessionAttributes: ['gad_source=1&gad_campaignid=123', 0],
      };

      const config: Config = {
        settings: {
          accessToken,
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

      await destination.push(event, {
        config,
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.events[0].adIdentifiers).toBeDefined();
      expect(requestBody.events[0].adIdentifiers.sessionAttributes).toBe(
        'gad_source=1&gad_campaignid=123',
      );
    });

    test('event mapping overrides Settings helpers', async () => {
      const mockCollector = {} as Collector.Instance;
      const event = getEvent('order complete');
      event.user = { id: 'default-user' };

      const config: Config = {
        settings: {
          accessToken,
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
            userId: { value: 'override-user' }, // Event mapping override
          },
        },
      };

      await destination.push(event, {
        config,
        collector: mockCollector,
        env: { fetch: mockFetch },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.events[0].userId).toBe('override-user');
    });
  });
});
