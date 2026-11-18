import { getErrorMessage, type Authorize } from '@walkeros/core';
import {
  createServiceAuth,
  readServiceCredential,
  sendWithServiceAuth,
  SERVICE_CREDENTIAL_ENV,
  type ServiceAuth,
} from '@walkeros/server-core';
import { readCredentials, loginForAppUrl } from '../lib/credentials.js';
import { readConfig, resolveAppUrl } from '../lib/config-file.js';
import { requireSecureUrl } from '../lib/secure-url.js';
import { createCLILogger } from './cli-logger.js';
import { isFresh, refreshStoredLogin, SignInError } from './oauth-login.js';

/** The credential a command sends, and where it comes from. */
export type Credential =
  | { source: 'credential'; auth: ServiceAuth }
  | { source: 'login'; token: string; issuer: string };

/** Which credential a command would send to an app URL, read without any request. */
export type CredentialStatus =
  /**
   * WALKEROS_CREDENTIAL, sent to the app it names; `conflict` is the fact
   * when the app URL set beside it names another app (nothing is sent then).
   */
  | { kind: 'credential'; app: string; conflict?: string }
  /** WALKEROS_CREDENTIAL holds no walkerOS credential; the reason names no value. */
  | { kind: 'unreadable'; reason: string }
  | { kind: 'login'; issuer: string }
  /** Signed in, but to other app URLs than this one. */
  | { kind: 'elsewhere'; issuers: string[] }
  | { kind: 'none' };

/** The credential's headers gave no request headers; the message is the fact. */
export class CredentialError extends Error {}

/** WALKEROS_CREDENTIAL names another app than the app URL set beside it; the message names both. */
export class CredentialAppError extends Error {}

/** One client per environment its credential was read from. */
const clients = new WeakMap<NodeJS.ProcessEnv, ServiceAuth>();

/** Whether WALKEROS_CREDENTIAL is set, or was read already, in `env`. */
export function credentialSet(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[SERVICE_CREDENTIAL_ENV] !== undefined || clients.has(env);
}

/**
 * The client of WALKEROS_CREDENTIAL, an automation from Account in the
 * walkerOS app. The variable is read once and removed from `env`, so a flow
 * this process runs cannot read it; its client is kept for that environment,
 * so later requests of the process reuse its token. Undefined when it is not
 * set; a value that is no walkerOS credential throws the fact.
 */
export function credentialClient(
  env: NodeJS.ProcessEnv = process.env,
): ServiceAuth | undefined {
  const credential = readServiceCredential(env);
  if (credential) {
    clients.get(env)?.close();
    clients.set(
      env,
      createServiceAuth(credential, { logger: createCLILogger() }),
    );
  }
  return clients.get(env);
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/+$/, '');
  }
}

/**
 * Where a person set the app URL, when they did: WALKEROS_APP_URL, else the
 * config's appUrl. The default is no setting.
 */
function appUrlSetting(): { origin: string; name: string } | undefined {
  const env = process.env.WALKEROS_APP_URL;
  if (env) return { origin: originOf(env), name: 'WALKEROS_APP_URL' };
  const config = readConfig()?.appUrl;
  if (config)
    return { origin: originOf(config), name: 'appUrl in the walkerOS config' };
  return undefined;
}

/**
 * The fact when the app URL a person set names another app than the
 * credential: the credential is sent only to its own app, and the setting is
 * not passed over without a word.
 */
function appConflict(auth: ServiceAuth): string | undefined {
  const setting = appUrlSetting();
  return setting && setting.origin !== auth.origin
    ? `WALKEROS_CREDENTIAL is for ${auth.origin}, and ${setting.name} names ${setting.origin}`
    : undefined;
}

/** The credential's client, refused with `CredentialAppError` on an app conflict. */
function credentialForItsApp(): ServiceAuth | undefined {
  const auth = credentialClient();
  if (!auth) return undefined;
  const conflict = appConflict(auth);
  if (conflict) throw new CredentialAppError(conflict);
  return auth;
}

