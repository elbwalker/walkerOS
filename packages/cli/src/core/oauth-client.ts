import { z } from 'zod';

/**
 * OAuth 2.1 client for the walkerOS authorization server.
 *
 * Pure HTTP with `fetch` injected: nothing here reads the config file or the
 * environment, so the flows can be exercised without a machine state.
 */

/** Public client id seeded for the CLI. It has no secret. */
export const CLI_CLIENT_ID = 'walkeros-cli';

/**
 * `offline_access` is what buys the refresh token; without it every command
 * would send the person back to the browser once the access token expired.
 */
export const CLI_SCOPE = 'read write offline_access';

const DEVICE_CODE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';

/**
 * Ceiling on a refresh request. It is deliberately below the 15 s after which
 * `withConfigLock` treats a lock as abandoned: a refresh runs while holding
 * that lock, so a request allowed to hang longer would have its own lock
 * broken out from under it and race the process that took it next.
 */
const REFRESH_TIMEOUT_MS = 10_000;

/**
 * Ceiling on a revocation. Nothing waits on its answer, so this only bounds
 * how long a logout stands still before clearing the machine.
 */
const REVOKE_TIMEOUT_MS = 5_000;

const FORM_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  Accept: 'application/json',
} as const;

const DeviceAuthorizationSchema = z.object({
  device_code: z.string().min(1),
  user_code: z.string().min(1),
  verification_uri: z.string().min(1),
  verification_uri_complete: z.string().min(1).optional(),
  expires_in: z.number().int().nonnegative(),
  interval: z.number().int().nonnegative(),
});

const TokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().nonnegative(),
  refresh_token: z.string().min(1).optional(),
});

const ErrorSchema = z.object({
  error: z.string().min(1),
  error_description: z.string().optional(),
});

export interface DeviceAuthorization {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
}

export interface TokenSet {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string | null;
}

export type DevicePoll =
  | { status: 'ok'; tokens: TokenSet }
  | { status: 'pending' }
  | { status: 'slow_down' }
  | { status: 'denied' }
  | { status: 'expired' }
  | { status: 'error'; error: string };

/** Parse a response body as JSON, or null when it is not JSON at all. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * The RFC 6749 section 5.2 error code carried by a failed response, or null
 * when the body is not an OAuth error (a proxy's HTML, say).
 */
function errorCode(body: unknown): string | null {
  const parsed = ErrorSchema.safeParse(body);
  return parsed.success ? parsed.data.error : null;
}

function describe(response: Response, body: unknown): string {
  const parsed = ErrorSchema.safeParse(body);
  if (parsed.success) {
    return parsed.data.error_description
      ? `${parsed.data.error}: ${parsed.data.error_description}`
      : parsed.data.error;
  }
  return `HTTP ${response.status}`;
}

function post(
  fetchFn: typeof fetch,
  url: string,
  form: Record<string, string>,
  signal?: AbortSignal,
): Promise<Response> {
  return fetchFn(url, {
    method: 'POST',
    headers: { ...FORM_HEADERS },
    body: new URLSearchParams(form).toString(),
    ...(signal ? { signal } : {}),
  });
}

function toTokenSet(body: unknown): TokenSet {
  const parsed = TokenSchema.safeParse(body);
  if (!parsed.success) throw new Error('Malformed token response');

  return {
    accessToken: parsed.data.access_token,
    accessTokenExpiresAt: new Date(
      Date.now() + parsed.data.expires_in * 1000,
    ).toISOString(),
    refreshToken: parsed.data.refresh_token ?? null,
  };
}

/**
 * RFC 8628 section 3.1. Ask for a device code and the URL to send the person
 * to. Unauthenticated: the code is worth nothing until somebody approves it.
 */
