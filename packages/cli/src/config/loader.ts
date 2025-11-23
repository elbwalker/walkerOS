/**
 * Configuration Loader
 *
 * Loads and parses configurations with support for:
 * - Single-environment configs
 * - Multi-environment setups
 * - Environment selection
 */

import type { Flow } from '@walkeros/core';
import type {
  BuildOptions,
  EnvironmentConfig,
  Setup,
} from '../types/bundle.js';
import { isMultiEnvConfig, isObject } from './validators.js';
import {
  parseConfigStructure,
  normalizeAndValidate,
  normalizeConfigs,
} from './parser.js';

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
  // Level 1: Parse structure and extract config
  const { flowConfig, buildOptions, metadata } = parseConfigStructure(
    rawConfig,
    {
      configPath: options.configPath,
      environment: options.environment,
    },
  );

  // Level 2: Normalize and validate
  const normalized = normalizeAndValidate(
    flowConfig,
    buildOptions,
    options.configPath,
  );

  // Log environment selection if multi-environment
  if (metadata.isMultiEnvironment && options.logger) {
    options.logger.info(
      `📦 Using environment: ${metadata.environment} (${metadata.availableEnvironments?.length || 0} total)`,
    );
  }

  // Warn if --env flag specified for single-environment config
  if (!metadata.isMultiEnvironment && options.environment && options.logger) {
    options.logger.warn(
      `--env flag specified but configuration is single-environment. Ignoring flag.`,
    );
  }

  return {
    ...normalized,
    ...metadata,
  };
}

/**
 * Load multi-environment configuration.
 *
 * @deprecated Kept for backward compatibility. Use loadBundleConfig() instead.
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
 *
 * @deprecated Kept for backward compatibility. Use loadBundleConfig() instead.
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

// Legacy format support removed in v0.3.0
// Migration: Convert old format { platform, sources, destinations, packages, code, output }
// To new format: { flow: { platform, sources, destinations }, build: { packages, code, output } }
// See docs/MIGRATION.md for details

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
