import { GoogleAuth, type OAuth2Client } from 'google-auth-library';
import type { Logger, ServiceAccount } from '@walkeros/core';
import type { Config } from './types';

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
 * Resolves credentials with precedence `config.credentials ?? settings.credentials`.
 * Warns once (per instance) when the deprecated `settings.credentials` path is used.
 */
function resolveCredentials(
  config: Partial<Config>,
  logger: Logger.Instance,
): Credential | undefined {
  if (config.credentials !== undefined) return config.credentials;

  const settingsCredentials = config.settings?.credentials;
  if (settingsCredentials !== undefined) {
    logger.warn(
      'settings.credentials is deprecated, use config.credentials instead',
    );
    return settingsCredentials;
  }

  return undefined;
}

type Credential = string | ServiceAccount;

/**
 * Normalizes a credential into the object form GoogleAuth expects.
 *
 * The shared `Credential<ServiceAccount>` union allows a JSON string (often a
 * `$env` reference). GoogleAuth requires a parsed object, so parse-if-string
 * here before handing it over.
 *
 * @throws AuthError if a string credential is not valid JSON
 */
function parseCredentials(credentials: Credential): ServiceAccount {
  if (typeof credentials !== 'string') return credentials;

  try {
    const parsed: ServiceAccount = JSON.parse(credentials);
    return parsed;
  } catch (error) {
    throw new AuthError(
      'Invalid credentials: expected a service account object or a JSON string',
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Creates Google Auth client based on config
 *
 * Authentication priority:
 * 1. credentials (inline service account) - if provided
 *    Resolved as `config.credentials ?? settings.credentials`. A string
 *    credential (e.g. a `$env` JSON value) is parsed before use.
 * 2. keyFilename (service account file) - if provided
 * 3. Application Default Credentials (ADC) - automatic fallback
 *    - GOOGLE_APPLICATION_CREDENTIALS env var
 *    - GCP metadata server (Cloud Functions, Cloud Run, GCE)
 *
 * @param config - Validated config with auth options
 * @param logger - Logger instance for deprecation warnings
 * @returns OAuth2Client for token retrieval
 * @throws AuthError if authentication fails
 */
export async function createAuthClient(
  config: Partial<Config>,
  logger: Logger.Instance,
): Promise<OAuth2Client> {
  const { keyFilename, scopes = DEFAULT_SCOPES } = config.settings || {};
  const credentials = resolveCredentials(config, logger);

  // Parse before the try so an invalid-JSON error surfaces with its own
  // message rather than being wrapped as a generic auth failure.
  const parsedCredentials = credentials
    ? parseCredentials(credentials)
    : undefined;

  try {
    if (parsedCredentials) {
      const auth = new GoogleAuth({
        credentials: parsedCredentials,
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
