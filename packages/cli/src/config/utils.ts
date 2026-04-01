/**
 * Configuration Utility Functions
 */

import fs from 'fs-extra';
import path from 'path';
import { mergeAuthHeaders } from '../core/http.js';
import { resolveToken } from '../lib/config-file.js';

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
 * Fetch content from a URL as a string, with auth headers.
 * Shared helper for all URL-loading paths.
 *
 * @param url - HTTP/HTTPS URL to fetch
 * @returns Response body as a string
 * @throws Error if fetch fails or response is not OK
 */
export async function fetchContentString(url: string): Promise<string> {
  const token = resolveToken()?.token;
  const response = await fetch(url, {
    headers: mergeAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
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
 * Resolve raw string content from a URL, file path, or inline string.
 *
 * Detection priority:
 * 1. URL (http://, https://) — download content
 * 2. Existing file path — read file content
 * 3. Inline string — return as-is
 *
 * @param input - URL, file path, or inline string
 * @returns Raw string content and the resolved absolute path (if file-based)
 * @throws Error if file not found or download fails
 */
async function resolveContent(input: string): Promise<string> {
  const trimmed = input.trim();

  // 1. Check if input is a URL
  if (isUrl(trimmed)) {
    return fetchContentString(trimmed);
  }

  // 2. Check if file path exists
  const absolutePath = path.resolve(trimmed);
  if (await fs.pathExists(absolutePath)) {
    return fs.readFile(absolutePath, 'utf-8');
  }

  // 3. Inline content — return as-is
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  // 4. Nothing matched — file not found
  throw new Error(`Configuration file not found: ${absolutePath}`);
}

/**
 * Load configuration from a file path, URL, or inline string.
 *
 * Supports two modes:
 * - `json: true` (default) — resolves content and parses as JSON
 * - `json: false` — resolves content and returns raw string
 *
 * Detection priority:
 * 1. URL (http://, https://) — download content
 * 2. Existing file path — read file content
 * 3. Inline string (starting with { or [) — use directly
 *
 * @param input - Path to file, HTTP/HTTPS URL, or inline string
 * @param options - Optional settings
 * @param options.json - Parse as JSON (default: true)
 * @returns Parsed object (json: true) or raw string (json: false)
 * @throws Error if file not found, download fails, or invalid JSON
 *
 * @example
 * ```typescript
 * // JSON mode (default) — same as loadJsonConfig
 * const config = await loadConfig('./config.json')
 * const config = await loadConfig('https://example.com/config.json')
 * const config = await loadConfig('{"version":3,"flows":{}}')
 *
 * // Raw string mode — returns file/URL content as string
 * const code = await loadConfig('./bundle.js', { json: false })
 * ```
 */
export async function loadConfig<T = unknown>(
  input: string,
  options?: { json?: boolean },
): Promise<T | string> {
  const json = options?.json !== false; // default true

  if (!json) {
    return resolveContent(input);
  }

  // JSON mode — resolve content then parse
  const trimmed = input.trim();

  try {
    const content = await resolveContent(trimmed);

    // Parse the resolved content as JSON
    return JSON.parse(content) as T;
  } catch (error) {
    // Distinguish between JSON parse errors and resolution errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Re-throw resolution errors (file not found, fetch failed) as-is
    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('Failed to fetch')
    ) {
      throw error;
    }

    // JSON-looking inline content with parse errors
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      throw new Error(
        `Input appears to be JSON but contains errors: ${errorMessage}`,
      );
    }

    // File or URL with invalid JSON content
    throw new Error(`Invalid JSON in config file: ${input}. ${errorMessage}`);
  }
}

/**
 * Load and parse JSON configuration from a file path, URL, or inline JSON string.
 *
 * Thin wrapper around `loadConfig` with `json: true` (default).
 *
 * Detection priority:
 * 1. URL (http://, https://) — download and parse
 * 2. Existing file path — read and parse
 * 3. Inline JSON string (starting with { or [) — parse directly
 *
 * @param configPath - Path to JSON file, HTTP/HTTPS URL, or inline JSON string
 * @returns Parsed configuration object
 * @throws Error if file not found, download fails, or invalid JSON
 *
 * @example
 * ```typescript
 * // Local file
 * const config = await loadJsonConfig('./config.json')
 *
 * // Remote URL
 * const config = await loadJsonConfig('https://example.com/config.json')
 *
 * // Inline JSON
 * const config = await loadJsonConfig('{"version":3,"flows":{}}')
 * ```
 */
export async function loadJsonConfig<T>(configPath: string): Promise<T> {
  return loadConfig<T>(configPath, { json: true }) as Promise<T>;
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

  // 1. Handle empty/undefined input (pre-check)
  if (!source || source.trim() === '') {
    if (options?.required) throw new Error(`${paramName} is required`);
    if (options?.fallback !== undefined) return options.fallback;
    return {} as T;
  }

  // 2. Try the strict loader (handles URL, file, inline JSON)
  try {
    return await loadJsonConfig<T>(source);
  } catch (error) {
    const trimmed = source.trim();

    // 3. Not JSON-looking? Treat as event name (backward compat)
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return { name: trimmed } as T;
    }

    // 4. JSON-looking but invalid -- re-throw with context
    throw new Error(
      `Failed to parse ${paramName}. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
