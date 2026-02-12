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
  token: string;
  email: string;
  appUrl: string;
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
 * Resolve the app URL using priority order:
 * 1. WALKEROS_APP_URL env var
 * 2. Config file appUrl
 * 3. Default
 */
export function resolveAppUrl(): string {
  const envUrl = process.env.WALKEROS_APP_URL;
  if (envUrl) return envUrl;

  const config = readConfig();
  if (config?.appUrl) return config.appUrl;

  return 'https://app.walkeros.io';
}
