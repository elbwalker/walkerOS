import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { createCommandLogger, getErrorMessage } from '../../core/index.js';
import { getToken, authenticatedFetch } from '../../core/auth.js';

export interface ConfigPullOptions {
  configId: string;
  output?: string;
  json?: boolean;
  verbose?: boolean;
  silent?: boolean;
}

/**
 * Validate WALKEROS_APP_URL. HTTPS is mandatory except for localhost/127.0.0.1.
 * Returns the normalized base URL (no trailing slash).
 */
function validateAppUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(
      `Invalid WALKEROS_APP_URL: "${rawUrl}" is not a valid URL.\n` +
        'Expected format: https://app.example.com',
    );
  }

  const isLocalhost =
    parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

  if (parsed.protocol !== 'https:' && !isLocalhost) {
    throw new Error(
      'WALKEROS_APP_URL must use HTTPS to prevent token interception.\n' +
        'Only localhost/127.0.0.1 may use HTTP for local development.',
    );
  }

  // Return origin (removes trailing slash, path, query)
  return parsed.origin;
}

/**
 * Programmatic API for config pull.
 * Fetches a config from the walkerOS app API.
 */
export async function configPull(options: ConfigPullOptions): Promise<unknown> {
  const token = getToken();
  if (!token) {
    throw new Error(
      'WALKEROS_TOKEN not set. Create a token at https://app.walkeros.io and set it:\n' +
        '  export WALKEROS_TOKEN=sk-walkeros-...',
    );
  }

  const baseUrl = validateAppUrl(
    process.env.WALKEROS_APP_URL || 'https://app.walkeros.io',
  );
  const url = `${baseUrl}/api/configs/${options.configId}`;

  const response = await authenticatedFetch(url);

  if (response.status === 401) {
    throw new Error(
      'Authentication failed. Your token may be expired or revoked.\n' +
        'Create a new token at https://app.walkeros.io',
    );
  }

  if (response.status === 404) {
    throw new Error(
      `Config not found: ${options.configId}\n` +
        'Check the config ID and ensure your token has access.',
    );
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch config: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

/**
 * CLI command handler for config pull.
 */
export async function configPullCommand(
  options: ConfigPullOptions,
): Promise<void> {
  const logger = createCommandLogger(options);

  try {
    const config = await configPull(options);
    const content = JSON.stringify(config, null, 2);

    if (options.output) {
      const outputPath = path.resolve(options.output);
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, content, 'utf-8');
      logger.log(
        `${chalk.green('✓')} Config saved to ${chalk.cyan(options.output)}`,
      );
    } else if (options.json) {
      console.log(content);
    } else {
      console.log(content);
    }

    process.exit(0);
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      logger.json({
        error: { code: 'CONFIG_PULL_FAILED', message: errorMessage },
      });
    } else {
      logger.error(`Error: ${errorMessage}`);
    }

    process.exit(1);
  }
}
