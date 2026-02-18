import { createLogger } from '../../core/logger.js';
import { deleteConfig, getConfigPath } from '../../lib/config-file.js';
import type { GlobalOptions } from '../../types/global.js';

export interface LogoutCommandOptions extends GlobalOptions {
  json?: boolean;
}

export async function logoutCommand(
  options: LogoutCommandOptions,
): Promise<void> {
  const logger = createLogger({
    verbose: options.verbose,
    silent: options.silent,
    json: options.json,
  });

  const deleted = deleteConfig();
  const configPath = getConfigPath();

  if (options.json) {
    logger.json({ success: true, deleted });
  } else if (deleted) {
    logger.success(`Logged out. Token removed from ${configPath}`);
  } else {
    logger.log('No stored credentials found.');
  }

  process.exit(0);
}

export async function logout(): Promise<{ deleted: boolean }> {
  const deleted = deleteConfig();
  return { deleted };
}
