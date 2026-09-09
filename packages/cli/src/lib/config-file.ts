import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
  existsSync,
  chmodSync,
  renameSync,
} from 'fs';
import { randomBytes } from 'crypto';
import { join } from 'path';
import { homedir } from 'os';

export interface WalkerOSConfig {
  /**
   * Static bearer written by the pre-OAuth CLI. Honored until it expires, and
   * the first use in a process prints a one-line notice naming
   * `walkeros auth login`, which replaces it with a refreshable session.
   */
  token?: string;
  /** Short-lived bearer from the device authorization grant. */
  accessToken?: string;
  /** ISO 8601 instant at which `accessToken` stops being accepted. */
  accessTokenExpiresAt?: string;
  /** Single-use credential that buys a new `accessToken`. */
  refreshToken?: string;
  email?: string;
  appUrl?: string;
  anonymousFeedback?: boolean;
  defaultProjectId?: string;
  /**
   * UUID v4, generated and persisted only when the user explicitly opts in
   * to telemetry (`walkeros telemetry enable`). Absent in the default state.
   */
  installationId?: string;
  /**
   * Explicit consent toggle for telemetry. Tri-state:
   *  - `undefined`: no decision yet, default (nothing is collected).
   *  - `true`: user opted in via `walkeros telemetry enable`.
   *  - `false`: user opted out via `walkeros telemetry disable`.
   */
  telemetryEnabled?: boolean;
}

/**
 * Get the config directory path, respecting XDG_CONFIG_HOME
 */
export function getConfigDir(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME;
  const base = xdgConfig || join(homedir(), '.config');
  return join(base, 'walkeros');
}

/**
 * Get the config file path
 */
export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

/**
 * Read the stored config, or null if not found
 */
export function readConfig(): WalkerOSConfig | null {
  const configPath = getConfigPath();
  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as WalkerOSConfig;
  } catch {
    return null;
  }
}

/**
 * Replace the config file wholesale, atomically and with 0600 permissions.
 *
 * A reader that catches the file mid-write would see truncated JSON and treat
 * the person as logged out, so the content is written to a temp file and
 * renamed, which is atomic within a directory.
 *
 * The temp path is unique per write. Only the token refresh holds the config
 * lock, so two ordinary writers (a login and a `telemetry enable`, say) can be
 * in here at once: on one shared name they would write over each other's temp
 * file and rename it twice, and the slower one would fail outright when the
 * faster renamed the file out from under its `chmod`.
 */
function replaceConfigFile(config: WalkerOSConfig): void {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });

  const configPath = getConfigPath();
  const tempPath = `${configPath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    writeFileSync(tempPath, JSON.stringify(config, null, 2), { mode: 0o600 });
    // `writeFileSync`'s mode is masked by the process umask, so it alone does
    // not guarantee 0600 on the file the rename puts in place.
    chmodSync(tempPath, 0o600);
    renameSync(tempPath, configPath);
  } catch (error) {
    // A unique name is never reused, so a temp left behind by a failure would
    // sit in the config directory forever.
    try {
      unlinkSync(tempPath);
    } catch {
      // Never created, or already renamed into place.
    }
    throw error;
  }
}

/**
 * Merge `config` into the stored config and write the result.
 *
 * Merging rather than replacing, because the file holds fields owned by
 * unrelated commands: a writer that knows only about tokens would otherwise
 * drop `defaultProjectId`, `installationId`, `telemetryEnabled` and
 * `anonymousFeedback` every time somebody logs in.
 *
 * A key passed explicitly as `undefined` is removed from the written file,
 * which is how login drops the legacy static token it replaces.
 */
export function writeConfig(config: WalkerOSConfig): void {
  replaceConfigFile({ ...(readConfig() ?? {}), ...config });
}

/**
 * Remove every credential field, keeping the rest of the config.
 *
 * Used when the stored session is known to be dead, so the next command can
 * say "run `walkeros auth login`" instead of failing against the API.
 */
export function clearAuthFields(): void {
  const config = readConfig();
  if (!config) return;
  const {
    token: _token,
    accessToken: _accessToken,
    accessTokenExpiresAt: _accessTokenExpiresAt,
    refreshToken: _refreshToken,
    email: _email,
    ...rest
  } = config;
  replaceConfigFile(rest);
}

/**
 * Persist telemetry-relevant fields without touching unrelated config.
 * Reads the existing config (if any) and merges in the provided fields.
 * Used by the `telemetry enable` command to write `installationId` +
 * `telemetryEnabled: true` atomically, and by the `telemetry disable`
 * command to write `telemetryEnabled: false` alone.
 */
export function writeTelemetryOnlyConfig(partial: {
  installationId?: string;
  telemetryEnabled?: boolean;
}): void {
  writeConfig(partial);
}

/**
 * Delete the config file (logout)
 */
export function deleteConfig(): boolean {
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    unlinkSync(configPath);
    return true;
  }
  return false;
}

/**
 * Set the anonymous feedback preference in the config.
 * Does nothing when no config exists (avoids creating a skeleton config).
 */
export function setFeedbackPreference(anonymous: boolean): void {
  const config = readConfig();
  if (!config) return;
  writeConfig({ ...config, anonymousFeedback: anonymous });
}

/**
 * Get the anonymous feedback preference from the config.
 * Returns undefined when not set or no config exists.
 */
export function getFeedbackPreference(): boolean | undefined {
  const config = readConfig();
  return config?.anonymousFeedback;
}

/**
 * Set the default project ID in the config.
 * Throws if no config exists (user not authenticated).
 */
export function setDefaultProject(projectId: string): void {
  const config = readConfig();
  if (!config) {
    throw new Error('Not authenticated. Run `walkeros auth login` first.');
  }
  writeConfig({ ...config, defaultProjectId: projectId });
}

/**
 * Get the default project ID from the config, or null if not set.
 */
export function getDefaultProject(): string | null {
  const config = readConfig();
  return config?.defaultProjectId ?? null;
}

/**
 * Remove the default project ID from the config.
 * Does nothing when no config exists. Used to drop a stale default after the
 * project it pointed at has been deleted.
 */
export function clearDefaultProject(): void {
  const config = readConfig();
  if (!config) return;
  const { defaultProjectId: _removed, ...rest } = config;
  replaceConfigFile(rest);
}

/**
 * Resolve the API token using priority order:
 * 1. WALKEROS_TOKEN env var
 * 2. Config file (~/.config/walkeros/config.json)
 * 3. null (not authenticated)
 */
export function resolveToken(): {
  token: string;
  source: 'env' | 'config';
} | null {
  const envToken = process.env.WALKEROS_TOKEN;
  if (envToken) return { token: envToken, source: 'env' };

  const config = readConfig();
  if (config?.token) return { token: config.token, source: 'config' };

  return null;
}

/**
 * Resolve the deploy token for container/heartbeat auth.
 * Only checks WALKEROS_DEPLOY_TOKEN env var (never stored in config file).
 */
export function resolveDeployToken(): string | null {
  return process.env.WALKEROS_DEPLOY_TOKEN ?? null;
}

/**
 * Resolve the app URL.
 * WALKEROS_APP_URL env var > config file > default.
 */
export function resolveAppUrl(): string {
  const envUrl = process.env.WALKEROS_APP_URL;
  if (envUrl) return envUrl;

  const config = readConfig();
  if (config?.appUrl) return config.appUrl;

  return 'https://app.walkeros.io';
}
