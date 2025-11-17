/**
 * Configuration Parser
 *
 * Parsing and normalization logic for configurations.
 */

import path from 'path';
import type { Flow } from '@walkeros/core';
import type { BuildOptions, EnvironmentConfig } from '../types/bundle';
import { isObject, isSingleEnvConfig } from './validators';
import { ensureBuildOptions } from './defaults';
import { validatePlatform } from './validators';

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

/**
 * Normalize flow and build configurations with platform-specific defaults.
 *
 * @param config - Environment configuration or flow+build object
 * @param configPath - Path to config file (for relative template resolution)
 * @returns Normalized flow and build configurations
 */
export function normalizeConfigs(
  config:
    | EnvironmentConfig
    | { flow: Flow.Config; build: Partial<BuildOptions> },
  configPath?: string,
): { flowConfig: Flow.Config; buildOptions: BuildOptions } {
  const flowConfig = config.flow;
  const platform = (flowConfig as unknown as { platform: 'web' | 'server' })
    .platform;

  if (!validatePlatform(platform)) {
    throw new Error(
      `Invalid platform "${platform}". Must be "web" or "server".`,
    );
  }

  // Apply platform-specific build defaults
  const buildDefaults: Partial<BuildOptions> =
    platform === 'web'
      ? {
          platform: 'browser',
          format: 'iife',
          target: 'es2020',
          minify: false,
          sourcemap: false,
          tempDir: '.tmp',
          cache: true,
        }
      : {
          platform: 'node',
          format: 'esm',
          target: 'node20',
          minify: false,
          sourcemap: false,
          tempDir: '.tmp',
          cache: true,
        };

  // Merge build config
  const buildConfig: Partial<BuildOptions> = {
    ...buildDefaults,
    ...config.build,
  };

  // Resolve template path relative to config file directory if it starts with ./ or ../
  if (
    configPath &&
    buildConfig.template &&
    !path.isAbsolute(buildConfig.template)
  ) {
    if (
      buildConfig.template.startsWith('./') ||
      buildConfig.template.startsWith('../')
    ) {
      const configDir = path.dirname(configPath);
      buildConfig.template = path.resolve(configDir, buildConfig.template);
    }
  }

  // Ensure all required build fields are present
  const buildOptions = ensureBuildOptions(buildConfig, platform);

  return {
    flowConfig,
    buildOptions,
  };
}
