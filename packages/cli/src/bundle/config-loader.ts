/**
 * Configuration Loader
 *
 * Loads and parses configurations with support for:
 * - Separate Flow.Config and BuildOptions
 * - Legacy single-environment configs
 * - Multi-environment setups
 * - Environment selection
 * - Platform-specific defaults
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { Flow } from '@walkeros/core';
import { isObject } from '../utils/type-guards';
import type { BuildOptions, EnvironmentConfig, Setup } from '../types/bundle';
import { ensureBuildOptions } from '../types/bundle';

// ESM-compatible __dirname resolution
function getDirname(): string {
  // @ts-ignore
  if (typeof __dirname === 'undefined') {
    // @ts-ignore
    return dirname(fileURLToPath(import.meta.url));
  }
  return __dirname;
}

/**
 * Type guard: Validate platform value.
 */
function validatePlatform(platform: unknown): platform is 'web' | 'server' {
  return platform === 'web' || platform === 'server';
}

/**
 * Type guard: Check if config is multi-environment format.
 */
function isMultiEnvConfig(data: unknown): data is Setup {
  return (
    isObject(data) &&
    'version' in data &&
    data.version === 1 &&
    'environments' in data &&
    isObject(data.environments)
  );
}

/**
 * Type guard: Check if config is single-environment format (new structure).
 */
function isSingleEnvConfig(data: unknown): data is EnvironmentConfig {
  return (
    isObject(data) &&
    'flow' in data &&
    'build' in data &&
    isObject(data.flow) &&
    isObject(data.build) &&
    'platform' in data.flow &&
    validatePlatform((data.flow as { platform: unknown }).platform)
  );
}

/**
 * Type guard: Check if config is legacy format (old Bundle.Config structure).
 * @deprecated Legacy format - will be removed in future versions
 */
function isLegacyConfig(data: unknown): boolean {
  return (
    isObject(data) &&
    'platform' in data &&
    validatePlatform(data.platform) &&
    !('flow' in data) && // Not new format
    !('version' in data) // Not multi-env
  );
}

/**
 * Result of configuration loading.
 */
export interface LoadConfigResult {
  /** Runtime event processing configuration */
  flowConfig: Flow.Config;
  /** Build-time configuration */
  buildOptions: BuildOptions;
  /** Name of the selected environment (or 'default' for single configs) */
  environment: string;
  /** Whether this is a multi-environment setup */
  isMultiEnvironment: boolean;
  /** All available environment names (for multi-environment setups) */
  availableEnvironments?: string[];
}

/**
 * Options for loading configuration.
 */
export interface LoadConfigOptions {
  /** Path to config file */
  configPath: string;
  /** Environment name to load (for multi-environment configs) */
  environment?: string;
  /** Logger for warnings */
  logger?: {
    warn: (message: string) => void;
    info: (message: string) => void;
  };
}

/**
 * Load and parse bundle configuration.
 *
 * @remarks
 * Automatically detects whether the config is:
 * - New format: { flow: {...}, build: {...} }
 * - Multi-environment format: { version: 1, environments: {...} }
 * - Legacy format: { platform, sources, destinations, packages, ... } (with deprecation warning)
 *
 * For multi-environment configs, requires `environment` option.
 *
 * @param rawConfig - Raw configuration object from JSON file
 * @param options - Loading options
 * @returns Parsed configuration with flow and build separated
 */
export function loadBundleConfig(
  rawConfig: unknown,
  options: LoadConfigOptions,
): LoadConfigResult {
  // Check if multi-environment format
  if (isMultiEnvConfig(rawConfig)) {
    return loadMultiEnvironmentConfig(rawConfig, options);
  }

  // Check if new single-environment format
  if (isSingleEnvConfig(rawConfig)) {
    return loadSingleEnvironmentConfig(rawConfig, options);
  }

  // Check if legacy format (deprecated)
  if (isLegacyConfig(rawConfig)) {
    if (options.logger) {
      options.logger.warn(
        `⚠️  DEPRECATED: Legacy config format detected at ${options.configPath}\n` +
          `   Please migrate to new format: { flow: {...}, build: {...} }`,
      );
    }
    return loadLegacyConfig(rawConfig as Record<string, unknown>, options);
  }

  // Invalid format - provide helpful error
  const configType = isObject(rawConfig)
    ? 'platform' in rawConfig
      ? `invalid platform value: "${(rawConfig as { platform: unknown }).platform}"`
      : 'missing "flow" and "build" fields'
    : `not an object (got ${typeof rawConfig})`;

  throw new Error(
    `Invalid configuration format at ${options.configPath}.\n` +
      `Configuration ${configType}.\n\n` +
      `Expected either:\n` +
      `  1. Multi-environment: { version: 1, environments: { prod: { flow: {...}, build: {...} } } }\n` +
      `  2. Single-environment: { flow: { platform: "web" | "server", ... }, build: { packages: {...}, ... } }`,
  );
}

