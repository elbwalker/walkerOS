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
 * `walkeros login` speaks standard OAuth 2.1, code plus PKCE, with the
 * authorization server the configured app URL names. The app's protected
 * resource document for its REST API (RFC 9728, `APP_PATHS.protectedResource`)
 * names that server; the server's metadata (RFC 8414) names the endpoints;
 * and the CLI's client document on the server (its URL is the CLI's client
 * id) names its two return addresses, a loopback on this machine and a code
 * page on the server for a sign-in finished on another device.
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

/** The REST API: every token the CLI asks for is for this resource (RFC 8707). */
const REST_API = '/api';

/** Read on the authorization server's origin (RFC 8414 section 3.1). */
const AUTHORIZATION_SERVER_METADATA = '/.well-known/oauth-authorization-server';

/** The CLI's client document on the authorization server; its URL is the client id. */
const CLI_CLIENT = '/oauth/walkeros-cli';

/** A sign-in step that stopped; its message names what to do next. */
export class LoginError extends Error {}

/** The authorization server's endpoints and the CLI's client there. */
export interface AuthorizationServer {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string;
  clientId: string;
  /** The return address on the authorization server that shows a code to paste. */
  codePage: string;
}

export interface Discovery extends AuthorizationServer {
  /** The app's REST API, named in the authorization and every token request. */
  resource: string;
}

const ResourceDocumentSchema = z.object({
  resource: z.string(),
  authorization_servers: z.array(z.string()),
});

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

const CHECK_APP_URL =
  'check the app URL (WALKEROS_APP_URL, or appUrl in the walkerOS config)';

async function readDocument(base: string, path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await appFetch(path, {
      baseUrl: base,
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new LoginError(
      `could not reach ${base}: ${fetchFailureReason(error, REQUEST_TIMEOUT_MS)}: ${CHECK_APP_URL} and the connection`,
    );
  }
  if (!response.ok)
    throw new LoginError(
      `${base} answered HTTP ${response.status} for ${path}: ${CHECK_APP_URL}`,
    );
  try {
    const body: unknown = await response.json();
    return body;
  } catch {
    throw new LoginError(
      `${base} answered ${path} with something that is not JSON: ${CHECK_APP_URL}`,
    );
  }
}

/** Why an address may not carry a sign-in, or null. */
function addressProblem(name: string, value: string): string | null {
  if (CONTROL_CHARACTERS.test(value))
    return `${name} holds a control character`;
  if (!isSecureSignInUrl(value))
    return `${name} ${value} is neither https nor http on this machine`;
  return null;
}

/** Why an endpoint of `issuer` may not be used, or null. */
function endpointProblem(
  name: string,
  value: string,
  issuer: string,
): string | null {
  const problem = addressProblem(name, value);
  if (problem !== null) return problem;
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
 * Read and check the authorization server's documents. Nothing is sent to an
 * endpoint before all of these hold: the issuer is https or http on this
 * machine; the metadata, read with its well-known suffix between the issuer's
 * host and path (RFC 8414 3.1), names that issuer byte for byte (3.3); every
 * endpoint is on the issuer's origin and is https or http on this machine;
 * the metadata offers PKCE with S256; the client document's id is
 * `<issuer>/oauth/walkeros-cli`, it registers the loopback, and one of its
 * return addresses is on the issuer's origin (picked by origin, never by
 * scheme: a local server is http like the loopback).
 */
export async function discoverAuthorizationServer(
  issuer: string,
): Promise<AuthorizationServer> {
  const problem = addressProblem('the authorization server', issuer);
  if (problem !== null) throw new LoginError(`${problem}: ${CHECK_APP_URL}`);
  const server = new URL(issuer);

  const metadata = MetadataSchema.safeParse(
    await readDocument(
      server.origin,
      `${AUTHORIZATION_SERVER_METADATA}${server.pathname.replace(/\/+$/, '')}`,
    ),
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
    const endpoint = endpointProblem(name, value, issuer);
    if (endpoint)
      throw new LoginError(
        `the sign-in settings of ${issuer} are refused: ${endpoint}: ${CHECK_APP_URL}`,
      );
  }
  // A server that publishes no PKCE methods may ignore the challenge, and a
  // code taken on this machine would then work without the verifier.
  if (!(m.code_challenge_methods_supported ?? []).includes('S256'))
    throw new LoginError(
      `${issuer} does not offer PKCE with S256, which walkeros login needs: ${CHECK_APP_URL}`,
    );

  const clientId = `${issuer}${CLI_CLIENT}`;
  const document = ClientDocumentSchema.safeParse(
    await readDocument(issuer, CLI_CLIENT),
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

/**
 * Find and check the authorization server of an app URL, which must be an
 * origin: the app serves its resources from its origin, and for an origin the
 * document's address (RFC 9728 3.1) is the origin plus the well-known path.
 * Its REST API is the resource `<app URL>/api`; the app's document for it
 * must name exactly that resource (RFC 9728 3.3) and exactly one
 * authorization server, whose own documents `discoverAuthorizationServer`
 * then checks. Nothing is read from that server before the app's document
 * passes.
 */
export async function discover(appUrl: string): Promise<Discovery> {
  const app = appUrl.replace(/\/+$/, '');
  if (CONTROL_CHARACTERS.test(app) || !isSecureSignInUrl(app))
    throw new LoginError(
      `walkeros login signs in only over https, or http on this machine, and the app URL is ${app}: ${CHECK_APP_URL}`,
    );
  const url = new URL(app);
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '')
    throw new LoginError(
      `walkeros login takes the app URL as an origin, and ${app} has a path, a query or a fragment: ${CHECK_APP_URL}`,
    );
  const resource = `${app}${REST_API}`;

  const document = ResourceDocumentSchema.safeParse(
    await readDocument(app, APP_PATHS.protectedResource),
  );
  if (!document.success)
    throw new LoginError(
      `the resource metadata of ${app} lacks a resource or authorization servers: ${CHECK_APP_URL}`,
    );
  if (document.data.resource !== resource)
    throw new LoginError(
      `the resource metadata of ${app} names another resource than ${resource}: ${CHECK_APP_URL}`,
    );
  const servers = document.data.authorization_servers;
  if (servers.length !== 1)
    throw new LoginError(
      `the resource metadata of ${app} names ${servers.length} authorization servers, not one: ${CHECK_APP_URL}`,
    );

  return { ...(await discoverAuthorizationServer(servers[0])), resource };
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

/** The authorization address, naming the REST API as its resource (RFC 8707 2). */
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
  url.searchParams.set('resource', discovery.resource);
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
  resource: string;
}): Promise<EndpointAnswer> {
  return postForm(
    request.tokenEndpoint,
    {
      grant_type: 'authorization_code',
      client_id: request.clientId,
      code: request.code,
      redirect_uri: request.redirectUri,
      code_verifier: request.verifier,
      resource: request.resource,
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
    'issuer' | 'resource' | 'clientId' | 'tokenEndpoint' | 'revocationEndpoint'
  >,
  tokens: TokenSet,
  now = Date.now(),
): StoredLogin {
  return {
    issuer: endpoints.issuer,
    resource: endpoints.resource,
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
          resource: login.resource,
        },
        true,
      );
      if (answer.kind === 'ok' && answer.tokens) {
        const tokens = answer.tokens;
        const refreshed = loginOf(
          {
            issuer: login.issuer,
            resource: login.resource,
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
