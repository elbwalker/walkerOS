import { hostname } from 'os';
import { z } from 'zod';
import { createCLILogger } from '../../core/cli-logger.js';
import {
  writeConfig,
  resolveAppUrl,
  getConfigPath,
} from '../../lib/config-file.js';
import type { GlobalOptions } from '../../types/global.js';

/**
 * Zod schema for the device-code response from `POST /api/auth/device/code`.
 * Validates the trust boundary between the auth server and the CLI so a
 * malformed response cannot propagate `undefined` into the browser-opener
 * or subsequent token polling.
 */
const DeviceCodeResponseSchema = z.object({
  deviceCode: z.string().min(1),
  userCode: z.string().min(1),
  verificationUri: z.string().min(1),
  verificationUriComplete: z.string().optional(),
  // Server protocol allows 0 for both (e.g. fast retry / already expired).
  expiresIn: z.number().int().nonnegative(),
  interval: z.number().int().nonnegative(),
});

/**
 * Zod schema for the token response from `POST /api/auth/device/token` on 2xx.
 * Validates that the token and email are both present and are strings before
 * writing them to the on-disk config.
 */
const TokenResponseSchema = z.object({
  token: z.string().min(1),
  email: z.string().min(1),
});

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
}

export interface DeviceCodeResult {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresIn: number;
  interval: number;
}

export interface DeviceCodeOptions {
  url?: string;
  fetch?: typeof globalThis.fetch;
}

export interface PollOptions {
  url?: string;
  fetch?: typeof globalThis.fetch;
  /** Timeout in milliseconds. Defaults to 60000 (60s). */
  timeoutMs?: number;
  /** Poll interval in milliseconds. Defaults to 5000. */
  intervalMs?: number;
}

export type PollResult =
  | {
      success: true;
      status: 'authenticated';
      email: string;
      configPath: string;
    }
  | { success: false; status: 'pending' }
  | { success: false; status: 'error'; error: string };

const POLL_TIMEOUT_BUFFER_MS = 5000;
const DEFAULT_POLL_TIMEOUT_MS = 60000;
const DEFAULT_POLL_INTERVAL_MS = 5000;

async function openInBrowser(url: string): Promise<void> {
  const { default: open } = await import('open');
  await open(url);
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
      logger.info(`Logged in as ${result.email}`);
      logger.info(`Token stored in ${result.configPath}`);
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
 * Request a device code from the auth server.
 * First step of the device code flow — returns data needed to show
 * the user a code and URL, then poll for the token.
 */
export async function requestDeviceCode(
  options: DeviceCodeOptions = {},
): Promise<DeviceCodeResult> {
  const appUrl = options.url || resolveAppUrl();
  const f = options.fetch ?? globalThis.fetch;

  const response = await f(`${appUrl}/api/auth/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error('Failed to request device code');
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new Error('Malformed device code response');
  }

  const parsed = DeviceCodeResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Malformed device code response');
  }

  return {
    deviceCode: parsed.data.deviceCode,
    userCode: parsed.data.userCode,
    verificationUri: parsed.data.verificationUri,
    verificationUriComplete: parsed.data.verificationUriComplete,
    expiresIn: parsed.data.expiresIn,
    interval: parsed.data.interval,
  };
}

/**
 * Poll the auth server until the device code is authorized, times out, or fails.
 * Second step of the device code flow.
 *
 * On success: writes config and returns authenticated result.
 * On timeout: returns pending (NOT an error — caller can retry).
 * On real error (denied, expired): returns error result.
 *
 * In-flight fetch requests are bounded by the remaining time to the deadline
 * via AbortController, so a hanging fetch cannot exceed the configured timeout.
 * Malformed JSON responses return an error result instead of throwing.
 */
export async function pollForToken(
  deviceCode: string,
  options: PollOptions = {},
): Promise<PollResult> {
  const appUrl = options.url || resolveAppUrl();
  const f = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
  let intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));

    // Check if we've exceeded the deadline after sleeping
    if (Date.now() >= deadline) break;

    const remaining = Math.max(1, deadline - Date.now());
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), remaining);

    let tokenResponse: Response;
    try {
      tokenResponse = await f(`${appUrl}/api/auth/device/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceCode, hostname: hostname() }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutHandle);
      if (err instanceof Error && err.name === 'AbortError') {
        // Aborted by our deadline — fall through to the pending return below
        break;
      }
      throw err;
    } finally {
      clearTimeout(timeoutHandle);
    }

    const data = await safeJsonParse(tokenResponse);
    if (data === MALFORMED) {
      return {
        success: false,
        status: 'error',
        error: 'Server returned malformed response',
      };
    }

    if (tokenResponse.ok) {
      // ok=true but no token and no error field — treat as pending and continue.
      // Only try to validate as a token response if a `token` key is present.
      if (data.token === undefined) {
        continue;
      }
      const tokenParsed = TokenResponseSchema.safeParse(data);
      if (!tokenParsed.success) {
        return {
          success: false,
          status: 'error',
          error: 'Server returned malformed token response',
        };
      }
      const { token, email } = tokenParsed.data;
      writeConfig({ token, email, appUrl });
      const configPath = getConfigPath();
      return {
        success: true,
        status: 'authenticated',
        email,
        configPath,
      };
    }

    if (data.error === 'authorization_pending') continue;
    if (data.error === 'slow_down') {
      intervalMs += 5000;
      continue;
    }

    // Any other error: expired, denied, etc.
    const errField: unknown = data.error;
    let errorMsg: string;
    if (typeof errField === 'string') {
      errorMsg = errField;
    } else if (
      errField &&
      typeof errField === 'object' &&
      'message' in errField &&
      typeof (errField as { message: unknown }).message === 'string'
    ) {
      errorMsg = (errField as { message: string }).message;
    } else {
      errorMsg = 'Authorization failed';
    }
    return { success: false, status: 'error', error: errorMsg };
  }

  return { success: false, status: 'pending' };
}

