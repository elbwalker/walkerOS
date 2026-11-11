import { createInterface } from 'readline';
import { timingSafeEqual } from 'crypto';
import { resolveAppUrl, configDirWarning } from '../../lib/config-file.js';
import {
  deletePending,
  isPendingExpired,
  loginForAppUrl,
  readCredentials,
  readPending,
  removeExpiredPending,
  withCredentialsLock,
  writePending,
  type StoredLogin,
} from '../../lib/credentials.js';
import {
  answerText,
  authorizeUrl,
  createPkce,
  createState,
  discover,
  exchangeCode,
  issuerOf,
  LoginError,
  loginOf,
  logoutStoredLogin,
  PASTED_CODE_SHAPE,
  replaceLoginLocked,
  revokeReplaced,
  storeLogin,
  type Discovery,
  type EndpointAnswer,
  type LogoutOutcome,
} from '../../core/oauth-login.js';
import { listenForCallback } from '../../core/login-listener.js';
import { openSignInPage, type OpenResult } from '../../core/browser-opener.js';
import { resolveAccessToken } from '../../core/auth.js';

/**
 * `walkeros login` and `walkeros logout`: a person signs the CLI in with the
 * walkerOS app in a browser, code plus PKCE (`core/oauth-login.ts`).
 *
 * - On this machine the browser opens and returns to a loopback listener;
 *   nothing is copied.
 * - With `--no-browser` the CLI prints an address to open on any device, and
 *   the page after Allow shows a one-time code: pasted at the prompt, or, with
 *   no terminal to prompt in (Remote Control, an agent), passed later as
 *   `walkeros login --code <code>`.
 *
 * WALKEROS_TOKEN stays the credential for CI, and wins while it is set.
 */

export const LOGIN_EXIT = { ok: 0, failed: 1, usage: 2 } as const;
export type LoginExit = (typeof LOGIN_EXIT)[keyof typeof LOGIN_EXIT];

/** The loopback listener waits this long for the browser. */
export const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

export interface LoginIO {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  stdin: NodeJS.ReadableStream;
  /** Whether a person can answer a prompt on stdin. */
  interactive: boolean;
  open: (url: string, issuer: string) => Promise<OpenResult>;
  callbackTimeoutMs: number;
}

function defaultIO(): LoginIO {
  return {
    stdout: process.stdout,
    stderr: process.stderr,
    stdin: process.stdin,
    interactive: process.stdin.isTTY === true,
    open: openSignInPage,
    callbackTimeoutMs: CALLBACK_TIMEOUT_MS,
  };
}

export interface LoginOptions {
  /** False with `--no-browser`. */
  browser: boolean;
  code?: string;
  port?: string;
}

const say = (io: LoginIO, text: string) => io.stdout.write(`${text}\n`);
const warn = (io: LoginIO, command: string, text: string) =>
  io.stderr.write(`walkeros ${command}: ${text}\n`);

const ENV_TOKEN_WINS =
  'WALKEROS_TOKEN is set and is used instead of this sign-in until it is unset';

class UsageError extends Error {}

function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function parsePort(options: LoginOptions): number {
  const [name, raw] =
    options.port !== undefined
      ? ['--port', options.port]
      : ['WALKEROS_LOGIN_PORT', process.env.WALKEROS_LOGIN_PORT];
  if (raw === undefined || raw === '') return 0;
  const port = /^\d{1,5}$/.test(raw) ? Number(raw) : NaN;
  if (!(port >= 1 && port <= 65535))
    throw new UsageError(`${name} must be a port from 1 to 65535: ${raw}`);
  return port;
}

function signedIn(io: LoginIO, issuer: string): void {
  say(io, `Signed in to ${issuer}. walkeros auth whoami shows the account.`);
}

/** The command that starts the same kind of sign-in again. */
type Retry = 'walkeros login' | 'walkeros login --no-browser';

