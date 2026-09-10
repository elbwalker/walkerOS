import { z } from 'zod';
import { createCLILogger } from '../../core/cli-logger.js';
import {
  startDeviceAuthorization,
  pollDeviceToken,
  type TokenSet,
} from '../../core/oauth-client.js';
import {
  readConfig,
  writeConfig,
  resolveAppUrl,
  getConfigPath,
} from '../../lib/config-file.js';
import { requireSecureUrl } from '../../lib/secure-url.js';
import type { GlobalOptions } from '../../types/global.js';

/**
 * `walkeros auth login` on the RFC 8628 device authorization grant.
 *
 * The CLI never sees a password and never runs a local callback server: it
 * shows a code, the person approves it in a browser they already trust, and
 * the CLI polls until the approval lands.
 */

/** Grace added to the server's stated lifetime before we stop polling. */
const POLL_TIMEOUT_BUFFER_MS = 5000;

/** Interval to use when the caller states none. */
const DEFAULT_POLL_INTERVAL_MS = 5000;

/**
 * Floor on an interval that came from a SERVER.
 *
 * RFC 8628 lets a server state any minimum gap between polls, including none,
 * but `WALKEROS_APP_URL` is user-settable, so that number arrives from
 * whichever host the person is pointed at. A stated zero would otherwise set
 * this loop's pace to "as fast as the network allows" for the whole life of
 * the device code. A remote value may slow the loop down, never off its leash.
 */
const MIN_SERVER_POLL_INTERVAL_MS = 1000;

/**
 * Window to poll for when the caller states none. Sized to the lifetime a
 * device code is typically issued with, so a resume that was given no window
 * cannot outlive the code it is polling for.
 */
const DEFAULT_POLL_TIMEOUT_MS = 900_000;

/** RFC 8628 section 3.5: each `slow_down` adds five seconds. */
const SLOW_DOWN_STEP_MS = 5000;

/**
 * Ceiling on the identity lookup. It runs AFTER the session is on disk, so a
 * server that accepts the connection and then says nothing would otherwise
 * hold `walkeros auth login` open long past its last useful work.
 */
const WHOAMI_TIMEOUT_MS = 10_000;

const TIMED_OUT = 'Authorization timed out. Please try again.';

/**
 * The identity endpoint's response. Validated because a malformed body must
 * not put a non-string into the config where the email belongs.
 */
const WhoamiSchema = z.object({ email: z.string().min(1) });

export interface LoginCommandOptions extends GlobalOptions {
  url?: string;
  json?: boolean;
}

export interface LoginResult {
  success: boolean;
  email?: string;
  configPath?: string;
  error?: string;
}

export interface LoginOptions {
  url?: string;
  /** Override browser opener for testing */
  openUrl?: (url: string) => Promise<void>;
  /** Override fetch for testing */
  fetch?: typeof globalThis.fetch;
  /** Max poll attempts before giving up (for testing) */
  maxPollAttempts?: number;
  /** Poll interval, replacing the server's stated one (for testing) */
  pollIntervalMs?: number;
}

/**
 * The outcome of finishing a device authorization.
 *
 * It carries no token material. `completeDeviceLogin` stores the session
 * itself, so the credential file keeps exactly one writer and a caller can
 * neither persist nor leak what came back.
 *
 * `pending` and `slow_down` both mean the window closed with the approval
 * still outstanding: the device code is untouched, so the same code can be
 * handed back in. `slow_down` is that same situation with the server asking
 * for a wider gap before the next attempt.
 */
export type DeviceLoginResult =
  | { status: 'ok' }
  | { status: 'pending' }
  | { status: 'slow_down' }
  | { status: 'denied' }
  | { status: 'expired' }
  | { status: 'error'; error: string };

export interface CompleteDeviceLoginOptions {
  /** App to poll. Defaults to the resolved app URL. */
  url?: string;
  /** Stop polling after this long. */
  timeoutMs?: number;
  /** Wait between polls, before any `slow_down` widens it. */
  intervalMs?: number;
  /** Override fetch for testing */
  fetch?: typeof globalThis.fetch;
  /** Max poll attempts before giving up (for testing) */
  maxPollAttempts?: number;
}

