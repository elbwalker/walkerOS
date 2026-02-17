import { hostname } from 'os';
import { createLogger } from '../../core/logger.js';
import {
  writeConfig,
  resolveAppUrl,
  getConfigPath,
} from '../../lib/config-file.js';
import type { GlobalOptions } from '../../types/global.js';

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

const POLL_TIMEOUT_BUFFER_MS = 5000;

async function openInBrowser(url: string): Promise<void> {
  const { default: open } = await import('open');
  await open(url);
}

export async function loginCommand(
  options: LoginCommandOptions,
): Promise<void> {
  const logger = createLogger({
    verbose: options.verbose,
    silent: options.silent,
    json: options.json,
  });

  try {
    const result = await login({ url: options.url });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.success) {
      logger.success(`Logged in as ${result.email}`);
      logger.log(`Token stored in ${result.configPath}`);
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (options.json) {
      console.log(JSON.stringify({ success: false, error: message }, null, 2));
    } else {
      logger.error(message);
    }

    process.exit(1);
  }
}

export async function login(options: LoginOptions = {}): Promise<LoginResult> {
  const appUrl = options.url || resolveAppUrl();
  const f = options.fetch ?? globalThis.fetch;

  // 1. Request device code
  const codeResponse = await f(`${appUrl}/api/auth/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!codeResponse.ok) {
    return { success: false, error: 'Failed to request device code' };
  }

  const {
    deviceCode,
    userCode,
    verificationUri,
    verificationUriComplete,
    expiresIn,
    interval,
  } = await codeResponse.json();

  // 2. Display code and open browser
  console.error(`\n! Your one-time code: ${userCode}`);
  console.error(`  Authorize here: ${verificationUri}\n`);

  const opener = options.openUrl ?? openInBrowser;
  try {
    await opener(verificationUriComplete || verificationUri);
    console.error('  Opening browser...');
  } catch {
    console.error('  Could not open browser. Visit the URL manually.');
  }

  console.error('  Waiting for authorization... (press Ctrl+C to cancel)\n');

  // 3. Poll for token
  const deadline = Date.now() + expiresIn * 1000 + POLL_TIMEOUT_BUFFER_MS;
  let pollInterval = (interval ?? 5) * 1000;
  const maxAttempts = options.maxPollAttempts ?? Infinity;
  let attempts = 0;

  while (Date.now() < deadline && attempts < maxAttempts) {
    attempts++;
    await new Promise((r) => setTimeout(r, pollInterval));

    const tokenResponse = await f(`${appUrl}/api/auth/device/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceCode, hostname: hostname() }),
    });

    const data = await tokenResponse.json();

    if (tokenResponse.ok && data.token) {
      // 4. Store config
      writeConfig({ token: data.token, email: data.email, appUrl });
      const configPath = getConfigPath();
      return { success: true, email: data.email, configPath };
    }

    if (data.error === 'authorization_pending') continue;
    if (data.error === 'slow_down') {
      pollInterval += 5000;
      continue;
    }

    // Any other error: expired, denied, etc.
    return { success: false, error: data.error || 'Authorization failed' };
  }

  return {
    success: false,
    error: 'Authorization timed out. Please try again.',
  };
}
