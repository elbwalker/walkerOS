import { GoogleAuth } from 'google-auth-library';
import type { Logger, ServiceAccount } from '@walkeros/core';
import type { AuthClient, Config } from './types';

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

/** Where a credential came from, as the error names it. */
type CredentialSource = 'config.credentials' | 'settings.credentials';

type Credential = string | ServiceAccount;

const ADC =
  'Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS, gcloud auth application-default login or the Google Cloud metadata server)';

/**
 * Resolves credentials with precedence `config.credentials ?? settings.credentials`.
 * Warns once (per instance) when the deprecated `settings.credentials` path is used.
 */
function resolveCredentials(
  config: Partial<Config>,
  logger: Logger.Instance,
): { credential: Credential; source: CredentialSource } | undefined {
  if (config.credentials !== undefined)
    return { credential: config.credentials, source: 'config.credentials' };

  const settingsCredentials = config.settings?.credentials;
  if (settingsCredentials !== undefined) {
    logger.warn(
      'settings.credentials is deprecated, use config.credentials instead',
    );
    return { credential: settingsCredentials, source: 'settings.credentials' };
  }

  return undefined;
}

/**
 * Normalizes a credential into the object form GoogleAuth expects.
 *
 * The shared `Credential<ServiceAccount>` union allows a JSON string (often a
 * `$env` reference). GoogleAuth requires a parsed object, so parse-if-string
 * here before handing it over.
 *
 * @throws AuthError naming the source if a string credential is not valid JSON
 */
function parseCredentials(
  credentials: Credential,
  source: CredentialSource,
): ServiceAccount {
  if (typeof credentials !== 'string') return credentials;

  try {
    const parsed: ServiceAccount = JSON.parse(credentials);
    return parsed;
  } catch (error) {
    throw new AuthError(
      `Data Manager credentials in ${source} are neither a service account object nor its JSON string`,
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
 * @returns Auth client for request headers
 * @throws AuthError naming the credential path if authentication fails
 */
export async function createAuthClient(
  config: Partial<Config>,
  logger: Logger.Instance,
): Promise<AuthClient> {
  const { keyFilename, scopes = DEFAULT_SCOPES } = config.settings || {};
  const resolved = resolveCredentials(config, logger);

  // Parse before the try so an invalid-JSON error surfaces with its own
  // message rather than being wrapped as a client failure.
  const credentials = resolved
    ? parseCredentials(resolved.credential, resolved.source)
    : undefined;

  const source = resolved
    ? resolved.source
    : keyFilename
      ? 'settings.keyFilename'
      : ADC;
  const options = credentials
    ? { credentials, scopes }
    : keyFilename
      ? { keyFilename, scopes }
      : { scopes };

  try {
    return await new GoogleAuth(options).getClient();
  } catch (error) {
    throw new AuthError(
      `Data Manager could not create an auth client from ${source}`,
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * The request headers of an auth client as a plain object: the authorization
 * header and any the library adds, like x-goog-user-project. The client
 * returns a cached token while it is valid and refreshes it when not.
 *
 * @param authClient - Client from createAuthClient()
 * @throws AuthError if the client fails or returns no authorization header
 */
export async function getAuthHeaders(
  authClient: AuthClient,
): Promise<Record<string, string>> {
  let headers: Headers;
  try {
    headers = await authClient.getRequestHeaders();
  } catch (error) {
    throw new AuthError(
      'Auth client could not provide request headers',
      error instanceof Error ? error : undefined,
    );
  }

  if (!headers.has('authorization'))
    throw new AuthError('Auth client returned no authorization header');

  const plain: Record<string, string> = {};
  headers.forEach((value, key) => {
    plain[key] = value;
  });
  return plain;
}
