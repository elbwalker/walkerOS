import { createCLILogger } from '../../core/cli-logger.js';
import { revokeRefreshToken } from '../../core/oauth-client.js';
import {
  deleteConfig,
  getConfigPath,
  readConfig,
  resolveAppUrl,
} from '../../lib/config-file.js';
import type { GlobalOptions } from '../../types/global.js';

export interface LogoutCommandOptions extends GlobalOptions {
  json?: boolean;
}

export async function logoutCommand(
  options: LogoutCommandOptions,
): Promise<void> {
  const logger = createCLILogger(options);

  const { deleted } = await logout();
  const configPath = getConfigPath();

  if (options.json) {
    logger.json({ success: true, deleted });
  } else if (deleted) {
    logger.info(`Logged out. Session removed from ${configPath}`);
  } else {
    logger.info('No stored credentials found.');
  }

  process.exit(0);
}

/**
 * Revoke the stored refresh token, then drop the local config.
 *
 * Revocation first, because deleting the file alone would leave a credential
 * alive on the server that nothing can ever reach to retire. It is best
 * effort: a logout on a plane still has to clear the machine.
 */
export async function logout(): Promise<{ deleted: boolean }> {
  const config = readConfig();
  const appUrl = resolveAppUrl();

  if (config?.refreshToken) {
    await revokeRefreshToken(appUrl, config.refreshToken);
  }

  return { deleted: deleteConfig() };
}