export async function startDeviceAuthorization(
  appUrl: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<DeviceAuthorization> {
  const response = await post(
    fetchFn,
    `${appUrl}/api/oauth/device_authorization`,
    {
      client_id: CLI_CLIENT_ID,
      scope: CLI_SCOPE,
      // RFC 8707. The token comes back bound to the API, so a leaked CLI token
      // cannot be replayed against the MCP resource.
      resource: `${appUrl}/api`,
    },
  );

  const body = await readJson(response);
  if (!response.ok) throw new Error(describe(response, body));

  const parsed = DeviceAuthorizationSchema.safeParse(body);
  if (!parsed.success)
    throw new Error('Malformed device authorization response');

  return {
    deviceCode: parsed.data.device_code,
    userCode: parsed.data.user_code,
    verificationUri: parsed.data.verification_uri,
    verificationUriComplete:
      parsed.data.verification_uri_complete ?? parsed.data.verification_uri,
    expiresIn: parsed.data.expires_in,
    interval: parsed.data.interval,
  };
}

/**
 * One poll of RFC 8628 section 3.4. Every outcome is a returned status rather
 * than a throw, because four of them are ordinary steps of a flow that is
 * still running.
 *
 * `signal` is how a caller keeps its own deadline: without one, a server that
 * accepts the connection and then says nothing holds this call for the HTTP
 * client's default, which is minutes.
 */
export async function pollDeviceToken(
  appUrl: string,
  deviceCode: string,
  fetchFn: typeof fetch = globalThis.fetch,
  signal?: AbortSignal,
): Promise<DevicePoll> {
  let response: Response;
  try {
    response = await post(
      fetchFn,
      `${appUrl}/api/oauth/token`,
      {
        grant_type: DEVICE_CODE_GRANT,
        device_code: deviceCode,
        client_id: CLI_CLIENT_ID,
      },
      signal,
    );
  } catch (error) {
    // Only an abort of the caller's own signal is an outcome rather than a
    // fault: the authorization is untouched, so it is still pending and the
    // caller's loop decides whether there is room for another attempt. Any
    // other transport failure is a real error and stays one.
    if (signal?.aborted) return { status: 'pending' };
    throw error;
  }

  const body = await readJson(response);

  if (response.ok) {
    try {
      return { status: 'ok', tokens: toTokenSet(body) };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  switch (errorCode(body)) {
    case 'authorization_pending':
      return { status: 'pending' };
    case 'slow_down':
      return { status: 'slow_down' };
    case 'access_denied':
      return { status: 'denied' };
    case 'expired_token':
      return { status: 'expired' };
    default:
      return { status: 'error', error: describe(response, body) };
  }
}

/**
 * Spend a refresh token for a new pair.
 *
 * `null` means the server rejected the token itself and only a fresh login
 * can recover. Every other failure throws, so a transient fault stays
 * distinguishable from a dead session and never costs the person their login.
 */
export async function refreshTokens(
  appUrl: string,
  refreshToken: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<TokenSet | null> {
  const response = await post(
    fetchFn,
    `${appUrl}/api/oauth/token`,
    {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLI_CLIENT_ID,
    },
    AbortSignal.timeout(REFRESH_TIMEOUT_MS),
  );

  const body = await readJson(response);

  if (!response.ok) {
    if (errorCode(body) === 'invalid_grant') return null;
    throw new Error(describe(response, body));
  }

  return toTokenSet(body);
}

/**
 * RFC 7009. Best effort by design: logout must clear the local config whether
 * or not the server could be reached, and the server answers a revocation it
 * cannot act on with 200 anyway.
 */
export async function revokeRefreshToken(
  appUrl: string,
  refreshToken: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<void> {
  try {
    await post(
      fetchFn,
      `${appUrl}/api/oauth/revoke`,
      {
        token: refreshToken,
        token_type_hint: 'refresh_token',
        client_id: CLI_CLIENT_ID,
      },
      AbortSignal.timeout(REVOKE_TIMEOUT_MS),
    );
  } catch {
    // Offline, or the server is down. The local credential is still cleared.
  }
}
