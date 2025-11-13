/**
 * Configuration Loader
 *
 * Loads and parses bundle configurations with support for:
 * - Legacy single-environment configs
 * - Flow.Setup multi-environment configs
 * - Environment selection
 * - Platform-specific defaults
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { isObject } from '../utils/type-guards';
import type { Bundle } from '../types';
import type { Flow } from '@walkeros/core';

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
function isMultiEnvConfig(data: unknown): data is Flow.Setup {
  return (
    isObject(data) &&
    'version' in data &&
    data.version === 1 &&
    'environments' in data &&
    isObject(data.environments)
  );
}

/**
 * Type guard: Check if config is single-environment format.
 */
function isSingleEnvConfig(data: unknown): data is Bundle.Config {
  return (
    isObject(data) && 'platform' in data && validatePlatform(data.platform)
  );
}

/**
 * Result of configuration loading.
 */
export interface LoadConfigResult {
  /** Parsed bundle configuration for the selected environment */
  config: Bundle.Config;
  /** Name of the selected environment (or 'default' for legacy configs) */
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
 * - Legacy single-environment format
 * - New Flow.Setup multi-environment format
 *
 * For multi-environment configs, requires `environment` option.
 *
 * @param rawConfig - Raw configuration object from JSON file
 * @param options - Loading options
 * @returns Parsed configuration with metadata
 */
export function loadBundleConfig(
  rawConfig: unknown,
  options: LoadConfigOptions,
): LoadConfigResult {
  // Check if multi-environment format
  if (isMultiEnvConfig(rawConfig)) {
    return loadMultiEnvironmentConfig(rawConfig, options);
  }

  // Check if single-environment format
  if (isSingleEnvConfig(rawConfig)) {
    return loadSingleEnvironmentConfig(rawConfig, options);
  }

  // Invalid format - provide helpful error
  const configType = isObject(rawConfig)
    ? 'platform' in rawConfig
      ? `invalid platform value: "${(rawConfig as { platform: unknown }).platform}"`
      : 'missing "platform" field'
    : `not an object (got ${typeof rawConfig})`;

  throw new Error(
    `Invalid configuration format at ${options.configPath}.\n` +
      `Configuration ${configType}.\n\n` +
      `Expected either:\n` +
      `  1. Flow.Setup (multi-environment): { version: 1, environments: {...} }\n` +
      `  2. Bundle.Config (single): { platform: "web" | "server", ... }`,
  );
}

/**
 * Load multi-environment configuration.
 */
function loadMultiEnvironmentConfig(
  setup: Bundle.Setup,
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

  // Apply platform-specific defaults and normalization
  const normalizedConfig = normalizeConfig(envConfig);

  if (options.logger) {
    options.logger.info(
      `📦 Using environment: ${selectedEnv} (${availableEnvironments.length} total)`,
    );
  }

  return {
    config: normalizedConfig,
    environment: selectedEnv,
    isMultiEnvironment: true,
    availableEnvironments,
  };
}

/**
 * Load single-environment configuration.
 */
function loadSingleEnvironmentConfig(
  config: Bundle.Config,
  options: LoadConfigOptions,
): LoadConfigResult {
  // Normalize the config
  const normalizedConfig = normalizeConfig(config);

  if (options.logger && options.environment) {
    options.logger.warn(
      `--env flag specified but configuration is single-environment. Ignoring flag.`,
    );
  }

  return {
    config: normalizedConfig,
    environment: 'default',
    isMultiEnvironment: false,
  };
}

/**
 * Normalize configuration with platform-specific defaults.
 * Exported for use in helper functions and tests.
 */
export function normalizeConfig(
  config: Bundle.Config,
  configPath?: string,
): Bundle.Config {
  const platform = config.platform;

  // Apply platform-specific build defaults
  const buildDefaults: Partial<Bundle.BuildOptions> =
    platform === 'web'
      ? {
          platform: 'browser',
          format: 'iife',
          target: 'es2020',
          minify: false,
          sourcemap: true,
          output: './dist/walker.js',
          tempDir: '.tmp',
        }
      : {
          platform: 'node',
          format: 'esm',
          target: 'node20',
          minify: false,
          sourcemap: false,
          output: './dist/bundle.js',
          tempDir: '.tmp',
        };

  // Merge build config
  const build: Bundle.BuildOptions = {
    ...buildDefaults,
    ...config.build,
  };

  // Auto-select template if not specified
  let template = config.build?.template;
  if (!template) {
    const templateName = platform === 'server' ? 'server.hbs' : 'base.hbs';
    template = path.join(getDirname(), '../templates', templateName);
  }

  // Return normalized config
  return {
    ...config,
    build: {
      ...build,
      template,
    },
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
  // Must be a Flow.Setup (multi-environment) config
  if (!isMultiEnvConfig(rawConfig)) {
    throw new Error(
      `--all flag requires a multi-environment configuration (Flow.Setup format).\n` +
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
