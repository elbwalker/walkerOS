/**
 * Configuration Helpers
 *
 * Re-exports types for convenience and backward compatibility.
 * Provides helper functions for config parsing.
 */

import { normalizeConfig } from './config-loader';
import { isObject } from '../utils/type-guards';
import type { Bundle } from '../types';

// Re-export types
export type { Config as BundleConfig } from '../types/bundle';
export type { BuildOptions, MinifyOptions } from '../types/bundle';

/**
 * Parse and normalize bundle configuration.
 *
 * @param data - Raw configuration data
 * @returns Normalized Bundle.Config with platform-specific defaults
 * @throws Error if validation fails
 *
 * @example
 * ```typescript
 * const config = parseBundleConfig({
 *   platform: 'web',
 *   sources: {
 *     browser: { package: '@walkeros/web-source-browser' }
 *   }
 * });
 * ```
 */
export function parseBundleConfig(data: unknown): Bundle.Config {
  // Basic type checking
  if (!isObject(data)) {
    throw new Error(`Invalid config: expected object, got ${typeof data}`);
  }

  if (
    !('platform' in data) ||
    (data.platform !== 'web' && data.platform !== 'server')
  ) {
    throw new Error(
      `Invalid config: platform must be "web" or "server", got "${(data as { platform?: unknown }).platform}"`,
    );
  }

  const config = data as Bundle.Config;
  return normalizeConfig(config, '/unknown/path');
}

/**
 * Safely parse bundle configuration without throwing.
 *
 * @param data - Raw configuration data
 * @returns Success result with normalized config or error result
 */
export function safeParseBundleConfig(data: unknown): {
  success: boolean;
  data?: Bundle.Config;
  error?: Error;
} {
  try {
    const normalized = parseBundleConfig(data);
    return {
      success: true,
      data: normalized,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
