import type {
  Authorize,
  Logger,
  ServiceAuthMetadata,
  ServiceCredential,
  ServiceTargetKind,
} from '@walkeros/core';
import {
  createLogger,
  networkErrorMessage,
  parseServiceTokenResponse,
} from '@walkeros/core';
import { fullJitterDelay, retryAfterMs } from '../backoff';
import { ChannelError } from '../channel';
import { retryBudget } from '../retryBudget';
import { clientAssertion } from './assertion';
import { discoverIssuer } from './discovery';
import { dpopProof } from './dpop';
import { signRequest } from './signature';

/** The tag of a signature at the app's routes (RFC 9421 section 2.3). */
export const APP_SIGNATURE_TAG = 'walkeros-app';

/** A renewal starts at the first use an hour after the purchase. */
const RENEW_AFTER_MS = 3_600_000;
/** Failed purchases back off with full jitter, doubling from this base to the cap. */
const BACKOFF_BASE_MS = 60_000;
const BACKOFF_CAP_MS = 3_600_000;
/** A token this close to its end is not sent, so it cannot expire on the way. */
const EXPIRY_MARGIN_MS = 60_000;

const GRANT_TYPE = 'client_credentials';
const ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
const CLOSED = 'The service credential client is closed';

/** Who holds a credential of each kind, as a refused line names it. */
const HOLDER: Record<ServiceTargetKind, string> = {
  deployment: 'runner',
  'data-plane': 'data agent',
  automation: 'automation',
};

/**
 * What the token endpoint's `invalid_client` means for each kind, and what to
 * do: the end is named there, since a credential that ended can buy no token.
 */
const ENDED: Record<ServiceTargetKind, string> = {
  deployment:
    '(replaced, revoked or ended); a self-hosted runner is paired again on its Self-hosted tab',
  'data-plane': '(replaced, revoked or ended)',
  automation: '(revoked or ended)',
};

/**
 * How far this clock may be off either way, by the check that refused,
 * before its line notes the offset: inside the window the check passed the
 * clock, so a note would point nowhere. The walkerOS app's auth server takes
 * an assertion for an offset in (-30 s, +30 s]: it is signed for
 * `ASSERTION_LIFETIME_SECONDS`, and the server takes an `exp` in the future
 * and at most 60 s ahead (its `ASSERTION_MAX_AHEAD_SECONDS`). The app and its
 * auth server take a proof's `iat` within 60 s either way (their
 * `DPOP_MAX_SKEW_SECONDS`), and the app a signature's `created` within 60 s
 * either way (`verifyRequestSignature`'s default). Each window is 2 s less,
 * for the `Date` header's whole seconds and the transit.
 */
const CLOCK_WINDOW_SECONDS = {
  assertion: 28,
  proof: 58,
  signature: 58,
};

/**
 * The line of the other refusals: a 401 tied to no token the client holds
 * tells no end (the token endpoint tells it), a 403 refuses only this route
 * (its scope or the holder's role).
 */
function refusedLine(kind: ServiceTargetKind, status: number): string {
  return status === 401
    ? `The app refused this ${HOLDER[kind]}'s credential (HTTP 401)`
    : `The app's route refused this ${HOLDER[kind]}'s credential (scope or role; HTTP ${status})`;
}

/**
 * A 401 to a token bought since the app refused the one before: the auth
 * server sells this credential tokens the app does not take here, so the
 * line names what they are for and no end.
 */
function refusedFreshTokenLine(
  kind: ServiceTargetKind,
  resource: string,
): string {
  return `The app refused a token the auth server had just issued for this ${HOLDER[kind]}'s credential (HTTP 401); its tokens are for ${resource}`;
}

/** RFC 9449 section 8.1: a nonce is one or more NQCHAR. */
const NONCE = /^[\x21\x23-\x5b\x5d-\x7e]+$/;

export type ServiceAuthLogger = Pick<Logger.Instance, 'error'>;

export interface ServiceToken {
  token: string;
  type: 'DPoP' | 'Bearer';
  expiresAt: Date;
}

