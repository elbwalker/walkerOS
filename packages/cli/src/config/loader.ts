/**
 * Configuration Loader
 *
 * Loads and parses Flow.Config configurations using core getFlowSettings().
 * Build options are determined by static platform defaults.
 */

import path from 'path';
import fs from 'fs-extra';
import { getFlowSettings, getPlatform, type Flow } from '@walkeros/core';
import type { BuildOptions } from '../types/bundle.js';
import {
  validateFlowConfig,
  isFlowConfig,
  getAvailableFlows as getFlowNames,
} from './validators.js';
import { getBuildDefaults, getDefaultOutput } from './build-defaults.js';
import { isUrl, loadJsonConfig } from './utils.js';

/** Default folder for includes if it exists */
const DEFAULT_INCLUDE_FOLDER = './shared';

/**
 * Result of configuration loading.
 */
export interface LoadConfigResult {
  /** Runtime event processing configuration */
  flowSettings: Flow.Settings;
  /** Build-time configuration */
  buildOptions: BuildOptions;
  /** Name of the selected flow */
  flowName: string;
  /** Whether multiple flows are available */
  isMultiFlow: boolean;
  /** All available flow names */
  availableFlows: string[];
}

/**
 * Options for loading configuration.
 */
export interface LoadConfigOptions {
  /** Path to config file */
  configPath: string;
  /** Flow name to load (required for multi-flow, optional for single-flow) */
  flowName?: string;
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
 * Uses Flow.Config from @walkeros/core as the only config format.
 * - Validates config structure
 * - Uses core getFlowSettings() for variable/definition resolution
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
 *   flowName: 'production',
 * });
 * ```
 */
export function loadBundleConfig(
  rawConfig: unknown,
  options: LoadConfigOptions,
): LoadConfigResult {
  // Validate as Flow.Config
  const config = validateFlowConfig(rawConfig);
  const availableFlows = getFlowNames(config);

  // Determine which flow to use
  const flowName = resolveFlow(config, options.flowName, availableFlows);

  // Resolve with deferred mode first (markers don't affect platform detection)
  let flowSettings = getFlowSettings(config, flowName, { deferred: true });
  const platform = getPlatform(flowSettings);
  if (!platform) {
    throw new Error(
      `Invalid configuration: flow "${flowName}" must have a "web" or "server" key.`,
    );
  }

  // For web: re-resolve without deferred to bake values at build time
  if (platform === 'web') {
    flowSettings = getFlowSettings(config, flowName);
  }

  // Get static build defaults based on platform
  const buildDefaults = getBuildDefaults(platform);

  // Extract packages from flowSettings (if present)
  const packages = flowSettings.packages || {};

  // Output path: use --output if provided, otherwise default
  // Always relative to cwd, no dynamic resolution
  const output = options.buildOverrides?.output || getDefaultOutput(platform);

  // Get config directory for resolving includes and local packages
  // For URLs, use cwd since there's no local config directory
  const configDir = isUrl(options.configPath)
    ? process.cwd()
    : path.dirname(options.configPath);

  // Get includes from config or use default if ./shared exists
  let includes = config.include;
  if (!includes) {
    const defaultIncludePath = path.resolve(configDir, DEFAULT_INCLUDE_FOLDER);
    if (fs.pathExistsSync(defaultIncludePath)) {
      includes = [DEFAULT_INCLUDE_FOLDER];
    }
  }

  // Merge build options: defaults + CLI overrides
  const buildOptions: BuildOptions = {
    ...buildDefaults,
    packages,
    output,
    include: includes,
    configDir,
    ...options.buildOverrides,
  };

  // Log flow selection
  const isMultiFlow = availableFlows.length > 1;
  if (isMultiFlow && options.logger) {
    options.logger.info(
      `📦 Using flow: ${flowName} (${availableFlows.length} total)`,
    );
  }

  return {
    flowSettings,
    buildOptions,
    flowName,
    isMultiFlow,
    availableFlows,
  };
}

/**
 * Resolve which flow to use.
 *
 * @param config - Flow.Config configuration
 * @param requestedFlow - Flow name from CLI (optional)
 * @param available - Available flow names
 * @returns Flow name to use
 * @throws Error if flow selection is invalid
 */
function resolveFlow(
  config: Flow.Config,
  requestedFlow: string | undefined,
  available: string[],
): string {
  // If only one flow, use it automatically
  if (available.length === 1) {
    return available[0];
  }

  // Multiple flows require explicit selection
  if (!requestedFlow) {
    throw new Error(
      `Multiple flows found. Please specify a flow using --flow flag.\n` +
        `Available flows: ${available.join(', ')}`,
    );
  }

  // Validate the requested flow exists
  if (!available.includes(requestedFlow)) {
    throw new Error(
      `Flow "${requestedFlow}" not found in configuration.\n` +
        `Available flows: ${available.join(', ')}`,
    );
  }

  return requestedFlow;
}

/**
 * Load all flows from a configuration.
 *
 * @remarks
 * Used by the --all flag to build all flows.
 *
 * @param rawConfig - Raw configuration object
 * @param options - Loading options (without flowName)
 * @returns Array of loaded configurations for all flows
 */
export function loadAllFlows(
  rawConfig: unknown,
  options: Omit<LoadConfigOptions, 'flowName'>,
): LoadConfigResult[] {
  // Validate as Flow.Config
  const config = validateFlowConfig(rawConfig);
  const flows = getFlowNames(config);

  if (options.logger) {
    options.logger.info(
      `📦 Loading all ${flows.length} flows: ${flows.join(', ')}`,
    );
  }

  // Load each flow
  return flows.map((name) =>
    loadBundleConfig(rawConfig, {
      ...options,
      flowName: name,
    }),
  );
}

/**
 * Get list of available flows from configuration.
 *
 * @param rawConfig - Raw configuration object
 * @returns Array of flow names
 */
export function getAvailableFlows(rawConfig: unknown): string[] {
  if (isFlowConfig(rawConfig)) {
    return getFlowNames(rawConfig);
  }
  return [];
}

/**
 * Load flow configuration from file or URL.
 *
 * Single entry point for all commands (bundle, simulate, push).
 * Handles URL vs local path detection automatically.
 *
 * @param configPath - Path to config file or URL
 * @param options - Loading options (flowName, logger, buildOverrides)
 * @returns Parsed configuration with flow and build options
 *
 * @example
 * ```typescript
 * const { flowSettings, buildOptions } = await loadFlowConfig('./flow.json');
 * const { flowSettings } = await loadFlowConfig('https://example.com/flow.json');
 * ```
 */
export async function loadFlowConfig(
  configPath: string,
  options?: Omit<LoadConfigOptions, 'configPath'>,
): Promise<LoadConfigResult> {
  const rawConfig = await loadJsonConfig(configPath);
  return loadBundleConfig(rawConfig, { configPath, ...options });
}
