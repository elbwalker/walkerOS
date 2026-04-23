import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
  existsSync,
} from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface WalkerOSConfig {
  token?: string;
  email?: string;
  appUrl?: string;
  anonymousFeedback?: boolean;
  defaultProjectId?: string;
  /** UUID v4 generated once on first CLI run, used for telemetry grouping. */
  installationId?: string;
  /** Explicit opt-out toggle for telemetry. Absent means default-on. */
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
 * Write config to disk with 0600 permissions
 */
export function writeConfig(config: WalkerOSConfig): void {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true });

  const configPath = getConfigPath();
  writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
}

/**
 * Write a telemetry-only skeleton config. Used on first CLI run to persist
 * the installation ID without requiring login.
 */
export function writeTelemetryOnlyConfig(partial: {
  installationId: string;
  telemetryEnabled?: boolean;
}): void {
  const existing = readConfig() ?? {};
  writeConfig({ ...existing, ...partial });
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
    throw new Error('Not authenticated. Run `walkeros login` first.');
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