/** What a refused or failed code exchange tells the person. */
function exchangeFailure(
  issuer: string,
  answer: EndpointAnswer,
  retry: Retry,
): string {
  if (answer.kind === 'refused' && answer.error === 'invalid_grant')
    return `${issuer} did not accept the code (it is spent, expired, or from another sign-in): run ${retry} again`;
  if (answer.kind === 'unreachable')
    return `could not reach ${issuer}: ${answer.reason}: run ${retry} again`;
  return `${issuer} refused the sign-in (${answerText(answer)}): run ${retry} again`;
}

async function finishWith(
  io: LoginIO,
  discovery: Discovery,
  answer: EndpointAnswer,
  retry: Retry,
): Promise<LoginExit> {
  if (answer.kind === 'ok' && answer.tokens) {
    await storeLogin(loginOf(discovery, answer.tokens));
    signedIn(io, discovery.issuer);
    return LOGIN_EXIT.ok;
  }
  warn(io, 'login', exchangeFailure(discovery.issuer, answer, retry));
  return LOGIN_EXIT.failed;
}

async function loginWithBrowser(
  io: LoginIO,
  discovery: Discovery,
  port: number,
): Promise<LoginExit> {
  const pkce = createPkce();
  const state = createState();
  const listener = await listenForCallback({
    port,
    state,
    issuer: discovery.issuer,
    timeoutMs: io.callbackTimeoutMs,
  });
  try {
    const url = authorizeUrl(discovery, {
      redirectUri: listener.redirectUri,
      challenge: pkce.challenge,
      state,
    });
    say(io, `Opening the browser to sign in to ${discovery.issuer}.`);
    const opened = await io.open(url, discovery.issuer);
    if (opened.kind === 'refused') {
      listener.close();
      warn(
        io,
        'login',
        `refusing to open the sign-in address: ${opened.problem}: check the app URL`,
      );
      return LOGIN_EXIT.failed;
    }
    if (opened.kind === 'failed')
      warn(
        io,
        'login',
        `could not open a browser (${opened.reason}): run walkeros login --no-browser`,
      );
    say(io, `If no browser opens, open this address on this computer:\n${url}`);
    say(
      io,
      'If the browser shows a connection error, run walkeros login --no-browser',
    );

    const code = await listener.code;
    const answer = await exchangeCode({
      tokenEndpoint: discovery.tokenEndpoint,
      clientId: discovery.clientId,
      code,
      redirectUri: listener.redirectUri,
      verifier: pkce.verifier,
    });
    const exit = await finishWith(io, discovery, answer, 'walkeros login');
    listener.finish(exit === LOGIN_EXIT.ok);
    return exit;
  } catch (error) {
    listener.finish(false);
    throw error;
  }
}

/** The first line typed on stdin, or null when it closes first. */
function readLine(stdin: NodeJS.ReadableStream): Promise<string | null> {
  const lines = createInterface({ input: stdin, terminal: false });
  return new Promise((resolve) => {
    let answered = false;
    lines.once('line', (line) => {
      answered = true;
      lines.close();
      resolve(line.trim());
    });
    lines.once('close', () => {
      if (!answered) resolve(null);
    });
  });
}

const CODE_LIFE =
  'The code works once, within 5 minutes of Allow; this sign-in waits 15 minutes.';

