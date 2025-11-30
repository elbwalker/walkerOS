import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { createAuthClient, getAccessToken, AuthError } from '../auth';
import type { Settings } from '../types';

jest.mock('google-auth-library');

describe('Authentication', () => {
  let mockOAuth2Client: jest.Mocked<OAuth2Client>;
  let mockGoogleAuth: jest.Mocked<GoogleAuth>;

  beforeEach(() => {
    jest.clearAllMocks();

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
    test('creates client with inline credentials', async () => {
      const settings: Settings = {
        credentials: {
          client_email: 'test@example.com',
          private_key:
            '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        },
        eventSource: 'WEB',
        destinations: [],
      };

      const client = await createAuthClient(settings);

      expect(GoogleAuth).toHaveBeenCalledWith({
        credentials: settings.credentials,
        scopes: ['https://www.googleapis.com/auth/datamanager'],
      });
      expect(client).toBe(mockOAuth2Client);
    });

    test('creates client with keyFilename', async () => {
      const settings: Settings = {
        keyFilename: '/path/to/key.json',
        eventSource: 'WEB',
        destinations: [],
      };

      const client = await createAuthClient(settings);

      expect(GoogleAuth).toHaveBeenCalledWith({
        keyFilename: '/path/to/key.json',
        scopes: ['https://www.googleapis.com/auth/datamanager'],
      });
      expect(client).toBe(mockOAuth2Client);
    });

    test('uses ADC as fallback when no auth config provided', async () => {
      const settings: Settings = {
        eventSource: 'WEB',
        destinations: [],
      };

      const client = await createAuthClient(settings);

      expect(GoogleAuth).toHaveBeenCalledWith({
        scopes: ['https://www.googleapis.com/auth/datamanager'],
      });
      expect(client).toBe(mockOAuth2Client);
    });

    test('supports custom scopes', async () => {
      const settings: Settings = {
        credentials: {
          client_email: 'test@example.com',
          private_key:
            '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        },
        scopes: ['https://www.googleapis.com/auth/custom-scope'],
        eventSource: 'WEB',
        destinations: [],
      };

      await createAuthClient(settings);

      expect(GoogleAuth).toHaveBeenCalledWith({
        credentials: settings.credentials,
        scopes: ['https://www.googleapis.com/auth/custom-scope'],
      });
    });

    test('credentials take priority over keyFilename', async () => {
      const settings: Settings = {
        credentials: {
          client_email: 'test@example.com',
          private_key:
            '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        },
        keyFilename: '/path/to/key.json',
        eventSource: 'WEB',
        destinations: [],
      };

      await createAuthClient(settings);

      const callArgs = (GoogleAuth as jest.Mock).mock.calls[0][0];
      expect(callArgs).toHaveProperty('credentials');
      expect(callArgs).not.toHaveProperty('keyFilename');
    });

    test('throws AuthError on failure', async () => {
      const settings: Settings = {
        eventSource: 'WEB',
        destinations: [],
      };

      const error = new Error('Auth failed');
      mockGoogleAuth.getClient.mockRejectedValue(error);

      await expect(createAuthClient(settings)).rejects.toThrow(AuthError);
      await expect(createAuthClient(settings)).rejects.toThrow(
        'Failed to create auth client',
      );
    });

    test('AuthError includes cause', async () => {
      const settings: Settings = {
        eventSource: 'WEB',
        destinations: [],
      };

      const originalError = new Error('Original error');
      mockGoogleAuth.getClient.mockRejectedValue(originalError);

      try {
        await createAuthClient(settings);
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
