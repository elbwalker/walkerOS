import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { appFetch } from './app-fetch.js';
import { APP_PATHS } from './app-paths.js';
import { clientContextHeaders } from './client-context.js';
import { fetchFailureReason } from './fetch-failure.js';
import { isSecureSignInUrl } from '../lib/secure-url.js';
import {
  CredentialsBusyError,
  readCredentials,
  withCredentialsLock,
  writeCredentials,
  type Credentials,
  type LockTiming,
  type StoredLogin,
} from '../lib/credentials.js';

/**
 * `walkeros login` speaks standard OAuth 2.1, code plus PKCE, to the app URL
 * it is configured with. Everything but one path comes from the app's own
 * documents: the authorization server metadata (RFC 8414) names the
 * endpoints, and the CLI's client document (`APP_PATHS.cliClient`) names its
 * client id and its two return addresses, a loopback on this machine and a
 * code page on the app for a sign-in finished on another device.
 */

/** `offline_access` buys the refresh token the CLI keeps. */
export const LOGIN_SCOPE = 'read write offline_access';

/** The loopback return address the client document registers; any port matches it. */
export const LOOPBACK_REDIRECT_URI = 'http://127.0.0.1/callback';

/** An authorization code of the walkerOS app. */
export const CODE_SHAPE = /^[0-9a-f]{64}$/;

/** What the code page shows: `<code>.<state>`. */
export const PASTED_CODE_SHAPE = /^([0-9a-f]{64})\.([A-Za-z0-9_-]{1,128})$/;

/** Every request a sign-in sends gives up after this long. */
export const REQUEST_TIMEOUT_MS = 10_000;

/** An access token is used only while it stays valid this much longer. */
const FRESH_FOR_MS = 60_000;

/** A sign-in step that stopped; its message names what to do next. */
export class LoginError extends Error {}

export interface Discovery {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string;
  clientId: string;
  /** The return address on the app that shows a code to paste. */
  codePage: string;
}

const MetadataSchema = z.object({
  issuer: z.string(),
  authorization_endpoint: z.string(),
  token_endpoint: z.string(),
  revocation_endpoint: z.string(),
  code_challenge_methods_supported: z.array(z.string()).optional(),
});

const ClientDocumentSchema = z.object({
  client_id: z.string(),
  redirect_uris: z.array(z.string()),
});

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** The issuer an app URL stands for: the URL without trailing slashes. */
export function issuerOf(appUrl: string): string {
  return appUrl.replace(/\/+$/, '');
}

const CHECK_APP_URL =
  'check the app URL (WALKEROS_APP_URL, or appUrl in the walkerOS config)';