async function loginWithCodePage(
  io: LoginIO,
  discovery: Discovery,
): Promise<LoginExit> {
  const pkce = createPkce();
  const state = createState();
  const url = authorizeUrl(discovery, {
    redirectUri: discovery.codePage,
    challenge: pkce.challenge,
    state,
  });
  say(io, `Open this address on any device, sign in and Allow:\n${url}`);

  if (!io.interactive) {
    writePending({
      code_verifier: pkce.verifier,
      state,
      redirect_uri: discovery.codePage,
      issuer: discovery.issuer,
      client_id: discovery.clientId,
      token_endpoint: discovery.tokenEndpoint,
      created_at: Date.now(),
    });
    say(io, 'When the page shows a code, run: walkeros login --code <code>');
    say(io, CODE_LIFE);
    return LOGIN_EXIT.ok;
  }

  say(
    io,
    'Then paste the code the page shows. It works once, within 5 minutes of Allow.',
  );
  io.stdout.write('Code: ');
  const typed = await readLine(io.stdin);
  const match = typed === null ? null : PASTED_CODE_SHAPE.exec(typed);
  if (match === null) {
    warn(
      io,
      'login',
      'that is not the code the page shows (64 hex characters, a dot, then more): run walkeros login --no-browser again',
    );
    return LOGIN_EXIT.usage;
  }
  if (!sameSecret(match[2], state)) {
    warn(
      io,
      'login',
      'that code belongs to another sign-in: run walkeros login --no-browser again',
    );
    return LOGIN_EXIT.failed;
  }
  const answer = await exchangeCode({
    tokenEndpoint: discovery.tokenEndpoint,
    clientId: discovery.clientId,
    code: match[1],
    redirectUri: discovery.codePage,
    verifier: pkce.verifier,
  });
  return finishWith(io, discovery, answer, 'walkeros login --no-browser');
}

const NO_PENDING =
  'no sign-in is waiting for this code (it was used, or it expired): run walkeros login --no-browser to start a new one';

/** What the locked part of `--code` found. */
type CodeOutcome =
  | { kind: 'signed-in'; login: StoredLogin; replaced: StoredLogin | undefined }
  | { kind: 'no-pending' }
  | { kind: 'unreachable'; reason: string }
  | { kind: 'failed'; answer: EndpointAnswer };

/**
 * Finish a sign-in that `walkeros login --no-browser` left pending. The
 * pasted string is checked by shape and never echoed; without a matching
 * pending file nothing is sent, so a code is never presented twice. The
 * pending file goes after a definitive answer (signed in, or `invalid_grant`)
 * and stays after a network failure, so the same command can be run again.
 *
 * Reading the pending file, the exchange, storing the login and deleting the
 * pending file run under the credentials lock: a second `--code` with the
 * same string waits, then finds no pending file and sends nothing (the app
 * would take a second presentation of a code as a leak and end the sign-in
 * the first one made). Discovery runs before the lock, so the lock is held
 * for one request at most.
 */
async function loginWithCode(io: LoginIO, pasted: string): Promise<LoginExit> {
  const match = PASTED_CODE_SHAPE.exec(pasted.trim());
  if (match === null) {
    warn(
      io,
      'login',
      'that is not the code the page shows (64 hex characters, a dot, then more): copy the whole code',
    );
    return LOGIN_EXIT.usage;
  }
  const [, code, state] = match;
  const waiting = readPending(state);
  if (waiting === null || isPendingExpired(waiting)) {
    deletePending(state);
    warn(io, 'login', NO_PENDING);
    return LOGIN_EXIT.failed;
  }

  // The revocation endpoint a login keeps comes from the same issuer's
  // documents; the exchange itself goes to the pending file's token endpoint.
  // Nothing was exchanged yet, so the pending sign-in stays for a retry.
  let discovery: Discovery;
  try {
    discovery = await discover(waiting.issuer);
  } catch (error) {
    if (!(error instanceof LoginError)) throw error;
    warn(
      io,
      'login',
      `${error.message}; the code is not used yet: run the same walkeros login --code again`,
    );
    return LOGIN_EXIT.failed;
  }
  if (
    discovery.tokenEndpoint !== waiting.token_endpoint ||
    discovery.clientId !== waiting.client_id
  ) {
    deletePending(state);
    warn(
      io,
      'login',
      `the sign-in settings of ${waiting.issuer} changed since this sign-in started: run walkeros login --no-browser again`,
    );
    return LOGIN_EXIT.failed;
  }

  const outcome = await withCredentialsLock(async (): Promise<CodeOutcome> => {
    const pending = readPending(state);
    if (pending === null || isPendingExpired(pending)) {
      deletePending(state);
      return { kind: 'no-pending' };
    }
    const answer = await exchangeCode({
      tokenEndpoint: pending.token_endpoint,
      clientId: pending.client_id,
      code,
      redirectUri: pending.redirect_uri,
      verifier: pending.code_verifier,
    });
    if (answer.kind === 'unreachable')
      return { kind: 'unreachable', reason: answer.reason };
    if (answer.kind === 'ok' && answer.tokens !== undefined) {
      const login = loginOf(discovery, answer.tokens);
      const replaced = replaceLoginLocked(login);
      deletePending(state);
      return { kind: 'signed-in', login, replaced };
    }
    if (answer.kind === 'refused' && answer.error === 'invalid_grant')
      deletePending(state);
    return { kind: 'failed', answer };
  });

  switch (outcome.kind) {
    case 'signed-in':
      await revokeReplaced(outcome.replaced, outcome.login);
      signedIn(io, discovery.issuer);
      return LOGIN_EXIT.ok;
    case 'no-pending':
      warn(io, 'login', NO_PENDING);
      return LOGIN_EXIT.failed;
    case 'unreachable':
      warn(
        io,
        'login',
        `could not reach ${discovery.issuer}: ${outcome.reason}: run the same walkeros login --code again`,
      );
      return LOGIN_EXIT.failed;
    case 'failed':
      warn(
        io,
        'login',
        exchangeFailure(
          discovery.issuer,
          outcome.answer,
          'walkeros login --no-browser',
        ),
      );
      return LOGIN_EXIT.failed;
  }
}

