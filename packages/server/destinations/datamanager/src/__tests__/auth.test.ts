import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { createMockLogger } from '@walkeros/core';
import { createAuthClient, getAccessToken, AuthError } from '../auth';
import type { Config } from '../types';

jest.mock('google-auth-library');

describe('Authentication', () => {
  let mockOAuth2Client: jest.Mocked<OAuth2Client>;
  let mockGoogleAuth: jest.Mocked<GoogleAuth>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = createMockLogger();

    const getAccessTokenMock = jest
      .fn<Promise<{ token?: string | null; res?: any | null }>, []>()
      .mockResolvedValue({ token: 'default-token', res: null });

    mockOAuth2Client = {
      getAccessToken: getAccessTokenMock,
    } as unknown as jest.Mocked<OAuth2Client>;

    mockGoogleAuth = {
      getClient: jest.fn().mockResolvedValue(mockOAuth2Client),
    } as unknown as jest.Mocked<GoogleAuth>;

    (GoogleAuth as jest.Mock).mockImplementation(() => mockGoogleAuth);
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

    test('throws AuthError on invalid JSON string credentials', async () => {
      const config: Config = {
        credentials: 'not-json',
        settings: { destinations: [] },
      };

      await expect(createAuthClient(config, logger)).rejects.toThrow(AuthError);
      await expect(createAuthClient(config, logger)).rejects.toThrow(
        'Invalid credentials',
      );
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

    test('uses ADC as fallback when no auth config provided', async () => {
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

      const callArgs = (GoogleAuth as jest.Mock).mock.calls[0][0];
      expect(callArgs).toHaveProperty('credentials');
      expect(callArgs).not.toHaveProperty('keyFilename');
    });

    test('throws AuthError on failure', async () => {
      const config: Config = {
        settings: { destinations: [] },
      };

      const error = new Error('Auth failed');
      mockGoogleAuth.getClient.mockRejectedValue(error);

      await expect(createAuthClient(config, logger)).rejects.toThrow(AuthError);
      await expect(createAuthClient(config, logger)).rejects.toThrow(
        'Failed to create auth client',
      );
    });

    test('AuthError includes cause', async () => {
      const config: Config = {
        settings: { destinations: [] },
      };

      const originalError = new Error('Original error');
      mockGoogleAuth.getClient.mockRejectedValue(originalError);

      try {
        await createAuthClient(config, logger);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).cause).toBe(originalError);
      }
    });
  });

  describe('getAccessToken', () => {
    test('returns access token from client', async () => {
      (mockOAuth2Client.getAccessToken as jest.Mock).mockResolvedValue({
        token: 'ya29.test_token',
        res: null,
      });

      const token = await getAccessToken(mockOAuth2Client);

      expect(token).toBe('ya29.test_token');
      expect(mockOAuth2Client.getAccessToken).toHaveBeenCalled();
    });

    test('throws AuthError if token is null', async () => {
      (mockOAuth2Client.getAccessToken as jest.Mock).mockResolvedValue({
        token: null,
        res: null,
      });

      await expect(getAccessToken(mockOAuth2Client)).rejects.toThrow(AuthError);
      await expect(getAccessToken(mockOAuth2Client)).rejects.toThrow(
        'Failed to obtain access token',
      );
    });

    test('throws AuthError if token is undefined', async () => {
      (mockOAuth2Client.getAccessToken as jest.Mock).mockResolvedValue({
        token: undefined,
        res: null,
      });

      await expect(getAccessToken(mockOAuth2Client)).rejects.toThrow(AuthError);
      await expect(getAccessToken(mockOAuth2Client)).rejects.toThrow(
        'Failed to obtain access token',
      );
    });

    test('throws AuthError on client failure', async () => {
      const error = new Error('Token fetch failed');
      (mockOAuth2Client.getAccessToken as jest.Mock).mockRejectedValue(error);

      await expect(getAccessToken(mockOAuth2Client)).rejects.toThrow(AuthError);
      await expect(getAccessToken(mockOAuth2Client)).rejects.toThrow(
        'Failed to obtain access token',
      );
    });

    test('AuthError includes cause on failure', async () => {
      const originalError = new Error('Network error');
      (mockOAuth2Client.getAccessToken as jest.Mock).mockRejectedValue(
        originalError,
      );

      try {
        await getAccessToken(mockOAuth2Client);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).cause).toBe(originalError);
      }
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
