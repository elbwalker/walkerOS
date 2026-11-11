import { readCredentials, loginForAppUrl } from '../lib/credentials.js';
import { resolveAppUrl } from '../lib/config-file.js';
import { isFresh, refreshStoredLogin, SignInError } from './oauth-login.js';

/** WALKEROS_TOKEN, a token from Account > Automation tokens. Env only; `resolveCredential` adds `walkeros login`. */
export function resolveAccessToken(): string | null {
  const token = process.env.WALKEROS_TOKEN;
  return token ? token : null;
}

/** The credential a command sends, and where it comes from. */
export type Credential =
  | { source: 'env'; token: string }
  | { source: 'login'; token: string; issuer: string };

/** Which credential a command would send to an app URL, read without any request. */
export type CredentialStatus =
  | { kind: 'env' }
  | { kind: 'login'; issuer: string }
  /** Signed in, but to other app URLs than this one. */
  | { kind: 'elsewhere'; issuers: string[] }
  | { kind: 'none' };

export function credentialStatus(
  appUrl: string = resolveAppUrl(),
): CredentialStatus {
  if (resolveAccessToken() !== null) return { kind: 'env' };
  const logins = readCredentials();
  const login = loginForAppUrl(logins, appUrl);
  if (login) return { kind: 'login', issuer: login.issuer };
  const issuers = Object.keys(logins);
  return issuers.length > 0 ? { kind: 'elsewhere', issuers } : { kind: 'none' };
}

/**
 * The credential to send to the app: WALKEROS_TOKEN first, then the
 * `walkeros login` stored for the app URL's origin, renewed when it is about
 * to expire. Null when there is neither.
 *
 * A stored login is never sent to another origin: with the app URL pointing
 * elsewhere this throws, naming where the person is signed in. Throws
 * `SignInError` when the login ended or could not be renewed.
 */
export async function resolveCredential(
  appUrl: string = resolveAppUrl(),
): Promise<Credential | null> {
  const env = resolveAccessToken();
  if (env !== null) return { source: 'env', token: env };

  const logins = readCredentials();
  const login = loginForAppUrl(logins, appUrl);
  if (login === undefined) {
    const issuers = Object.keys(logins);
    if (issuers.length === 0) return null;
    throw new SignInError(
      `signed in to ${issuers.join(', ')}, not ${appUrl.replace(/\/+$/, '')}: run walkeros login`,
      'elsewhere',
    );
  }
  const usable = isFresh(login)
    ? login
    : await refreshStoredLogin(login.issuer);
  return { source: 'login', token: usable.access_token, issuer: usable.issuer };
}

/**
 * Send a request with a credential. When the app answers 401 to a stored
 * login's token, the login is renewed once and the request sent once more,
 * never in a loop; WALKEROS_TOKEN is sent once.
 */
export async function sendWithCredential(
  credential: Credential,
  send: (token: string) => Promise<Response>,
): Promise<Response> {
  const response = await send(credential.token);
  if (response.status !== 401 || credential.source !== 'login') return response;
  await response.body?.cancel();
  const renewed = await refreshStoredLogin(credential.issuer, {
    rejected: credential.token,
  });
  return send(renewed.access_token);
}
