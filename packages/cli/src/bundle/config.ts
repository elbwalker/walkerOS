/**
 * Configuration Helpers
 *
 * Re-exports types for convenience.
 * Provides helper functions for config parsing.
 */

import { normalizeConfigs } from './config-loader';
import { isObject } from '../utils/type-guards';
import type { Flow } from '@walkeros/core';
import type { BuildOptions, EnvironmentConfig } from '../types/bundle';

// Re-export types
export type {
  BuildOptions,
  MinifyOptions,
  EnvironmentConfig,
} from '../types/bundle';

/**
 * Result of parsing bundle configuration.
 */
export interface ParsedConfig {
  flowConfig: Flow.Config;
  buildOptions: BuildOptions;
}

/**
 * Parse and normalize bundle configuration.
 *
 * @param data - Raw configuration data (EnvironmentConfig format: { flow, build })
 * @returns Normalized flowConfig and buildOptions with platform-specific defaults
 * @throws Error if validation fails
 *
 * @example
 * ```typescript
 * const { flowConfig, buildOptions } = parseBundleConfig({
 *   flow: {
 *     platform: 'web',
 *     sources: { browser: {...} },
 *     destinations: { gtag: {...} }
 *   },
 *   build: {
 *     packages: { '@walkeros/core': {...} },
 *     code: '...',
 *     output: './dist/bundle.js'
 *   }
 * });
 * ```
 */
export function parseBundleConfig(data: unknown): ParsedConfig {
  // Basic type checking
  if (!isObject(data)) {
    throw new Error(`Invalid config: expected object, got ${typeof data}`);
  }

  // Check for new format { flow, build }
  if (!('flow' in data) || !isObject(data.flow)) {
    throw new Error(
      `Invalid config: missing "flow" field. ` +
        `Expected format: { flow: { platform: "web" | "server", ... }, build: { ... } }`,
    );
  }

  if (!('build' in data) || !isObject(data.build)) {
    throw new Error(
      `Invalid config: missing "build" field. ` +
        `Expected format: { flow: { platform: "web" | "server", ... }, build: { ... } }`,
    );
  }

  const flowData = data.flow as Record<string, unknown>;
  if (
    !('platform' in flowData) ||
    (flowData.platform !== 'web' && flowData.platform !== 'server')
  ) {
    throw new Error(
      `Invalid config: flow.platform must be "web" or "server", got "${flowData.platform}"`,
    );
  }

  // Validate build.packages field
  const buildData = data.build as Record<string, unknown>;
  if ('packages' in buildData && !isObject(buildData.packages)) {
    throw new Error(
      `Invalid config: build.packages must be an object, got ${typeof buildData.packages}`,
    );
  }

  const config = data as unknown as EnvironmentConfig;
  return normalizeConfigs(config, '/unknown/path');
}

/**
 * Safely parse bundle configuration without throwing.
 *
 * @param data - Raw configuration data
 * @returns Success result with normalized configs or error result
 */
export function safeParseBundleConfig(data: unknown): {
  success: boolean;
  data?: ParsedConfig;
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
