import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
  chmodSync,
  renameSync,
} from 'fs';
import { randomBytes } from 'crypto';
import { join } from 'path';
import { homedir } from 'os';

/**
 * The CLI's own settings. It holds no credential: the CLI authenticates with
 * WALKEROS_TOKEN only, and sign-in fields an older CLI left in the file are
 * never read.
 */
export interface WalkerOSConfig {
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
 * the file as missing, so the content is written to a temp file and renamed,
 * which is atomic within a directory.
 *
 * The temp path is unique per write. Nothing locks the file, so two writers
 * (two `telemetry` commands, say) can be in here at once: on one shared name
 * they would write over each other's temp file and rename it twice, and the
 * slower one would fail outright when the faster renamed the file out from
 * under its `chmod`.
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
 * unrelated commands: a writer that knows only about telemetry would otherwise
 * drop `appUrl`, `defaultProjectId` and `anonymousFeedback`.
 *
 * A key passed explicitly as `undefined` is removed from the written file.
 */
export function writeConfig(config: WalkerOSConfig): void {
  replaceConfigFile({ ...(readConfig() ?? {}), ...config });
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
