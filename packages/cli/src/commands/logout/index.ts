import { createCLILogger } from '../../core/cli-logger.js';
import { revokeRefreshToken } from '../../core/oauth-client.js';
import {
  deleteConfig,
  getConfigPath,
  readConfig,
  resolveAppUrl,
  type WalkerOSConfig,
} from '../../lib/config-file.js';
import type { GlobalOptions } from '../../types/global.js';

export interface LogoutCommandOptions extends GlobalOptions {
  json?: boolean;
}

export async function logoutCommand(
  options: LogoutCommandOptions,
): Promise<void> {
  const logger = createCLILogger(options);

  const { deleted, superseded } = await logout();
  const configPath = getConfigPath();

  if (options.json) {
    logger.json({ success: true, deleted, superseded });
  } else if (superseded) {
    logger.info(
      'A newer session was stored while logging out, and was kept. ' +
        'Run `walkeros auth logout` again to remove it.',
    );
  } else if (deleted) {
    logger.info(`Logged out. Session removed from ${configPath}`);
  } else {
    logger.info('No stored credentials found.');
  }

  process.exit(0);
}

export interface LogoutResult {
  deleted: boolean;
  /** A different session reached the config while the revocation was in flight. */
  superseded: boolean;
}

/** Whether two reads of the config carry the same session. */
function sameSession(
  before: WalkerOSConfig | null,
  after: WalkerOSConfig,
): boolean {
  return (
    before?.accessToken === after.accessToken &&
    before?.refreshToken === after.refreshToken &&
    before?.token === after.token
  );
}

/**
 * Revoke the stored refresh token, then drop the local config.
 *
 * Revocation first, because deleting the file alone would leave a credential
 * alive on the server that nothing can ever reach to retire. It is best
 * effort: a logout on a plane still has to clear the machine.
 */
export async function logout(): Promise<LogoutResult> {
  const before = readConfig();

  if (before?.refreshToken) {
    await revokeRefreshToken(resolveAppUrl(), before.refreshToken);
  }

  // Re-read: revocation is a network round trip, and a login that finished
  // inside it stored a session this logout never saw. Deleting the file would
  // take that session with it, so the newer credential wins.
  //
  // It narrows the window rather than closing it. Only the token refresh takes
  // the config lock, and holding it across the revocation would be a protocol
  // change, not a check.
  const after = readConfig();
  if (after && !sameSession(before, after))
    return { deleted: false, superseded: true };

  return { deleted: deleteConfig(), superseded: false };
}