export interface ServiceAuthOptions {
  /** The fetch for the auth server; the global one, read at call time, by default. */
  fetch?: typeof fetch;
  /** ms since the epoch, as `Date.now()`. */
  now?: () => number;
  /** Where the lines of a change of state go; an ERROR logger by default. */
  logger?: ServiceAuthLogger;
  /** For the back-off's jitter. */
  random?: () => number;
}

export interface ServiceAuth {
  /**
   * The headers one request needs, and only for the credential's resource
   * origin (another origin gets none): a live token and its DPoP proof, else,
   * for a runner or a data agent, an RFC 9421 signature. An automation never
   * signs: with no live token it buys one, and failing that it throws the fact.
   */
  authorize: Authorize;
  /** The live DPoP-bound token, bought when there is none; `bound: false` buys one unbound 1-hour bearer. */
  token(input?: { bound?: boolean }): Promise<ServiceToken>;
  /**
   * How the app answered a request `authorize` gave headers for; call it with
   * every answer (`sendWithServiceAuth` does). A 401 or 403 writes the
   * refused line once per change of state. Answers true when one retry of
   * that request may pass: a 401 asking for a DPoP nonce, or a 401 naming the
   * token invalid, which is dropped so the next `authorize` buys once more.
   * That drop writes no line: the next answer, or the purchase's refusal,
   * writes it.
   */
  answered(answer: { status: number; headers?: Headers }): boolean;
  /** The credential's resource origin, the one origin `authorize` serves. */
  readonly origin: string;
  /** Aborts a token request in flight and forgets the token. */
  close(): void;
}

type FailureKind = 'refused' | 'failed';

/** A token request that ended in no token; the message is the fact. */
class TokenRequestError extends Error {
  readonly kind: FailureKind;
  readonly retryAfterMs?: number;
  /**
   * The state its line stands for: the kind, and for a refusal its OAuth
   * error, so a refusal for another reason (an end after a refused proof)
   * writes its own line while a repeat, whose clock note may differ, does not.
   */
  readonly state: string;

  constructor(
    message: string,
    kind: FailureKind,
    options: { retryAfterMs?: number; error?: string } = {},
  ) {
    super(message);
    this.name = 'TokenRequestError';
    this.kind = kind;
    this.retryAfterMs = options.retryAfterMs;
    this.state = options.error ? `${kind} ${options.error}` : kind;
  }
}

interface Held {
  token: string;
  type: 'DPoP' | 'Bearer';
  boughtAt: number;
  expiresAt: number;
}

function nonceOf(value: string | null): string | undefined {
  return value !== null && NONCE.test(value) ? value : undefined;
}

/**
 * A 401 to a signed request names no error (RFC 6750 section 3.1: the DPoP
 * scheme defines no signature), so it can mean only this much.
 */
function refusedSignatureLine(kind: ServiceTargetKind): string {
  return `The app refused this ${HOLDER[kind]}'s signed request (HTTP 401): its credential is not connected yet or has ended, or this clock is off`;
}

/**
 * A 401 refusing the DPoP proof, not the token (RFC 9449 section 7.1): at the
 * app that means its `iat` is off the app's clock or its `htu` is not the
 * app's URL, so no new credential helps.
 */
function refusedProofLine(kind: ServiceTargetKind): string {
  return `The app refused this ${HOLDER[kind]}'s DPoP proof (HTTP 401): this clock is off or the request URL is not the app's`;
}

/** What does not help when the app refuses a proof, per kind. */
const NO_NEW_CREDENTIAL: Record<ServiceTargetKind, string> = {
  deployment: 'pairing again does not help',
  'data-plane': 'pairing again does not help',
  automation: 'a new automation does not help',
};

function refusesProof(headers: Headers | undefined): boolean {
  const challenge = headers ? headers.get('www-authenticate') : null;
  return challenge !== null && /\berror="invalid_dpop_proof"/.test(challenge);
}

/** A challenge with no error code, or none at all. */
function namesNoError(headers: Headers | undefined): boolean {
  const challenge = headers ? headers.get('www-authenticate') : null;
  return challenge === null || !/\berror=/.test(challenge);
}

