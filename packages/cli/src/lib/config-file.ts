import {
  readFileSync,
  mkdirSync,
  unlinkSync,
  renameSync,
  openSync,
  writeSync,
  fsyncSync,
  closeSync,
  statSync,
} from 'fs';
import { randomBytes } from 'crypto';
import { join } from 'path';
import { homedir } from 'os';

/**
 * The CLI's own settings. It holds no credential: a `walkeros login` lives in
 * `credentials.json` beside it (`lib/credentials.ts`), and sign-in fields an
 * older CLI left in this file are never read.
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
 * Create the config directory, traversable only by its owner. `mode` applies
 * only when the directory is created here, so a directory that already exists
 * keeps its mode (`configDirWarning` names one others can write to).
 */
export function ensureConfigDir(): string {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

/**
 * The warning for a config directory that someone else can write to, or null.
 * Whoever can write there can rename a file of their own over
 * `credentials.json`, so `walkeros login` says so before it stores anything.
 */
export function configDirWarning(): string | null {
  const dir = getConfigDir();
  let mode: number;
  try {
    mode = statSync(dir).mode;
  } catch {
    return null;
  }
  if ((mode & 0o022) === 0) return null;
  return `${dir} can be written by other users, who could replace your sign-in there: run chmod 700 ${dir}`;
}

/**
 * Write `content` to `path` atomically, readable only by its owner.
 *
 * A reader that catches the file mid-write would see truncated JSON and treat
 * it as missing, so the content goes to a temp file that is flushed to disk
 * and then renamed, which is atomic within a directory.
 *
 * The temp file is created exclusively (`wx`) with mode 0600 on a fresh name,
 * so the mode is set at creation (the umask can only narrow it) and a path
 * someone placed in advance is never followed. The name is unique per write:
 * two writers on one shared name would write over each other's temp file and
 * rename it twice.
 */
export function writePrivateFile(path: string, content: string): void {
  const tempPath = `${path}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    const fd = openSync(tempPath, 'wx', 0o600);
    try {
      writeSync(fd, content);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tempPath, path);
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

/** Replace the config file wholesale. Nothing locks it: a login does not live here. */
function replaceConfigFile(config: WalkerOSConfig): void {
  ensureConfigDir();
  writePrivateFile(getConfigPath(), JSON.stringify(config, null, 2));
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