async function openInBrowser(url: string): Promise<void> {
  const { default: open } = await import('open');
  await open(url);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginCommand(
  options: LoginCommandOptions,
): Promise<void> {
  const logger = createCLILogger(options);

  try {
    const result = await login({ url: options.url });

    if (options.json) {
      logger.json(result);
    } else if (result.success) {
      if (result.email) logger.info(`Logged in as ${result.email}`);
      else logger.info('Logged in.');
      logger.info(`Session stored in ${result.configPath}`);
    } else if (result.error) {
      logger.error(result.error);
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (options.json) {
      logger.json({ success: false, error: message });
    } else {
      logger.error(message);
    }

    process.exit(1);
  }
}

/**
 * Ask the API who the freshly issued token belongs to.
 *
 * Non-fatal: the session is already stored and usable, and an address is only
 * there so the CLI can name the account it logged into.
 */
async function fetchEmail(
  appUrl: string,
  accessToken: string,
  fetchFn: typeof globalThis.fetch,
): Promise<string | undefined> {
  try {
    const response = await fetchFn(`${appUrl}/api/auth/whoami`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(WHOAMI_TIMEOUT_MS),
    });
    if (!response.ok) return undefined;
    const parsed = WhoamiSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.email : undefined;
  } catch {
    return undefined;
  }
}

/** Store the session a device authorization yielded, and name its account. */
async function persistSession(
  appUrl: string,
  tokens: TokenSet,
  fetchFn: typeof globalThis.fetch,
): Promise<void> {
  // Every credential key is written explicitly, including the ones that may
  // be absent: `writeConfig` merges, so a key left out would keep the
  // PREVIOUS session's value and quietly outlive the login that replaced it.
  writeConfig({
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    refreshToken: tokens.refreshToken ?? undefined,
    appUrl,
    // Drop the static token this session replaces, so the deprecated path
    // cannot outlive the login that retired it.
    token: undefined,
  });

  // Unconditional: a stale address is worse than none, since `walkeros
  // feedback` sends it as the reporter's identity.
  const email = await fetchEmail(appUrl, tokens.accessToken, fetchFn);
  writeConfig({ email });
}

/**
 * Poll a device authorization to its end and store the session it yields.
 *
 * Split out from `login` so a caller holding only a device code can finish an
 * authorization that is already under way. `login` cannot serve that: it
 * starts a fresh authorization on every call, which would strand the code the
 * person is looking at.
 */
export async function completeDeviceLogin(
  deviceCode: string,
  options: CompleteDeviceLoginOptions = {},
): Promise<DeviceLoginResult> {
  const fetchFn = options.fetch ?? globalThis.fetch;
  const appUrl = requireSecureUrl(options.url || resolveAppUrl());
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS);

  let intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  let attempts = 0;
  let waiting: 'pending' | 'slow_down' = 'pending';

  // Waiting out the interval is part of an attempt, so there is only room for
  // another poll while a whole interval still fits inside the window.
  while (Date.now() + intervalMs <= deadline) {
    if (
      options.maxPollAttempts !== undefined &&
      attempts >= options.maxPollAttempts
    )
      break;
    attempts += 1;

    await delay(intervalMs);

    // The window bounds the request too, not just how many are started: a
    // stalled response would otherwise run past the deadline on the HTTP
    // client's own clock.
    const poll = await pollDeviceToken(
      appUrl,
      deviceCode,
      fetchFn,
      AbortSignal.timeout(Math.max(1, deadline - Date.now())),
    );

    if (poll.status === 'pending') {
      waiting = 'pending';
      continue;
    }
    if (poll.status === 'slow_down') {
      waiting = 'slow_down';
      intervalMs += SLOW_DOWN_STEP_MS;
      continue;
    }
    if (poll.status !== 'ok') return poll;

    await persistSession(appUrl, poll.tokens, fetchFn);
    return { status: 'ok' };
  }

  return { status: waiting };
}

export async function login(options: LoginOptions = {}): Promise<LoginResult> {
  const fetchFn = options.fetch ?? globalThis.fetch;
  const appUrl = requireSecureUrl(options.url || resolveAppUrl());

  let authorization;
  try {
    authorization = await startDeviceAuthorization(appUrl, fetchFn);
  } catch {
    return { success: false, error: 'Failed to request device code' };
  }

  const target = authorization.verificationUriComplete;

  const prompt = (message: string) => process.stderr.write(message + '\n');
  prompt(`\n! Your one-time code: ${authorization.userCode}`);
  prompt(`  Authorize here: ${target}\n`);

  const opener = options.openUrl ?? openInBrowser;
  try {
    await opener(target);
    prompt('  Opening browser...');
  } catch {
    prompt('  Could not open browser. Visit the URL manually.');
  }

  prompt('  Waiting for authorization... (press Ctrl+C to cancel)\n');

  const outcome = await completeDeviceLogin(authorization.deviceCode, {
    url: appUrl,
    fetch: fetchFn,
    timeoutMs: authorization.expiresIn * 1000 + POLL_TIMEOUT_BUFFER_MS,
    // Clamped here, at the one place a server's number enters the loop. The
    // helper takes its caller's interval as stated, which is what keeps a
    // stated 0 from becoming a poll flood without making the helper's own
    // option untestably slow.
    intervalMs:
      options.pollIntervalMs ??
      Math.max(MIN_SERVER_POLL_INTERVAL_MS, authorization.interval * 1000),
    ...(options.maxPollAttempts !== undefined
      ? { maxPollAttempts: options.maxPollAttempts }
      : {}),
  });

  switch (outcome.status) {
    case 'ok': {
      // Read back rather than returned: `completeDeviceLogin` owns the config
      // file, so what is on disk is the only account this session belongs to.
      const email = readConfig()?.email;
      return {
        success: true,
        ...(email ? { email } : {}),
        configPath: getConfigPath(),
      };
    }
    case 'denied':
      return { success: false, error: 'Authorization was denied.' };
    case 'error':
      return { success: false, error: outcome.error };
    default:
      return { success: false, error: TIMED_OUT };
  }
}