/** A 401 whose challenge names the token invalid, or that carries no challenge. */
function refusesToken(headers: Headers | undefined): boolean {
  const challenge = headers ? headers.get('www-authenticate') : null;
  return challenge === null || /\berror="invalid_token"/.test(challenge);
}

function asksForNonce(headers: Headers | undefined): boolean {
  const challenge = headers ? headers.get('www-authenticate') : null;
  return (
    challenge !== null &&
    /\bDPoP\b/i.test(challenge) &&
    /\berror="use_dpop_nonce"/.test(challenge)
  );
}

/** Text an answer carries, as one log line can hold it. */
function printable(text: string, max: number): string {
  return text.replace(/[^\x20-\x7e]/g, '').slice(0, max);
}

/** The `error` and `error_description` of an OAuth error answer (RFC 6749 section 5.2). */
async function errorAnswer(
  response: Response,
): Promise<{ error?: string; description?: string }> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {};
  }
  if (typeof body !== 'object' || body === null) return {};
  return {
    error:
      'error' in body && typeof body.error === 'string'
        ? printable(body.error, 64)
        : undefined,
    description:
      'error_description' in body && typeof body.error_description === 'string'
        ? printable(body.error_description, 200)
        : undefined,
  };
}

/**
 * The app's own answer a channel failure carries, for `answered`: a status of
 * the request's own hop, with its headers when it came as an HTTP answer,
 * never the storage's answer after the archive's redirect.
 */
export function appAnswerOf(
  error: unknown,
): { status: number; headers?: Headers } | undefined {
  if (
    !(error instanceof ChannelError) ||
    error.hop !== 'origin' ||
    error.status === undefined
  )
    return undefined;
  const { status, headers } = error;
  return headers === undefined ? { status } : { status, headers };
}

/**
 * The client of one credential. It buys DPoP-bound tokens at first use
 * (RFC 10070 assertion, RFC 9449 proof), renews at the first use an hour
 * after each purchase and keeps the old token while a renewal fails, backs
 * off with full jitter (doubling to an hour),
 * answers a `DPoP-Nonce` by one retry, and writes one ERROR line per change
 * of state; no line carries a credential, token, assertion, proof or
 * signature. Each attempt of a token request takes `retryBudget`'s attempt
 * time.
 */
