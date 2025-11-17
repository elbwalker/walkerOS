/**
 * Configuration Utility Functions
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Substitute environment variables in a string.
 *
 * @param value - String with ${VAR} placeholders
 * @returns String with environment variables substituted
 * @throws Error if environment variable is not found
 *
 * @example
 * ```typescript
 * substituteEnvVariables('${HOME}/config') // "/Users/name/config"
 * ```
 */
export function substituteEnvVariables(value: string): string {
  return value.replace(/\${([^}]+)}/g, (_, envVar) => {
    const envValue = process.env[envVar];
    if (!envValue) {
      throw new Error(`Environment variable ${envVar} not found`);
    }
    return envValue;
  });
}

/**
 * Load and parse JSON configuration file.
 *
 * @param configPath - Path to JSON file
 * @returns Parsed configuration object
 * @throws Error if file not found or invalid JSON
 */
export async function loadJsonConfig<T>(configPath: string): Promise<T> {
  const absolutePath = path.resolve(configPath);

  if (!(await fs.pathExists(absolutePath))) {
    throw new Error(`Configuration file not found: ${absolutePath}`);
  }

  try {
    const rawConfig = await fs.readJson(absolutePath);
    return rawConfig as T;
  } catch (error) {
    throw new Error(
      `Invalid JSON in config file: ${configPath}. ${error instanceof Error ? error.message : error}`,
    );
  }
}

/**
 * Generate a unique temporary directory path.
 *
 * @param tempDir - Base temporary directory (default: ".tmp")
 * @returns Absolute path to unique temp directory
 *
 * @example
 * ```typescript
 * getTempDir() // "/workspaces/project/.tmp/cli-1647261462000-abc123"
 * getTempDir('/tmp') // "/tmp/cli-1647261462000-abc123"
 * ```
 */
export function getTempDir(tempDir = '.tmp'): string {
  const randomId = Math.random().toString(36).substring(2, 11);
  const basePath = path.isAbsolute(tempDir)
    ? tempDir
    : path.join(process.cwd(), tempDir);
  return path.join(basePath, `cli-${Date.now()}-${randomId}`);
}