async function readDocument(issuer: string, path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await appFetch(path, {
      baseUrl: issuer,
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new LoginError(
      `could not reach ${issuer}: ${fetchFailureReason(error, REQUEST_TIMEOUT_MS)}: ${CHECK_APP_URL} and the connection`,
    );
  }
  if (!response.ok)
    throw new LoginError(
      `${issuer} answered HTTP ${response.status} for ${path}: ${CHECK_APP_URL}`,
    );
  try {
    const body: unknown = await response.json();
    return body;
  } catch {
    throw new LoginError(
      `${issuer} answered ${path} with something that is not JSON: ${CHECK_APP_URL}`,
    );
  }
}

/** The sign-in address of the endpoint, or why it may not be used. */
function endpointProblem(
  name: string,
  value: string,
  issuer: string,
): string | null {
  if (CONTROL_CHARACTERS.test(value))
    return `${name} holds a control character`;
  if (!isSecureSignInUrl(value))
    return `${name} ${value} is neither https nor http on this machine`;
  if (originOf(value) !== originOf(issuer))
    return `${name} ${value} is not on ${issuer}`;
  return null;
}

function isLoopbackEntry(uri: string): boolean {
  try {
    const url = new URL(uri);
    return (
      url.protocol === 'http:' &&
      url.hostname === '127.0.0.1' &&
      url.port === '' &&
      url.pathname === '/callback'
    );
  } catch {
    return false;
  }
}

/**
 * Read and check the app's sign-in documents. Nothing is sent to an endpoint
 * before all of these hold: the metadata's `issuer` is the app URL itself
 * (RFC 8414 3.3); every endpoint is on the issuer's origin and is https or
 * http on this machine; the client document's id is
 * `<issuer>/oauth/walkeros-cli`, it registers the loopback, and one of its
 * return addresses is on the issuer's origin (picked by origin, never by
 * scheme: a local app is http like the loopback).
 */
export async function discover(appUrl: string): Promise<Discovery> {
  const issuer = issuerOf(appUrl);
  if (CONTROL_CHARACTERS.test(issuer) || !isSecureSignInUrl(issuer))
    throw new LoginError(
      `walkeros login signs in only over https, or http on this machine, and the app URL is ${issuer}: ${CHECK_APP_URL}`,
    );

  const metadata = MetadataSchema.safeParse(
    await readDocument(issuer, APP_PATHS.authorizationServer),
  );
  if (!metadata.success)
    throw new LoginError(
      `the sign-in settings of ${issuer} lack an issuer, an authorization, token or revocation endpoint: ${CHECK_APP_URL}`,
    );
  const m = metadata.data;
  if (m.issuer !== issuer)
    throw new LoginError(
      `the sign-in settings of ${issuer} name another issuer: ${CHECK_APP_URL}`,
    );
  const endpoints: Array<[string, string]> = [
    ['authorization_endpoint', m.authorization_endpoint],
    ['token_endpoint', m.token_endpoint],
    ['revocation_endpoint', m.revocation_endpoint],
  ];
  for (const [name, value] of endpoints) {
    const problem = endpointProblem(name, value, issuer);
    if (problem)
      throw new LoginError(
        `the sign-in settings of ${issuer} are refused: ${problem}: ${CHECK_APP_URL}`,
      );
  }
  if (
    m.code_challenge_methods_supported !== undefined &&
    !m.code_challenge_methods_supported.includes('S256')
  )
    throw new LoginError(
      `${issuer} does not offer PKCE with S256, which walkeros login needs: ${CHECK_APP_URL}`,
    );

  const clientId = `${issuer}${APP_PATHS.cliClient}`;
  const document = ClientDocumentSchema.safeParse(
    await readDocument(issuer, APP_PATHS.cliClient),
  );
  if (!document.success || document.data.client_id !== clientId)
    throw new LoginError(
      `${issuer} does not serve the walkerOS CLI client ${clientId}: ${CHECK_APP_URL}`,
    );
  const uris = document.data.redirect_uris;
  const codePage = uris.find(
    (uri) =>
      !isLoopbackEntry(uri) &&
      endpointProblem('code page', uri, issuer) === null,
  );
  if (!uris.some(isLoopbackEntry) || codePage === undefined)
    throw new LoginError(
      `the walkerOS CLI client of ${issuer} does not register the loopback and a code page on ${issuer}: ${CHECK_APP_URL}`,
    );

  return {
    issuer,
    authorizationEndpoint: m.authorization_endpoint,
    tokenEndpoint: m.token_endpoint,
    revocationEndpoint: m.revocation_endpoint,
    clientId,
    codePage,
  };
}

// === PKCE and the authorization request ===

export interface Pkce {
  verifier: string;
  /** BASE64URL(SHA256(verifier)), RFC 7636 4.2. */
  challenge: string;
}

export function createPkce(): Pkce {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/** 32 base64url characters, well inside the app's 128. */
export function createState(): string {
  return randomBytes(24).toString('base64url');
}

/** The authorization address. No `resource`: the app gives the CLI's client the REST API only. */
export function authorizeUrl(
  discovery: Discovery,
  request: { redirectUri: string; challenge: string; state: string },
): string {
  const url = new URL(discovery.authorizationEndpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', discovery.clientId);
  url.searchParams.set('redirect_uri', request.redirectUri);
  url.searchParams.set('code_challenge', request.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('scope', LOGIN_SCOPE);
  url.searchParams.set('state', request.state);
  return url.toString();
}

/**
 * Why a URL may not be opened in a browser for a sign-in to `issuer`, or
 * null. Only an https address, or http on this machine, on the issuer's
 * origin and with no control character, is ever handed to an opener.
 */
export function browserUrlProblem(url: string, issuer: string): string | null {
  if (CONTROL_CHARACTERS.test(url)) return 'it holds a control character';
  if (!isSecureSignInUrl(url))
    return 'it is neither https nor http on this machine';
  if (originOf(url) !== originOf(issuer)) return `it is not on ${issuer}`;
  return null;
}

// === The token and revocation endpoints ===

const TokenSetSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().refine((type) => type.toLowerCase() === 'bearer'),
  expires_in: z.number(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
});
export type TokenSet = z.infer<typeof TokenSetSchema>;

const OAuthErrorSchema = z.object({ error: z.string() });

export type EndpointAnswer =
  /** 200 with a token set (the token endpoint) or 200 (revocation). */
  | { kind: 'ok'; tokens?: TokenSet }
  /** An OAuth error answer, such as `invalid_grant`. */
  | { kind: 'refused'; status: number; error: string }
  /** Another answer: a status without an OAuth error, or a 200 that is no token set. */
  | { kind: 'failed'; status: number }
  /** Nothing came back: the network, the timeout, or a redirect (never followed). */
  | { kind: 'unreachable'; reason: string };

/**
 * POST a form to a token or revocation endpoint. A redirect is an error, never
 * followed: a 307 or 308 would send the code verifier or the refresh token in
 * this body on to wherever it points.
 */
async function postForm(
  url: string,
  form: Record<string, string>,
  expectTokens: boolean,
): Promise<EndpointAnswer> {
  if (!isSecureSignInUrl(url))
    throw new LoginError(
      `refusing to send a walkerOS sign-in to ${url}: it is neither https nor http on this machine: run walkeros login`,
    );
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        ...clientContextHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(form).toString(),
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    return {
      kind: 'unreachable',
      reason: fetchFailureReason(error, REQUEST_TIMEOUT_MS),
    };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  if (response.ok) {
    if (!expectTokens) return { kind: 'ok' };
    const tokens = TokenSetSchema.safeParse(body);
    return tokens.success
      ? { kind: 'ok', tokens: tokens.data }
      : { kind: 'failed', status: response.status };
  }
  const error = OAuthErrorSchema.safeParse(body);
  return error.success
    ? { kind: 'refused', status: response.status, error: error.data.error }
    : { kind: 'failed', status: response.status };
}

export function exchangeCode(request: {
  tokenEndpoint: string;
  clientId: string;
  code: string;
  redirectUri: string;
  verifier: string;
}): Promise<EndpointAnswer> {
  return postForm(
    request.tokenEndpoint,
    {
      grant_type: 'authorization_code',
      client_id: request.clientId,
      code: request.code,
      redirect_uri: request.redirectUri,
      code_verifier: request.verifier,
    },
    true,
  );
}

/** RFC 7009: revoking the refresh token ends its whole sign-in, the access token too. */
export function revokeLogin(login: StoredLogin): Promise<EndpointAnswer> {
  if (login.refresh_token === undefined)
    return postForm(
      login.revocation_endpoint,
      {
        client_id: login.client_id,
        token: login.access_token,
        token_type_hint: 'access_token',
      },
      false,
    );
  return postForm(
    login.revocation_endpoint,
    {
      client_id: login.client_id,
      token: login.refresh_token,
      token_type_hint: 'refresh_token',
    },
    false,
  );
}

/** One answer's words for a message: `HTTP 400 invalid_request`. */
export function answerText(answer: EndpointAnswer): string {
  switch (answer.kind) {
    case 'ok':
      return 'HTTP 200';
    case 'refused':
      return `HTTP ${answer.status} ${answer.error}`;
    case 'failed':
      return `HTTP ${answer.status}`;
    case 'unreachable':
      return answer.reason;
  }
}

// === Stored logins ===

export function isFresh(login: StoredLogin, now = Date.now()): boolean {
  return login.expires_at - now > FRESH_FOR_MS;
}

export function loginOf(
  endpoints: Pick<
    Discovery,
    'issuer' | 'clientId' | 'tokenEndpoint' | 'revocationEndpoint'
  >,
  tokens: TokenSet,
  now = Date.now(),
): StoredLogin {
  return {
    issuer: endpoints.issuer,
    client_id: endpoints.clientId,
    token_endpoint: endpoints.tokenEndpoint,
    revocation_endpoint: endpoints.revocationEndpoint,
    access_token: tokens.access_token,
    expires_at: now + tokens.expires_in * 1000,
    ...(tokens.refresh_token === undefined
      ? {}
      : { refresh_token: tokens.refresh_token }),
    ...(tokens.scope === undefined ? {} : { scope: tokens.scope }),
  };
}

/**
 * Write a new login over the one for its issuer and answer the one it
 * replaced. Call it only while holding `withCredentialsLock`.
 */
export function replaceLoginLocked(
  login: StoredLogin,
): StoredLogin | undefined {
  const logins = readCredentials();
  const previous = logins[login.issuer];
  writeCredentials({ ...logins, [login.issuer]: login });
  return previous;
}

/**
 * Revoke the login a new one replaced, best effort, after the new one is
 * written: it would otherwise stay live for its refresh token's life.
 */
export async function revokeReplaced(
  replaced: StoredLogin | undefined,
  login: StoredLogin,
): Promise<void> {
  if (replaced !== undefined && replaced.refresh_token !== login.refresh_token)
    await revokeLogin(replaced).catch(() => undefined);
}

/** Keep a new login, under the lock, and revoke the one it replaces. */
export async function storeLogin(
  login: StoredLogin,
  timing?: LockTiming,
): Promise<void> {
  const replaced = await withCredentialsLock(
    async () => replaceLoginLocked(login),
    timing,
  );
  await revokeReplaced(replaced, login);
}

/** Why a stored login gives no token; the message names the next step. */
export class SignInError extends Error {
  constructor(
    message: string,
    readonly reason: 'ended' | 'unreachable' | 'elsewhere' | 'busy',
  ) {
    super(message);
  }
}

/** Every login but the one for `issuer`. */
function without(logins: Credentials, issuer: string): Credentials {
  return Object.fromEntries(
    Object.entries(logins).filter(([key]) => key !== issuer),
  );
}

function endedError(issuer: string): SignInError {
  return new SignInError(
    `your sign-in to ${issuer} ended: run walkeros login`,
    'ended',
  );
}

/**
 * A usable access token of the stored login for `issuer`, refreshed when it
 * is about to expire, or was refused (`rejected`, the token a 401 answered).
 *
 * The whole read, refresh and write runs under the credentials lock, and the
 * file is read again once the lock is held: a command that waited behind
 * another one's refresh finds the rotated token and sends nothing. The app
 * answers a replayed refresh token by ending the whole sign-in.
 *
 * The refresh goes to the token endpoint stored with the login, never to one
 * discovered again. `invalid_grant` or `invalid_client` removes the login; a
 * network failure keeps it.
 */
export async function refreshStoredLogin(
  issuer: string,
  options: { rejected?: string; timing?: LockTiming } = {},
): Promise<StoredLogin> {
  try {
    return await withCredentialsLock(async () => {
      const logins = readCredentials();
      const login = logins[issuer];
      if (login === undefined) throw endedError(issuer);
      if (login.access_token !== options.rejected && isFresh(login))
        return login;

      const remove = () => writeCredentials(without(logins, issuer));
      if (login.refresh_token === undefined) {
        remove();
        throw endedError(issuer);
      }

      const answer = await postForm(
        login.token_endpoint,
        {
          grant_type: 'refresh_token',
          client_id: login.client_id,
          refresh_token: login.refresh_token,
        },
        true,
      );
      if (answer.kind === 'ok' && answer.tokens) {
        const tokens = answer.tokens;
        const refreshed = loginOf(
          {
            issuer: login.issuer,
            clientId: login.client_id,
            tokenEndpoint: login.token_endpoint,
            revocationEndpoint: login.revocation_endpoint,
          },
          {
            ...tokens,
            refresh_token: tokens.refresh_token ?? login.refresh_token,
            scope: tokens.scope ?? login.scope,
          },
        );
        writeCredentials({ ...logins, [issuer]: refreshed });
        return refreshed;
      }
      if (
        answer.kind === 'refused' &&
        (answer.error === 'invalid_grant' || answer.error === 'invalid_client')
      ) {
        remove();
        throw endedError(issuer);
      }
      if (answer.kind === 'unreachable')
        throw new SignInError(
          `could not reach ${issuer} to renew the sign-in: ${answer.reason}: try again`,
          'unreachable',
        );
      throw new SignInError(
        `${issuer} did not renew the sign-in (${answerText(answer)}): try again, or run walkeros login`,
        'unreachable',
      );
    }, options.timing);
  } catch (error) {
    if (error instanceof SignInError) throw error;
    if (error instanceof LoginError)
      throw new SignInError(error.message, 'ended');
    if (error instanceof CredentialsBusyError)
      throw new SignInError(error.message, 'busy');
    throw error;
  }
}

export type LogoutOutcome =
  | { kind: 'revoked'; issuer: string }
  | { kind: 'unconfirmed'; issuer: string; answer: string }
  | { kind: 'none' };

/**
 * Sign the login for `issuer` out: revoke its refresh token at the stored
 * revocation endpoint first, then remove it, under the lock. It is removed
 * whatever the app answers, so a person can always sign this machine out; an
 * answer other than 200 or `invalid_client` (the client itself is gone) is
 * reported, since the sign-in may then still work.
 */
export async function logoutStoredLogin(
  issuer: string,
  timing?: LockTiming,
): Promise<LogoutOutcome> {
  return withCredentialsLock(async () => {
    const logins = readCredentials();
    const login = logins[issuer];
    if (login === undefined) return { kind: 'none' };
    const answer = await revokeLogin(login).catch(
      (error: unknown): EndpointAnswer => ({
        kind: 'unreachable',
        reason: error instanceof Error ? error.message : String(error),
      }),
    );
    writeCredentials(without(logins, issuer));
    if (
      answer.kind === 'ok' ||
      (answer.kind === 'refused' && answer.error === 'invalid_client')
    )
      return { kind: 'revoked', issuer };
    return { kind: 'unconfirmed', issuer, answer: answerText(answer) };
  }, timing);
}