export function createServiceAuth(
  credential: ServiceCredential,
  options: ServiceAuthOptions = {},
): ServiceAuth {
  const fetchImpl: typeof fetch =
    options.fetch || ((input, init) => globalThis.fetch(input, init));
  const now = options.now || Date.now;
  const random = options.random || Math.random;
  const logger = options.logger || createLogger();
  const attemptMs = retryBudget().attempt;
  const origin = new URL(credential.resource).origin;
  const issuerOrigin = new URL(credential.iss).origin;
  const { kind } = credential.target;
  const closer = new AbortController();
  /** The last nonce each server gave, by origin (RFC 9449 section 9). */
  const nonces = new Map<string, string>();

  let metadata: ServiceAuthMetadata | undefined;
  let current: Held | undefined;
  let inFlight: Promise<Held> | undefined;
  let failures = 0;
  let notBefore = 0;
  let lastFailure: TokenRequestError | undefined;
  /** The state of the last failure line written, until a purchase passes. */
  let loggedFailure: string | undefined;
  let sending: 'token' | 'signature' | undefined;
  /** Which refused line the app's last refusal wrote, until an answer below 400 ends it. */
  let refusedAs: string | undefined;
  /**
   * One retry per refusal: set by a dropped token, ended by any answer but a
   * 401. While it is set, a token the client holds was bought since the drop.
   */
  let retriedRefusal = false;

  /**
   * Runs one attempt under its own time limit, which also aborts its fetch;
   * a fetch that ignores the signal is no longer waited for, so a stuck
   * answer never holds a purchase open.
   */
  function withinAttempt<T>(
    run: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const attempt = new AbortController();
    const timer = setTimeout(() => attempt.abort(), attemptMs);
    timer.unref();
    const onClose = () => attempt.abort();
    closer.signal.addEventListener('abort', onClose, { once: true });
    const { signal } = attempt;
    return new Promise<T>((resolve, reject) => {
      const settled = () => {
        clearTimeout(timer);
        closer.signal.removeEventListener('abort', onClose);
        signal.removeEventListener('abort', onAbort);
      };
      const onAbort = () => {
        settled();
        reject(
          new TokenRequestError(
            closer.signal.aborted
              ? CLOSED
              : `The auth server did not answer within ${attemptMs} ms`,
            'failed',
          ),
        );
      };
      if (closer.signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
      run(signal).then(
        (value) => {
          settled();
          resolve(value);
        },
        (error: unknown) => {
          settled();
          reject(error);
        },
      );
    });
  }

  async function discovered(): Promise<ServiceAuthMetadata> {
    if (metadata) return metadata;
    try {
      metadata = await withinAttempt((signal) =>
        discoverIssuer(credential.iss, {
          fetch: (input, init) => fetchImpl(input, { ...init, signal }),
        }),
      );
    } catch (error) {
      throw asFailure(error);
    }
    return metadata;
  }

  /**
   * This clock against an answer's `Date`, when it carries one and the
   * offset is past the window of the check that refused.
   */
  function clockOffset(
    headers: Headers | undefined,
    server: string,
    check: keyof typeof CLOCK_WINDOW_SECONDS,
  ): string {
    const date = headers ? headers.get('date') : null;
    const at = date === null ? NaN : Date.parse(date);
    if (Number.isNaN(at)) return '';
    const offset = Math.round((now() - at) / 1000);
    if (Math.abs(offset) <= CLOCK_WINDOW_SECONDS[check]) return '';
    return `; this clock is ${offset >= 0 ? '+' : ''}${offset} s off the ${server}'s`;
  }

  async function tokenOf(
    response: Response,
    bound: boolean,
    at: number,
  ): Promise<Held> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new TokenRequestError(
        'The token endpoint answered no JSON',
        'failed',
      );
    }
    const answer = parseServiceTokenResponse(body);
    if (!answer)
      throw new TokenRequestError(
        'The token endpoint answered no token',
        'failed',
      );
    const type = bound ? 'DPoP' : 'Bearer';
    if (answer.token_type !== type)
      throw new TokenRequestError(
        `The token endpoint answered a ${answer.token_type} token to a ${type} request`,
        'failed',
      );
    return {
      token: answer.access_token,
      type,
      boughtAt: at,
      expiresAt: at + answer.expires_in * 1000,
    };
  }

  /** One token request: a token, the nonce the server asks for, or its fact. */
  async function requestToken(
    endpoint: string,
    bound: boolean,
    nonce: string | undefined,
    signal: AbortSignal,
  ): Promise<Held | { retryNonce: string }> {
    const at = now();
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    };
    if (bound)
      headers.DPoP = await dpopProof({
        key: credential.sig,
        method: 'POST',
        url: endpoint,
        nonce,
        now: at,
      });
    const body = new URLSearchParams({
      grant_type: GRANT_TYPE,
      client_assertion_type: ASSERTION_TYPE,
      client_assertion: await clientAssertion({ credential, now: at }),
      resource: credential.resource,
    }).toString();
    let response: Response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers,
        body,
        redirect: 'manual',
        signal,
      });
    } catch (error) {
      throw new TokenRequestError(
        `The token request failed: ${networkErrorMessage(error)}`,
        'failed',
      );
    }
    // RFC 9449 section 8.2: a nonce in any answer is the one the next proof carries.
    const answeredNonce = nonceOf(response.headers.get('dpop-nonce'));
    if (bound && answeredNonce !== undefined)
      nonces.set(issuerOrigin, answeredNonce);
    if (response.status === 200) return tokenOf(response, bound, at);

    const answer = await errorAnswer(response);
    if (
      bound &&
      response.status === 400 &&
      answer.error === 'use_dpop_nonce' &&
      answeredNonce !== undefined
    )
      return { retryNonce: answeredNonce };
    const { status } = response;
    if (status >= 400 && status < 500 && status !== 429) {
      const what = answer.error
        ? answer.description
          ? `${answer.error}: ${answer.description}`
          : answer.error
        : `HTTP ${status}`;
      if (answer.error === 'invalid_client')
        throw new TokenRequestError(
          `The auth server refused this ${HOLDER[kind]}'s credential (${what}): ${ENDED[kind]}${clockOffset(response.headers, 'auth server', 'assertion')}`,
          'refused',
          { error: answer.error },
        );
      const clock =
        answer.error === 'invalid_dpop_proof'
          ? clockOffset(response.headers, 'auth server', 'proof')
          : '';
      throw new TokenRequestError(
        `The auth server refused this credential's token request (${what})${clock}`,
        'refused',
        { error: answer.error },
      );
    }
    throw new TokenRequestError(
      `The token endpoint answered HTTP ${status}`,
      'failed',
      {
        retryAfterMs: retryAfterMs(response.headers.get('retry-after'), now()),
      },
    );
  }

  async function purchase(bound: boolean): Promise<Held> {
    if (closer.signal.aborted) throw new TokenRequestError(CLOSED, 'failed');
    const { service_token_endpoint: endpoint } = await discovered();
    const first = await withinAttempt((signal) =>
      requestToken(
        endpoint,
        bound,
        bound ? nonces.get(issuerOrigin) : undefined,
        signal,
      ),
    );
    if (!('retryNonce' in first)) return first;
    const second = await withinAttempt((signal) =>
      requestToken(endpoint, bound, first.retryNonce, signal),
    );
    if (!('retryNonce' in second)) return second;
    throw new TokenRequestError(
      'The auth server asked for a DPoP nonce again',
      'refused',
    );
  }

  function asFailure(error: unknown): TokenRequestError {
    if (error instanceof TokenRequestError) return error;
    return new TokenRequestError(
      error instanceof Error ? error.message : 'The token request failed',
      'failed',
    );
  }

  /** The one bound purchase at a time: its outcome sets the token, the back-off and the lines. */
  async function settle(purchasing: Promise<Held>): Promise<Held> {
    try {
      const held = await purchasing;
      current = held;
      failures = 0;
      notBefore = 0;
      lastFailure = undefined;
      loggedFailure = undefined;
      return held;
    } catch (error) {
      const failure = asFailure(error);
      if (!closer.signal.aborted) {
        failures += 1;
        const wait = fullJitterDelay(failures, {
          baseMs: BACKOFF_BASE_MS,
          capMs: BACKOFF_CAP_MS,
          random,
        });
        const asked = Math.min(failure.retryAfterMs ?? 0, BACKOFF_CAP_MS);
        notBefore = now() + Math.max(wait, asked);
        lastFailure = failure;
        if (failure.state !== loggedFailure) logger.error(failure.message);
        loggedFailure = failure.state;
      }
      throw failure;
    } finally {
      inFlight = undefined;
    }
  }

  function buyBound(): Promise<Held> {
    if (!inFlight) inFlight = settle(purchase(true));
    return inFlight;
  }

  function live(): Held | undefined {
    return current && current.expiresAt - EXPIRY_MARGIN_MS > now()
      ? current
      : undefined;
  }

  const renewalDue = (held: Held) => now() >= held.boughtAt + RENEW_AFTER_MS;

  function noteSending(mode: 'token' | 'signature'): void {
    if (mode === 'signature' && sending !== 'signature')
      logger.error(
        `No live token: requests to ${origin} are signed until a token is bought`,
      );
    if (mode === 'token' && sending === 'signature')
      logger.error(`A token is bought again: requests to ${origin} carry it`);
    sending = mode;
  }

  const authorize: Authorize = async (
    request,
  ): Promise<Record<string, string>> => {
    if (closer.signal.aborted) throw new Error(CLOSED);
    if (new URL(request.url).origin !== origin) return {};
    let held = live();
    if (held && renewalDue(held) && !inFlight && now() >= notBefore)
      void buyBound().catch(() => undefined);
    if (!held && (inFlight || now() >= notBefore))
      held = await buyBound().catch(() => undefined);
    if (held) {
      const proof = await dpopProof({
        key: credential.sig,
        method: request.method,
        url: request.url,
        accessToken: held.token,
        nonce: nonces.get(origin),
        now: now(),
      });
      noteSending('token');
      return { Authorization: `DPoP ${held.token}`, DPoP: proof };
    }
    if (kind === 'automation')
      throw new Error(
        lastFailure
          ? lastFailure.message
          : 'This automation holds no live token',
      );
    const signed = await signRequest({
      method: request.method,
      url: request.url,
      body: request.body,
      key: credential.sig,
      tag: APP_SIGNATURE_TAG,
      created: Math.floor(now() / 1000),
    });
    noteSending('signature');
    return { ...signed };
  };

  const view = (held: Held): ServiceToken => ({
    token: held.token,
    type: held.type,
    expiresAt: new Date(held.expiresAt),
  });

  return {
    authorize,
    origin,
    async token(input = {}) {
      if (closer.signal.aborted) throw new Error(CLOSED);
      if (input.bound === false) return view(await purchase(false));
      let held = live();
      if (!held || renewalDue(held)) {
        try {
          held = await buyBound();
        } catch (error) {
          // A failed renewal keeps the live token.
          if (!held) throw error;
        }
      }
      return view(held);
    },
    answered({ status, headers }) {
      const nonce = nonceOf(headers ? headers.get('dpop-nonce') : null);
      if (nonce !== undefined) nonces.set(origin, nonce);
      if (status !== 401) retriedRefusal = false;
      if (status === 401 && nonce !== undefined && asksForNonce(headers))
        return sending === 'token';
      if (status !== 401 && status !== 403) {
        if (status < 400) refusedAs = undefined;
        return false;
      }
      // A refused token tells nothing yet: an ended credential's purchase is
      // refused at the token endpoint, whose line names the end, and a new
      // token may pass. So the one retry decides the line.
      if (
        status === 401 &&
        current &&
        !retriedRefusal &&
        refusesToken(headers)
      ) {
        current = undefined;
        retriedRefusal = true;
        return true;
      }
      const proof =
        status === 401 && sending === 'token' && refusesProof(headers);
      const signed =
        status === 401 && sending === 'signature' && namesNoError(headers);
      const fresh =
        status === 401 &&
        sending === 'token' &&
        retriedRefusal &&
        current !== undefined;
      const line = proof
        ? refusedProofLine(kind)
        : signed
          ? refusedSignatureLine(kind)
          : fresh
            ? refusedFreshTokenLine(kind, credential.resource)
            : refusedLine(kind, status);
      if (line !== refusedAs)
        logger.error(
          proof
            ? `${line}${clockOffset(headers, 'app', 'proof')}; ${NO_NEW_CREDENTIAL[kind]}`
            : signed
              ? line + clockOffset(headers, 'app', 'signature')
              : line,
        );
      refusedAs = line;
      return false;
    },
    close() {
      closer.abort();
      current = undefined;
      nonces.clear();
    },
  };
}

/**
 * Sends one request to the app with the credential's headers: `send` puts
 * them on the request and sends it. Each attempt gets fresh headers from
 * `authorize`, since a DPoP proof or a signature is good for one request
 * only, and every answer goes to `answered`. When the app answers a 401
 * asking for a DPoP nonce or naming the token invalid, the request goes once
 * more, never in a loop; the first answer's body is dropped unread.
 */
export async function sendWithServiceAuth(
  auth: Pick<ServiceAuth, 'authorize' | 'answered'>,
  request: { method: string; url: string; body?: Uint8Array },
  send: (headers: Record<string, string>) => Promise<Response>,
): Promise<Response> {
  const first = await send(await auth.authorize(request));
  if (!auth.answered({ status: first.status, headers: first.headers }))
    return first;
  // Not waited for: the cancel only frees the connection.
  void first.body?.cancel().catch(() => undefined);
  const second = await send(await auth.authorize(request));
  auth.answered({ status: second.status, headers: second.headers });
  return second;
}