/**
 * Load multi-environment configuration.
 */
function loadMultiEnvironmentConfig(
  setup: Setup,
  options: LoadConfigOptions,
): LoadConfigResult {
  const availableEnvironments = Object.keys(setup.environments);

  // Validate environment selection
  if (!options.environment) {
    throw new Error(
      `Multi-environment configuration detected. Please specify an environment using --env flag.\n` +
        `Available environments: ${availableEnvironments.join(', ')}`,
    );
  }

  const selectedEnv = options.environment;

  if (!setup.environments[selectedEnv]) {
    throw new Error(
      `Environment "${selectedEnv}" not found in configuration.\n` +
        `Available environments: ${availableEnvironments.join(', ')}`,
    );
  }

  // Get the environment config
  const envConfig = setup.environments[selectedEnv];

  // Normalize flow and build configs separately
  const { flowConfig, buildOptions } = normalizeConfigs(
    envConfig,
    options.configPath,
  );

  if (options.logger) {
    options.logger.info(
      `📦 Using environment: ${selectedEnv} (${availableEnvironments.length} total)`,
    );
  }

  return {
    flowConfig,
    buildOptions,
    environment: selectedEnv,
    isMultiEnvironment: true,
    availableEnvironments,
  };
}

/**
 * Load single-environment configuration.
 */
function loadSingleEnvironmentConfig(
  config: EnvironmentConfig,
  options: LoadConfigOptions,
): LoadConfigResult {
  // Normalize the configs
  const { flowConfig, buildOptions } = normalizeConfigs(
    config,
    options.configPath,
  );

  if (options.logger && options.environment) {
    options.logger.warn(
      `--env flag specified but configuration is single-environment. Ignoring flag.`,
    );
  }

  return {
    flowConfig,
    buildOptions,
    environment: 'default',
    isMultiEnvironment: false,
  };
}

/**
 * Load legacy configuration format (deprecated).
 * @deprecated Will be removed in future versions
 */
function loadLegacyConfig(
  config: Record<string, unknown>,
  options: LoadConfigOptions,
): LoadConfigResult {
  const platform = config.platform as 'web' | 'server';

  // Split legacy config into flow and build
  const flowConfig: Flow.Config = {
    platform,
    sources: config.sources,
    destinations: config.destinations,
    collector: config.collector,
    env: config.env,
  } as unknown as Flow.Config;

  const buildOptions: Partial<BuildOptions> = {
    packages: (config.packages as BuildOptions['packages']) || {},
    code: (config.code as string) || '',
    output: (config.output as string) || '',
    tempDir: config.tempDir as string,
    template: config.template as string,
    cache: config.cache as boolean,
    ...(config.build as Partial<BuildOptions>),
  };

  // Normalize
  const normalized = normalizeConfigs(
    { flow: flowConfig, build: buildOptions },
    options.configPath,
  );

  return {
    ...normalized,
    environment: 'default',
    isMultiEnvironment: false,
  };
}

/**
 * Normalize flow and build configurations with platform-specific defaults.
 * Exported for use in helper functions and tests.
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
          sourcemap: true,
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

  // Only use template if explicitly specified
  const buildOptionsToNormalize = {
    ...buildConfig,
  };

  // Ensure all required build fields are present
  const buildOptions = ensureBuildOptions(buildOptionsToNormalize, platform);

  return {
    flowConfig,
    buildOptions,
  };
}

/**
 * Load all environments from a multi-environment configuration.
 *
 * @remarks
 * Used by the --all flag to build all environments.
 *
 * @param rawConfig - Raw configuration object
 * @param options - Loading options
 * @returns Array of loaded configurations for all environments
 */
export function loadAllEnvironments(
  rawConfig: unknown,
  options: Omit<LoadConfigOptions, 'environment'>,
): LoadConfigResult[] {
  // Must be a multi-environment config
  if (!isMultiEnvConfig(rawConfig)) {
    throw new Error(
      `--all flag requires a multi-environment configuration (Setup format).\n` +
        `Your configuration appears to be single-environment.`,
    );
  }

  const setup = rawConfig;
  const environments = Object.keys(setup.environments);

  if (options.logger) {
    options.logger.info(
      `📦 Loading all ${environments.length} environments: ${environments.join(', ')}`,
    );
  }

  // Load each environment
  return environments.map((envName) =>
    loadMultiEnvironmentConfig(setup, {
      ...options,
      environment: envName,
    }),
  );
}

/**
 * Get list of available environments from configuration.
 *
 * @param rawConfig - Raw configuration object
 * @returns Array of environment names, or empty array for single-environment configs
 */
export function getAvailableEnvironments(rawConfig: unknown): string[] {
  if (isMultiEnvConfig(rawConfig)) {
    return Object.keys(rawConfig.environments);
  }

  return [];
}