const MALFORMED = Symbol('malformed-json');

async function safeJsonParse(
  response: Response,
): Promise<Record<string, unknown> | typeof MALFORMED> {
  try {
    const parsed: unknown = await response.json();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return MALFORMED;
  } catch {
    return MALFORMED;
  }
}

export async function login(options: LoginOptions = {}): Promise<LoginResult> {
  const fetchOption = options.fetch ?? globalThis.fetch;
  const urlOption = options.url;

  // 1. Request device code
  let codeResult: DeviceCodeResult;
  try {
    codeResult = await requestDeviceCode({
      url: urlOption,
      fetch: fetchOption,
    });
  } catch {
    return { success: false, error: 'Failed to request device code' };
  }

  const {
    userCode,
    verificationUri,
    verificationUriComplete,
    expiresIn,
    interval,
    deviceCode,
  } = codeResult;

  // 2. Display code and open browser
  const prompt = (msg: string) => process.stderr.write(msg + '\n');
  prompt(`\n! Your one-time code: ${userCode}`);
  prompt(`  Authorize here: ${verificationUriComplete || verificationUri}\n`);

  const opener = options.openUrl ?? openInBrowser;
  try {
    await opener(verificationUriComplete || verificationUri);
    prompt('  Opening browser...');
  } catch {
    prompt('  Could not open browser. Visit the URL manually.');
  }

  prompt('  Waiting for authorization... (press Ctrl+C to cancel)\n');

  // 3. Poll for token
  // Use expiresIn-based timeout (original behavior) with maxPollAttempts support
  const timeoutMs = expiresIn * 1000 + POLL_TIMEOUT_BUFFER_MS;
  const intervalMs = (interval ?? 5) * 1000;

  if (options.maxPollAttempts !== undefined) {
    // Legacy path: use attempt-based polling for backward compat with tests
    const appUrl = urlOption || resolveAppUrl();
    const f = fetchOption;
    let pollInterval = intervalMs;
    let attempts = 0;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline && attempts < options.maxPollAttempts) {
      attempts++;
      await new Promise((r) => setTimeout(r, pollInterval));

      const remaining = Math.max(1, deadline - Date.now());
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), remaining);

      let tokenResponse: Response;
      try {
        tokenResponse = await f(`${appUrl}/api/auth/device/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceCode, hostname: hostname() }),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeoutHandle);
        if (err instanceof Error && err.name === 'AbortError') {
          break;
        }
        throw err;
      } finally {
        clearTimeout(timeoutHandle);
      }

      const data = await safeJsonParse(tokenResponse);
      if (data === MALFORMED) {
        return {
          success: false,
          error: 'Server returned malformed response',
        };
      }

      if (tokenResponse.ok) {
        if (data.token === undefined) {
          continue;
        }
        const tokenParsed = TokenResponseSchema.safeParse(data);
        if (!tokenParsed.success) {
          return {
            success: false,
            error: 'Server returned malformed token response',
          };
        }
        const { token, email } = tokenParsed.data;
        writeConfig({ token, email, appUrl });
        const configPath = getConfigPath();
        return { success: true, email, configPath };
      }

      if (data.error === 'authorization_pending') continue;
      if (data.error === 'slow_down') {
        pollInterval += 5000;
        continue;
      }

      const errField: unknown = data.error;
      const errorMsg =
        typeof errField === 'string' ? errField : 'Authorization failed';
      return { success: false, error: errorMsg };
    }

    return {
      success: false,
      error: 'Authorization timed out. Please try again.',
    };
  }

  // Standard path: delegate to pollForToken
  const pollResult = await pollForToken(deviceCode, {
    url: urlOption,
    fetch: fetchOption,
    timeoutMs,
    intervalMs,
  });

  if (pollResult.success) {
    return {
      success: true,
      email: pollResult.email,
      configPath: pollResult.configPath,
    };
  }

  if (pollResult.status === 'error') {
    return { success: false, error: pollResult.error };
  }

  return {
    success: false,
    error: 'Authorization timed out. Please try again.',
  };
}
