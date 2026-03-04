import { createCLILogger } from '../../core/cli-logger.js';
import { deleteConfig, getConfigPath } from '../../lib/config-file.js';
import type { GlobalOptions } from '../../types/global.js';

export interface LogoutCommandOptions extends GlobalOptions {
  json?: boolean;
}

export async function logoutCommand(
  options: LogoutCommandOptions,
): Promise<void> {
  const logger = createCLILogger(options);

  const deleted = deleteConfig();
  const configPath = getConfigPath();

  if (options.json) {
    logger.json({ success: true, deleted });
  } else if (deleted) {
    logger.info(`Logged out. Token removed from ${configPath}`);
  } else {
    logger.info('No stored credentials found.');
  }

  process.exit(0);
}

export async function logout(): Promise<{ deleted: boolean }> {
  const deleted = deleteConfig();
  return { deleted };
}