export function credentialStatus(
  appUrl: string = resolveAppUrl(),
): CredentialStatus {
  if (credentialSet()) {
    let auth: ServiceAuth | undefined;
    try {
      auth = credentialClient();
    } catch (error) {
      return { kind: 'unreadable', reason: getErrorMessage(error) };
    }
    if (auth) {
      const conflict = appConflict(auth);
      return {
        kind: 'credential',
        app: auth.origin,
        ...(conflict && { conflict }),
      };
    }
  }
  const logins = readCredentials();
  const login = loginForAppUrl(logins, appUrl);
  if (login) return { kind: 'login', issuer: login.issuer };
  const issuers = Object.keys(logins);
  return issuers.length > 0 ? { kind: 'elsewhere', issuers } : { kind: 'none' };
}

/**
 * The credential to send to the app: WALKEROS_CREDENTIAL first, then the
 * `walkeros login` stored for the app URL's origin, renewed when it is about
 * to expire. Null when there is neither.
 *
 * WALKEROS_CREDENTIAL is sent only to the app it names; a set app URL that
 * names another app throws `CredentialAppError` with both. A stored login is
 * never sent to another origin: with the app URL pointing elsewhere this
 * throws, naming where the person is signed in. Throws `SignInError` when the
 * login ended or could not be renewed.
 */
export async function resolveCredential(
  appUrl: string = resolveAppUrl(),
): Promise<Credential | null> {
  const auth = credentialForItsApp();
  if (auth) return { source: 'credential', auth };

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
 * The app a credential is sent to: WALKEROS_CREDENTIAL names its own (a set
 * app URL that names another is refused by `resolveCredential`), and a login
 * is the one for `appUrl`.
 */
export function credentialAppUrl(
  credential: Credential,
  appUrl: string,
): string {
  return credential.source === 'credential' ? credential.auth.origin : appUrl;
}

/** One app request as a credential's headers cover it: the exact body bytes. */
export interface CredentialRequest {
  method: string;
  url: string;
  body?: Uint8Array;
}

/** The credential client's headers, or its fact as a `CredentialError`. */
function headersOf(auth: ServiceAuth): Authorize {
  return async (request) => {
    try {
      return await auth.authorize(request);
    } catch (error) {
      throw new CredentialError(getErrorMessage(error));
    }
  };
}

/**
 * Send one request with a credential; `send` puts the headers on it. The
 * address is checked first, so nothing is bought for a URL that would carry
 * the credential's token in the clear. WALKEROS_CREDENTIAL goes through the
 * client's one way to send (`sendWithServiceAuth`: fresh headers per attempt,
 * every answer reported, at most one retry). A stored login's 401 renews the
 * login once and sends once more. Never in a loop.
 */
export async function sendWithCredential(
  credential: Credential,
  request: CredentialRequest,
  send: (headers: Record<string, string>) => Promise<Response>,
): Promise<Response> {
  requireSecureUrl(request.url);
  if (credential.source === 'credential') {
    const { auth } = credential;
    return sendWithServiceAuth(
      {
        authorize: headersOf(auth),
        answered: (answer) => auth.answered(answer),
      },
      request,
      send,
    );
  }
  const response = await send({ Authorization: `Bearer ${credential.token}` });
  if (response.status !== 401) return response;
  await response.body?.cancel();
  const renewed = await refreshStoredLogin(credential.issuer, {
    rejected: credential.token,
  });
  return send({ Authorization: `Bearer ${renewed.access_token}` });
}

/**
 * Whether the credential's client already wrote the line for this answer:
 * a 401 or 403 to WALKEROS_CREDENTIAL. A command then adds none of its own,
 * so each refusal is one line.
 */
export function refusalWritten(
  credential: Credential,
  status: number,
): boolean {
  return (
    credential.source === 'credential' && (status === 401 || status === 403)
  );
}
