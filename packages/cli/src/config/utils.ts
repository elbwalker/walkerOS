/**
 * Configuration Utility Functions
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * Check if a string is a valid URL
 *
 * @param str - String to check
 * @returns True if string is a valid HTTP/HTTPS URL
 */
export function isUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Download a file from a URL to a temporary location
 *
 * @param url - HTTP/HTTPS URL to download
 * @returns Path to downloaded temporary file
 * @throws Error if download fails or response is not OK
 *
 * @example
 * ```typescript
 * const tempPath = await downloadFromUrl('https://example.com/config.json')
 * // Returns: "/tmp/walkeros-download-1647261462000-abc123.json"
 * ```
 */
export async function downloadFromUrl(url: string): Promise<string> {
  if (!isUrl(url)) {
    throw new Error(`Invalid URL: ${url}`);
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to download ${url}: ${response.status} ${response.statusText}`,
      );
    }

    const content = await response.text();

    // Extract filename from URL or generate one
    const urlObj = new URL(url);
    const urlFilename = path.basename(urlObj.pathname);
    const extension = path.extname(urlFilename) || '.json';
    const randomId = Math.random().toString(36).substring(2, 11);
    const filename = `walkeros-download-${Date.now()}-${randomId}${extension}`;

    // Write to system temp directory
    const tempPath = path.join(os.tmpdir(), filename);
    await fs.writeFile(tempPath, content, 'utf-8');

    return tempPath;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to download from URL: ${error.message}`);
    }
    throw error;
  }
}

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
 * Load and parse JSON configuration file from local path or URL.
 *
 * @param configPath - Path to JSON file or HTTP/HTTPS URL
 * @returns Parsed configuration object and cleanup function
 * @throws Error if file not found, download fails, or invalid JSON
 *
 * @example
 * ```typescript
 * // Local file
 * const config = await loadJsonConfig('./config.json')
 *
 * // Remote URL
 * const config = await loadJsonConfig('https://example.com/config.json')
 * ```
 */
export async function loadJsonConfig<T>(configPath: string): Promise<T> {
  let absolutePath: string;
  let isTemporary = false;

  // Check if input is a URL
  if (isUrl(configPath)) {
    // Download from URL to temp location
    absolutePath = await downloadFromUrl(configPath);
    isTemporary = true;
  } else {
    // Local file path
    absolutePath = path.resolve(configPath);

    if (!(await fs.pathExists(absolutePath))) {
      throw new Error(`Configuration file not found: ${absolutePath}`);
    }
  }

  try {
    const rawConfig = await fs.readJson(absolutePath);
    return rawConfig as T;
  } catch (error) {
    throw new Error(
      `Invalid JSON in config file: ${configPath}. ${error instanceof Error ? error.message : error}`,
    );
  } finally {
    // Clean up temporary downloaded file
    if (isTemporary) {
      try {
        await fs.remove(absolutePath);
      } catch {
        // Ignore cleanup errors
      }
    }
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
