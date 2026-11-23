import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { createMockLogger } from '@walkeros/core';
import { createAuthClient, getAuthHeaders, AuthError } from '../auth';
import type { AuthClient, Config } from '../types';

jest.mock('google-auth-library');

describe('Authentication', () => {
  // The library is automocked: every GoogleAuth answers this client.
  let mockOAuth2Client: OAuth2Client;
  const getClient = jest.mocked(GoogleAuth.prototype.getClient);
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = createMockLogger();

    mockOAuth2Client = new OAuth2Client();
    getClient.mockResolvedValue(mockOAuth2Client);
  });

  describe('createAuthClient', () => {
    const serviceAccount = {
      client_email: 'test@example.com',
      private_key:
        '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
    };

    test('creates client with object credentials via config.credentials', async () => {
      const config: Config = {
        credentials: serviceAccount,
        settings: { destinations: [] },
      };

      const client = await createAuthClient(config, logger);

      expect(GoogleAuth).toHaveBeenCalledWith({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/datamanager'],
      });
      expect(client).toBe(mockOAuth2Client);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('parses string (JSON) credentials via config.credentials', async () => {
      const config: Config = {
        credentials: JSON.stringify(serviceAccount),
        settings: { destinations: [] },
      };

      await createAuthClient(config, logger);

      expect(GoogleAuth).toHaveBeenCalledWith({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/datamanager'],
      });
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('builds no client from invalid JSON string credentials', async () => {
      const config: Config = {
        credentials: 'not-json',
        settings: { destinations: [] },
      };

      await expect(createAuthClient(config, logger)).rejects.toThrow(AuthError);
      expect(GoogleAuth).not.toHaveBeenCalled();
    });

    test('still reads settings.credentials and warns about deprecation', async () => {
      const config: Config = {
        settings: {
          credentials: serviceAccount,
          destinations: [],
        },
      };

      const client = await createAuthClient(config, logger);

      expect(GoogleAuth).toHaveBeenCalledWith({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/datamanager'],
      });
      expect(client).toBe(mockOAuth2Client);
      expect(logger.warn).toHaveBeenCalledWith(
        'settings.credentials is deprecated, use config.credentials instead',
      );
    });

    test('config.credentials takes precedence over settings.credentials', async () => {
      const config: Config = {
        credentials: serviceAccount,
        settings: {
          credentials: {
            client_email: 'legacy@example.com',
            private_key: 'legacy-key',
          },
          destinations: [],
        },
      };

      await createAuthClient(config, logger);

      expect(GoogleAuth).toHaveBeenCalledWith({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/datamanager'],
      });
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('creates client with keyFilename', async () => {
      const config: Config = {
        settings: {
          keyFilename: '/path/to/key.json',
          destinations: [],
        },
      };

      const client = await createAuthClient(config, logger);

      expect(GoogleAuth).toHaveBeenCalledWith({
        keyFilename: '/path/to/key.json',
        scopes: ['https://www.googleapis.com/auth/datamanager'],
      });
      expect(client).toBe(mockOAuth2Client);
    });

    test('falls back to ADC when no auth config provided', async () => {
      const config: Config = {
        settings: { destinations: [] },
      };

      const client = await createAuthClient(config, logger);

      expect(GoogleAuth).toHaveBeenCalledWith({
        scopes: ['https://www.googleapis.com/auth/datamanager'],
      });
      expect(client).toBe(mockOAuth2Client);
    });

    test('supports custom scopes', async () => {
      const config: Config = {
        credentials: serviceAccount,
        settings: {
          scopes: ['https://www.googleapis.com/auth/custom-scope'],
          destinations: [],
        },
      };

      await createAuthClient(config, logger);

      expect(GoogleAuth).toHaveBeenCalledWith({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/custom-scope'],
      });
    });

    test('credentials take priority over keyFilename', async () => {
      const config: Config = {
        credentials: serviceAccount,
        settings: {
          keyFilename: '/path/to/key.json',
          destinations: [],
        },
      };

      await createAuthClient(config, logger);

      const callArgs = jest.mocked(GoogleAuth).mock.calls[0][0];
      expect(callArgs).toHaveProperty('credentials');
      expect(callArgs).not.toHaveProperty('keyFilename');
    });

    test.each([
      [
        'config.credentials',
        { credentials: 'not json', settings: { destinations: [] } },
        'Data Manager credentials in config.credentials are neither a service account object nor its JSON string',
      ],
      [
        'settings.credentials',
        { settings: { credentials: 'not json', destinations: [] } },
        'Data Manager credentials in settings.credentials are neither a service account object nor its JSON string',
      ],
      [
        'config.credentials',
        { credentials: serviceAccount, settings: { destinations: [] } },
        'Data Manager could not create an auth client from config.credentials',
      ],
      [
        'settings.credentials',
        { settings: { credentials: serviceAccount, destinations: [] } },
        'Data Manager could not create an auth client from settings.credentials',
      ],
      [
        'settings.keyFilename',
        { settings: { keyFilename: '/path/to/key.json', destinations: [] } },
        'Data Manager could not create an auth client from settings.keyFilename',
      ],
      [
        'Application Default Credentials',
        { settings: { destinations: [] } },
        'Data Manager could not create an auth client from Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS, gcloud auth application-default login or the Google Cloud metadata server)',
      ],
    ])(
      'createAuthClient names the path: %s',
      async (_, config: Config, message) => {
        getClient.mockRejectedValue(new Error('Auth failed'));

        const error = await createAuthClient(config, logger).catch(
          (caught: unknown) => caught,
        );

        expect(error).toBeInstanceOf(AuthError);
        expect(error).toHaveProperty('message', message);
      },
    );

    test('AuthError includes cause', async () => {
      const config: Config = {
        settings: { destinations: [] },
      };

      const originalError = new Error('Original error');
      getClient.mockRejectedValue(originalError);

      const error = await createAuthClient(config, logger).catch(
        (caught: unknown) => caught,
      );

      expect(error).toBeInstanceOf(AuthError);
      expect(error).toHaveProperty('cause', originalError);
    });
  });

  describe('getAuthHeaders', () => {
    const clientWith = (
      getRequestHeaders: AuthClient['getRequestHeaders'],
    ): AuthClient => ({ getRequestHeaders });

    test('returns the auth library headers in a plain object', async () => {
      const headers = await getAuthHeaders(
        clientWith(
          async () =>
            new Headers({
              authorization: 'Bearer ya29.test_token',
              'x-goog-user-project': 'my-project',
            }),
        ),
      );

      expect(headers).toEqual({
        authorization: 'Bearer ya29.test_token',
        'x-goog-user-project': 'my-project',
      });
    });

    const cause = new Error('invalid_grant');
    test.each([
      [
        'no authorization header',
        async () => new Headers({ 'x-goog-user-project': 'my-project' }),
        'Auth client returned no authorization header',
      ],
      [
        'a rejected header request',
        () => Promise.reject(cause),
        'Auth client could not provide request headers',
      ],
    ])('throws AuthError on %s', async (_, getRequestHeaders, message) => {
      const error = await getAuthHeaders(clientWith(getRequestHeaders)).catch(
        (caught: unknown) => caught,
      );

      expect(error).toBeInstanceOf(AuthError);
      expect(error).toHaveProperty('message', message);
    });

    test('AuthError includes cause on failure', async () => {
      const error = await getAuthHeaders(
        clientWith(() => Promise.reject(cause)),
      ).catch((caught: unknown) => caught);

      expect(error).toHaveProperty('cause', cause);
    });
  });

  describe('AuthError', () => {
    test('has correct name', () => {
      const error = new AuthError('Test error');
      expect(error.name).toBe('DataManagerAuthError');
    });

    test('has correct message', () => {
      const error = new AuthError('Test error message');
      expect(error.message).toBe('Test error message');
    });

    test('can include cause', () => {
      const cause = new Error('Root cause');
      const error = new AuthError('Wrapper error', cause);
      expect(error.cause).toBe(cause);
    });

    test('is instanceof Error', () => {
      const error = new AuthError('Test');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
