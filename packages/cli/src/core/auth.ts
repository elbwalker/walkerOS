import {
  readConfig,
  writeConfig,
  clearAuthFields,
  resolveToken,
  resolveDeployToken,
  resolveAppUrl,
  getDefaultProject,
  type WalkerOSConfig,
} from '../lib/config-file.js';
import { withConfigLock } from '../lib/config-lock.js';
import { refreshTokens } from './oauth-client.js';

/**
 * Refresh this far ahead of the stated expiry. It absorbs clock skew between
 * the machine and the server plus the flight time of the request the token is
 * about to be spent on, so a token is never handed out with seconds to live.
 */
const REFRESH_SKEW_MS = 60_000;

let legacyNoticeShown = false;

/** Test-only: reset the once-per-process guard on the legacy token notice. */
export function resetLegacyTokenNotice(): void {
  legacyNoticeShown = false;
}

/**
 * Announce the legacy static token once, on first use.
 *
 * Once per process, not once per call: a single command can resolve a token
 * many times, and a notice printed on each would be noise the person learns
 * to scroll past. It is printed at all because a migrated token can carry a
 * year of expiry, so nothing else would ever prompt the switch.
 */
function noticeLegacyToken(): void {
  if (legacyNoticeShown) return;
  legacyNoticeShown = true;
  process.stderr.write(
    'walkerOS: using a static token from your config. ' +
      'Run `walkeros login` to switch to a session that refreshes automatically.\n',
  );
}

/** Whether the stored access token has enough life left to be worth using. */
function isFresh(config: WalkerOSConfig, nowMs: number): boolean {
  if (!config.accessToken || !config.accessTokenExpiresAt) return false;
  const expiresAt = Date.parse(config.accessTokenExpiresAt);
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt - nowMs > REFRESH_SKEW_MS;
}

/**
 * Resolve a bearer for an API call, refreshing the stored session when needed.
 *
 * Priority: `WALKEROS_TOKEN`, then a legacy static token, then the OAuth
 * session. Returns null when nothing can be resolved, which callers render as
 * "run `walkeros login`".
 *
 * Throws when a refresh was needed but could not be carried out, which is a
 * different problem from having no session and must not be reported as one.
 */
export async function resolveAccessToken(opts?: {
  fetch?: typeof fetch;
  now?: () => number;
}): Promise<string | null> {
  const envToken = process.env.WALKEROS_TOKEN;
  if (envToken) return envToken;

  const now = opts?.now ?? Date.now;
  const config = readConfig();
  if (!config) return null;

  if (config.token) {
    noticeLegacyToken();
    return config.token;
  }

  if (!config.refreshToken) {
    return isFresh(config, now()) ? (config.accessToken ?? null) : null;
  }

  if (isFresh(config, now())) return config.accessToken ?? null;

  return withConfigLock(async () => {
    // Re-read under the lock. Another walkerOS process may have refreshed
    // while we queued, and spending our copy of a single-use refresh token
    // would invalidate the session it just established.
    const current = readConfig();
    if (!current?.refreshToken) return current?.accessToken ?? null;
    if (isFresh(current, now())) return current.accessToken ?? null;

    let rotated;
    try {
      rotated = await refreshTokens(
        resolveAppUrl(),
        current.refreshToken,
        opts?.fetch,
      );
    } catch (error) {
      // Transient: the server was unreachable or faulted. The refresh token
      // may well still be good, so it stays on disk and the next command
      // tries again rather than forcing a browser round trip.
      //
      // Raised rather than returned as null, because null is how this function
      // says "there is no session", which sends callers down the wrong path:
      // they tell the person to run `walkeros login` and send the request
      // unauthenticated, when the session is fine and only the network was not.
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Could not reach ${resolveAppUrl()} to refresh your session: ${reason}. ` +
          'Your saved session was kept, so try again once the connection is back.',
      );
    }

    if (rotated === null) {
      // The server rejected the refresh token itself. Nothing local can
      // recover it, so drop the dead session.
      clearAuthFields();
      return null;
    }

    writeConfig({
      accessToken: rotated.accessToken,
      accessTokenExpiresAt: rotated.accessTokenExpiresAt,
      // A server that rotates no new refresh token leaves the current one in
      // force; overwriting it with null would end the session on the next call.
      refreshToken: rotated.refreshToken ?? current.refreshToken,
    });

    return rotated.accessToken;
  });
}

/**
 * Authorization header for the resolved credential, or an empty object when
 * there is none. Async because resolving may have to refresh the session.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await resolveAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Where a credential would come from, without resolving or refreshing it.
 * For commands that want to send someone to `walkeros login` before spending
 * a network round trip.
 */
export function credentialSource(): 'env' | 'config' | null {
  if (process.env.WALKEROS_TOKEN) return 'env';
  const config = readConfig();
  if (config?.token || config?.accessToken) return 'config';
  return null;
}

/**
 * Resolve token for runtime operations (run command, heartbeat, polling).
 * Priority: WALKEROS_DEPLOY_TOKEN > WALKEROS_TOKEN > config file
 *
 * Deliberately static and deliberately blind to the OAuth session: a runner is
 * a long-lived container handed a token, with no refresh token and no config
 * file to write a rotation back to.
 */
export function resolveRunToken(): string | null {
  return resolveDeployToken() ?? resolveToken()?.token ?? null;
}

export function requireProjectId(): string {
  const projectId = process.env.WALKEROS_PROJECT_ID || getDefaultProject();
  if (!projectId)
    throw new Error(
      'No project selected. Set WALKEROS_PROJECT_ID or configure a default project.',
    );
  return projectId;
}
