import { createServer } from 'http';
import { randomBytes } from 'crypto';
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

const LOGIN_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

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

export async function login(
  options: { url?: string } = {},
): Promise<LoginResult> {
  const appUrl = options.url || resolveAppUrl();
  const state = randomBytes(32).toString('hex');

  // Dynamic import for ESM-only `open` package
  const { default: open } = await import('open');

  return new Promise<LoginResult>((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url || '', `http://localhost`);

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      // Verify state (CSRF protection)
      if (returnedState !== state) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body><h1>Authorization failed</h1><p>State mismatch. Please try again.</p></body></html>',
        );
        cleanup();
        reject(new Error('Authorization failed: state mismatch'));
        return;
      }

      if (!code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body><h1>Authorization failed</h1><p>No authorization code received.</p></body></html>',
        );
        cleanup();
        reject(new Error('Authorization failed: no code received'));
        return;
      }

      // Exchange code for token
      try {
        const exchangeResponse = await fetch(
          `${appUrl}/api/auth/cli/exchange`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          },
        );

        if (!exchangeResponse.ok) {
          const error = await exchangeResponse.json();
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(
            `<html><body><h1>Authorization failed</h1><p>${error.error?.message || 'Unknown error'}</p></body></html>`,
          );
          cleanup();
          reject(new Error(error.error?.message || 'Token exchange failed'));
          return;
        }

        const data = await exchangeResponse.json();

        // Store config
        writeConfig({
          token: data.token,
          email: data.email,
          appUrl,
        });

        const configPath = getConfigPath();

        // Success page
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body><h1>Authorized!</h1><p>You can close this tab and return to the terminal.</p></body></html>',
        );
        cleanup();
        resolve({ success: true, email: data.email, configPath });
      } catch {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body><h1>Authorization failed</h1><p>Could not exchange authorization code.</p></body></html>',
        );
        cleanup();
        reject(new Error('Token exchange failed'));
      }
    });

    // Timeout
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Authorization timed out. Please try again.'));
    }, LOGIN_TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timeout);
      server.close();
    }

    // Start server on random port
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        cleanup();
        reject(new Error('Failed to start callback server'));
        return;
      }

      const port = address.port;
      const authUrl = `${appUrl}/auth/cli?port=${port}&state=${state}`;

      // Open browser
      open(authUrl).catch(() => {
        // Browser failed to open — print URL for manual copy
        // eslint-disable-next-line no-console
        console.error(
          `Could not open browser. Visit this URL manually:\n\n  ${authUrl}\n`,
        );
      });
    });
  });
}
