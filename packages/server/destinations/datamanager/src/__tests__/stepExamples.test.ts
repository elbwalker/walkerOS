import type { WalkerOS } from '@walkeros/core';
import type { OAuth2Client } from 'google-auth-library';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

type Captured = [callable: string, ...args: unknown[]];

// Mock auth so init() doesn't perform real Google OAuth and push() receives a
// deterministic access token (used in the Authorization header).
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

/**
 * Data Manager destination invokes `env.fetch(url, init)` exactly once per
 * push. Each event becomes one HTTP request. The test mocks `createAuthClient`
 * + `getAccessToken` so the Bearer token is stable.
 */
describe('Step Examples', () => {
  const mockFetch = jest.fn();
  const mockAccessToken = 'ya29.c.test_token';
  const mockAuthClient = {
    getAccessToken: jest.fn(),
  } as unknown as OAuth2Client;

  beforeEach(() => {
    jest.clearAllMocks();
    (createAuthClient as jest.Mock).mockResolvedValue(mockAuthClient);
    (getAccessToken as jest.Mock).mockResolvedValue(mockAccessToken);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        requestId: 'mock-request-id',
        validationErrors: [],
      }),
      text: async () => '',
    });
  });

  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const testEnv = clone(examples.env.push);
    testEnv.fetch = mockFetch as unknown as typeof fetch;
    testEnv.authClient = mockAuthClient;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    await elb(
      'walker destination',
      { ...dest, env: testEnv },
      {
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
        mapping: mappingConfig,
      },
    );

    await elb(event);

    const captured: Captured[] = mockFetch.mock.calls.map(
      (args) => ['fetch', ...args] as Captured,
    );

    expect(captured).toEqual(example.out);
  });
});
