/**
 * Configuration Loader
 *
 * Loads and parses Flow.Setup configurations using core getFlowConfig().
 * Build options are determined by static platform defaults.
 */

import path from 'path';
import { getFlowConfig, getPlatform, type Flow } from '@walkeros/core';
import type { BuildOptions } from '../types/bundle.js';
import {
  validateFlowSetup,
  isFlowSetup,
  getAvailableEnvironments as getEnvNames,
} from './validators.js';
import { getBuildDefaults, getDefaultOutput } from './build-defaults.js';

/**
 * Result of configuration loading.
 */
export interface LoadConfigResult {
  /** Runtime event processing configuration */
  flowConfig: Flow.Config;
  /** Build-time configuration */
  buildOptions: BuildOptions;
  /** Name of the selected environment */
  environment: string;
  /** Whether multiple environments are available */
  isMultiEnvironment: boolean;
  /** All available environment names */
  availableEnvironments: string[];
}

/**
 * Options for loading configuration.
 */
export interface LoadConfigOptions {
  /** Path to config file */
  configPath: string;
  /** Environment name to load (required for multi-env, optional for single-env) */
  environment?: string;
  /** CLI build overrides (future: --output, --minify, etc.) */
  buildOverrides?: Partial<BuildOptions>;
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
 * Uses Flow.Setup from @walkeros/core as the only config format.
 * - Validates config structure
 * - Uses core getFlowConfig() for variable/definition resolution
 * - Determines platform from resolved config
 * - Applies static build defaults based on platform
 *
 * @param rawConfig - Raw configuration object from JSON file
 * @param options - Loading options
 * @returns Parsed configuration with flow and build separated
 *
 * @example
 * ```typescript
 * const config = loadBundleConfig(rawConfig, {
 *   configPath: './walkeros.config.json',
 *   environment: 'production',
 * });
 * ```
 */
export function loadBundleConfig(
  rawConfig: unknown,
  options: LoadConfigOptions,
): LoadConfigResult {
  // Validate as Flow.Setup
  const setup = validateFlowSetup(rawConfig);
  const availableEnvironments = getEnvNames(setup);

  // Determine which environment to use
  const environment = resolveEnvironment(
    setup,
    options.environment,
    availableEnvironments,
  );

  // Use core getFlowConfig() for resolution (variables, $refs, cascading)
  const flowConfig = getFlowConfig(setup, environment);

  // Detect platform from resolved config
  const platform = getPlatform(flowConfig);
  if (!platform) {
    throw new Error(
      `Invalid configuration: environment "${environment}" must have a "web" or "server" key.`,
    );
  }

  // Get static build defaults based on platform
  const buildDefaults = getBuildDefaults(platform);

  // Extract packages from flowConfig (if present)
  const packages = flowConfig.packages || {};

  // Resolve output path relative to config directory
  let output = getDefaultOutput(platform);
  if (options.buildOverrides?.output) {
    output = options.buildOverrides.output;
  }

  // Make output path absolute relative to config file
  if (!path.isAbsolute(output)) {
    const configDir = path.dirname(options.configPath);
    output = path.resolve(configDir, output);
  }

  // Merge build options: defaults + CLI overrides
  const buildOptions: BuildOptions = {
    ...buildDefaults,
    packages,
    output,
    ...options.buildOverrides,
  };

  // Log environment selection
  const isMultiEnvironment = availableEnvironments.length > 1;
  if (isMultiEnvironment && options.logger) {
    options.logger.info(
      `📦 Using environment: ${environment} (${availableEnvironments.length} total)`,
    );
  }

  return {
    flowConfig,
    buildOptions,
    environment,
    isMultiEnvironment,
    availableEnvironments,
  };
}

/**
 * Resolve which environment to use.
 *
 * @param setup - Flow.Setup configuration
 * @param requestedEnv - Environment name from CLI (optional)
 * @param available - Available environment names
 * @returns Environment name to use
 * @throws Error if environment selection is invalid
 */
function resolveEnvironment(
  setup: Flow.Setup,
  requestedEnv: string | undefined,
  available: string[],
): string {
  // If only one environment, use it automatically
  if (available.length === 1) {
    return available[0];
  }

  // Multiple environments require explicit selection
  if (!requestedEnv) {
    throw new Error(
      `Multiple environments found. Please specify an environment using --env flag.\n` +
        `Available environments: ${available.join(', ')}`,
    );
  }

  // Validate the requested environment exists
  if (!available.includes(requestedEnv)) {
    throw new Error(
      `Environment "${requestedEnv}" not found in configuration.\n` +
        `Available environments: ${available.join(', ')}`,
    );
  }

  return requestedEnv;
}

/**
 * Load all environments from a configuration.
 *
 * @remarks
 * Used by the --all flag to build all environments.
 *
 * @param rawConfig - Raw configuration object
 * @param options - Loading options (without environment)
 * @returns Array of loaded configurations for all environments
 */
export function loadAllEnvironments(
  rawConfig: unknown,
  options: Omit<LoadConfigOptions, 'environment'>,
): LoadConfigResult[] {
  // Validate as Flow.Setup
  const setup = validateFlowSetup(rawConfig);
  const environments = getEnvNames(setup);

  if (options.logger) {
    options.logger.info(
      `📦 Loading all ${environments.length} environments: ${environments.join(', ')}`,
    );
  }

  // Load each environment
  return environments.map((envName) =>
    loadBundleConfig(rawConfig, {
      ...options,
      environment: envName,
    }),
  );
}

/**
 * Get list of available environments from configuration.
 *
 * @param rawConfig - Raw configuration object
 * @returns Array of environment names
 */
export function getAvailableEnvironments(rawConfig: unknown): string[] {
  if (isFlowSetup(rawConfig)) {
    return getEnvNames(rawConfig);
  }
  return [];
}