/** `walkeros login`. Exit 0 signed in (or waiting for `--code`), 1 failed, 2 usage. */
export async function runLogin(
  options: LoginOptions,
  io: LoginIO = defaultIO(),
): Promise<LoginExit> {
  try {
    if (resolveAccessToken() !== null) warn(io, 'login', ENV_TOKEN_WINS);
    removeExpiredPending();
    if (options.code !== undefined)
      return await loginWithCode(io, options.code);

    const port = parsePort(options);
    const discovery = await discover(resolveAppUrl());
    const dirWarning = configDirWarning();
    if (dirWarning !== null) warn(io, 'login', dirWarning);
    return options.browser
      ? await loginWithBrowser(io, discovery, port)
      : await loginWithCodePage(io, discovery);
  } catch (error) {
    if (error instanceof UsageError) {
      warn(io, 'login', error.message);
      return LOGIN_EXIT.usage;
    }
    if (error instanceof Error) {
      warn(io, 'login', error.message);
      return LOGIN_EXIT.failed;
    }
    throw error;
  }
}

/**
 * `walkeros logout`: revoke the stored login for the app URL, then remove it.
 * Exit 0 when signed out (or nothing to sign out), 1 when the app could not
 * confirm the revocation: this machine is signed out either way.
 */
export async function runLogout(
  io: Pick<LoginIO, 'stdout' | 'stderr'> = defaultIO(),
): Promise<LoginExit> {
  const out = (text: string) => io.stdout.write(`${text}\n`);
  const err = (text: string) => io.stderr.write(`walkeros logout: ${text}\n`);
  const appUrl = resolveAppUrl();
  const envTokenSet = resolveAccessToken() !== null;
  let exit: LoginExit = LOGIN_EXIT.ok;
  try {
    const login = loginForAppUrl(readCredentials(), appUrl);
    const outcome: LogoutOutcome =
      login === undefined
        ? { kind: 'none' }
        : await logoutStoredLogin(login.issuer);
    if (outcome.kind === 'none') {
      out(`Not signed in to ${issuerOf(appUrl)}.`);
    } else if (outcome.kind === 'revoked') {
      out(`Signed out of ${outcome.issuer}.`);
    } else {
      err(
        `could not reach ${outcome.issuer} (${outcome.answer}): the sign-in still works until you disconnect walkerOS CLI under Account, Connected apps, which signs the CLI out on every computer`,
      );
      out(`Signed out of ${outcome.issuer} on this computer.`);
      exit = LOGIN_EXIT.failed;
    }
  } catch (error) {
    err(error instanceof Error ? error.message : String(error));
    exit = LOGIN_EXIT.failed;
  }
  if (envTokenSet)
    out('WALKEROS_TOKEN is set and stays in use until it is unset.');
  return exit;
}
