import type { Collector, WalkerOS } from '@walkeros/core';
import type { Config, Settings } from '../types';
import type { OAuth2Client } from 'google-auth-library';
import { createMockLogger } from '@walkeros/core';
import * as examples from '../examples';

jest.mock('../auth', () => ({
  createAuthClient: jest.fn(),
  getAccessToken: jest.fn(),
  AuthError: class AuthError extends Error {
    constructor(
      message: string,
      public cause?: Error,
    ) {
      super(message);
      this.name = 'DataManagerAuthError';
    }
  },
}));

import { createAuthClient, getAccessToken } from '../auth';

describe('Step Examples', () => {
  let mockFetch: jest.Mock;
  const mockAccessToken = 'ya29.c.test_token';
  const mockAuthClient = {
    getAccessToken: jest.fn(),
  } as unknown as OAuth2Client;

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

  beforeEach(() => {
    jest.clearAllMocks();
    (createAuthClient as jest.Mock).mockResolvedValue(mockAuthClient);
    (getAccessToken as jest.Mock).mockResolvedValue(mockAccessToken);
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        requestId: 'test-request-id',
        validationErrors: [],
      }),
    });
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const destination = jest.requireActual('../').default;
    destination.config = {};

    const expectedOut = example.out as {
      events: Record<string, unknown>[];
    };

    // Build config.data from example mapping, with transactionId fallback
    const mappingMap =
      (
        (example.mapping as Record<string, unknown>)?.data as
          | { map?: Record<string, unknown> }
          | undefined
      )?.map || {};
    const configData = {
      map: {
        transactionId: 'id', // fallback to event ID
        ...mappingMap,
      },
    };

    const config = (await destination.init({
      config: {
        settings: defaultSettings,
        data: configData,
      },
      collector: {} as Collector.Instance,
      env: {},
      logger: createMockLogger(),
      id: 'test-dm',
    })) as Config;

    await destination.push(example.in as WalkerOS.Event, {
      config: { ...config, data: configData },
      collector: {} as Collector.Instance,
      env: { authClient: mockAuthClient, fetch: mockFetch },
      logger: createMockLogger(),
      id: 'test-dm',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(requestBody.events).toHaveLength(1);

    const actual = requestBody.events[0];
    const expected = expectedOut.events[0];

    // Verify mapped business fields
    expect(actual.eventSource).toBe(expected.eventSource ?? 'WEB');

    if (expected.eventName) {
      expect(actual.eventName).toBe(expected.eventName);
    }
    if (expected.conversionValue !== undefined) {
      expect(actual.conversionValue).toBe(expected.conversionValue);
    }
    if (expected.currency) {
      expect(actual.currency).toBe(expected.currency);
    }
    if (expected.userId) {
      expect(actual.userId).toBe(expected.userId);
    }
    // Email is SHA-256 hashed in userData — verify when mapping includes email
    if (expected.email && actual.userData) {
      expect(actual.userData.userIdentifiers.length).toBeGreaterThan(0);
    }
  });
});
