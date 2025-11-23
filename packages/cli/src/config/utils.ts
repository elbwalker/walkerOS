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

/**
 * Load JSON from inline string, file path, or URL.
 *
 * Supports three input formats:
 * 1. Inline JSON string - parsed directly
 * 2. Local file path - read and parsed
 * 3. HTTP/HTTPS URL - downloaded and parsed
 *
 * Detection priority:
 * 1. URL (http://, https://) → download and parse
 * 2. Existing file path → read and parse
 * 3. Valid JSON string → parse directly
 * 4. Simple string → treat as {name: string} for backward compatibility
 *
 * @param source - JSON string, file path, or URL
 * @param options - Optional configuration
 * @param options.name - Parameter name for error messages (e.g., "event", "config")
 * @param options.required - Throw error if source is empty (default: false)
 * @param options.fallback - Default value if source is empty
 * @returns Parsed JSON object
 * @throws Error if source is required but empty, or if loading/parsing fails
 *
 * @example
 * ```typescript
 * // Inline JSON
 * await loadJsonFromSource('{"name":"order complete","data":{}}')
 *
 * // File path
 * await loadJsonFromSource('./examples/event.json')
 *
 * // URL
 * await loadJsonFromSource('https://example.com/event.json')
 *
 * // With options
 * await loadJsonFromSource(input, {
 *   name: 'event',
 *   required: true,
 *   fallback: { name: 'default' }
 * })
 * ```
 */
export async function loadJsonFromSource<T = unknown>(
  source: string | undefined,
  options?: {
    name?: string;
    required?: boolean;
    fallback?: T;
  },
): Promise<T> {
  const paramName = options?.name || 'input';

  // Handle empty/undefined input
  if (!source || source.trim() === '') {
    if (options?.required) {
      throw new Error(`${paramName} is required`);
    }
    if (options?.fallback !== undefined) {
      return options.fallback;
    }
    return {} as T;
  }

  const trimmedSource = source.trim();

  // 1. Check if URL
  if (isUrl(trimmedSource)) {
    try {
      const tempPath = await downloadFromUrl(trimmedSource);
      try {
        const data = await fs.readJson(tempPath);
        return data as T;
      } finally {
        // Clean up temp file
        try {
          await fs.remove(tempPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to load ${paramName} from URL ${trimmedSource}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // 2. Check if file path exists
  const resolvedPath = path.resolve(trimmedSource);
  if (await fs.pathExists(resolvedPath)) {
    try {
      const data = await fs.readJson(resolvedPath);
      return data as T;
    } catch (error) {
      throw new Error(
        `Failed to parse ${paramName} from file ${trimmedSource}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // 3. Try to parse as inline JSON
  try {
    const parsed = JSON.parse(trimmedSource);
    return parsed as T;
  } catch (jsonError) {
    // 4. Fallback: treat as event name string for backward compatibility
    // This allows simple strings like "page view" to work
    if (!trimmedSource.startsWith('{') && !trimmedSource.startsWith('[')) {
      return { name: trimmedSource } as T;
    }

    // If it looks like JSON but failed to parse, throw helpful error
    throw new Error(
      `Failed to parse ${paramName}. Input appears to be JSON but contains errors: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
    );
  }
}
