import { GoogleAuth, type OAuth2Client } from 'google-auth-library';
import type { Settings } from './types';

const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/datamanager'];

/**
 * Authentication error with cause tracking
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'DataManagerAuthError';
  }
}

/**
 * Creates Google Auth client based on settings
 *
 * Authentication priority:
 * 1. credentials (inline service account) - if provided
 * 2. keyFilename (service account file) - if provided
 * 3. Application Default Credentials (ADC) - automatic fallback
 *    - GOOGLE_APPLICATION_CREDENTIALS env var
 *    - GCP metadata server (Cloud Functions, Cloud Run, GCE)
 *
 * @param settings - Configuration with auth options
 * @returns OAuth2Client for token retrieval
 * @throws AuthError if authentication fails
 */
export async function createAuthClient(
  settings: Settings,
): Promise<OAuth2Client> {
  const { credentials, keyFilename, scopes = DEFAULT_SCOPES } = settings;

  try {
    if (credentials) {
      const auth = new GoogleAuth({
        credentials,
        scopes,
      });
      return (await auth.getClient()) as OAuth2Client;
    }

    if (keyFilename) {
      const auth = new GoogleAuth({
        keyFilename,
        scopes,
      });
      return (await auth.getClient()) as OAuth2Client;
    }

    const auth = new GoogleAuth({ scopes });
    return (await auth.getClient()) as OAuth2Client;
  } catch (error) {
    throw new AuthError(
      'Failed to create auth client. Check credentials configuration or ensure GOOGLE_APPLICATION_CREDENTIALS is set.',
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Gets access token from auth client
 * Automatically returns cached token if valid or refreshes if expired
 *
 * @param authClient - OAuth2 client from createAuthClient()
 * @returns Fresh access token
 * @throws AuthError if token retrieval fails
 */
export async function getAccessToken(
  authClient: OAuth2Client,
): Promise<string> {
  try {
    const tokenResponse = await authClient.getAccessToken();

    if (!tokenResponse.token) {
      throw new AuthError('Auth client returned empty token');
    }

    return tokenResponse.token;
  } catch (error) {
    throw new AuthError(
      'Failed to obtain access token',
      error instanceof Error ? error : undefined,
    );
  }
}
