/**
 * Configuration Loader
 *
 * Loads and parses Flow.Setup configurations using core getFlowConfig().
 * Build options are determined by static platform defaults.
 */

import path from 'path';
import fs from 'fs-extra';
import { getFlowConfig, getPlatform, type Flow } from '@walkeros/core';
import type { BuildOptions } from '../types/bundle.js';
import {
  validateFlowSetup,
  isFlowSetup,
  getAvailableFlows as getFlowNames,
} from './validators.js';
import { getBuildDefaults, getDefaultOutput } from './build-defaults.js';

/** Default folder for includes if it exists */
const DEFAULT_INCLUDE_FOLDER = './shared';

/**
 * Result of configuration loading.
 */
export interface LoadConfigResult {
  /** Runtime event processing configuration */
  flowConfig: Flow.Config;
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
 *   flowName: 'production',
 * });
 * ```
 */
export function loadBundleConfig(
  rawConfig: unknown,
  options: LoadConfigOptions,
): LoadConfigResult {
  // Validate as Flow.Setup
  const setup = validateFlowSetup(rawConfig);
  const availableFlows = getFlowNames(setup);

  // Determine which flow to use
  const flowName = resolveFlow(setup, options.flowName, availableFlows);

  // Use core getFlowConfig() for resolution (variables, $refs, cascading)
  const flowConfig = getFlowConfig(setup, flowName);

  // Detect platform from resolved config
  const platform = getPlatform(flowConfig);
  if (!platform) {
    throw new Error(
      `Invalid configuration: flow "${flowName}" must have a "web" or "server" key.`,
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

  // Get config directory for relative path resolution
  const configDir = path.dirname(options.configPath);

  // Make output path absolute relative to config file
  if (!path.isAbsolute(output)) {
    output = path.resolve(configDir, output);
  }

  // Get includes from config or use default if ./shared exists
  let includes = setup.include;
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
    flowConfig,
    buildOptions,
    flowName,
    isMultiFlow,
    availableFlows,
  };
}

/**
 * Resolve which flow to use.
 *
 * @param setup - Flow.Setup configuration
 * @param requestedFlow - Flow name from CLI (optional)
 * @param available - Available flow names
 * @returns Flow name to use
 * @throws Error if flow selection is invalid
 */
function resolveFlow(
  setup: Flow.Setup,
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
  // Validate as Flow.Setup
  const setup = validateFlowSetup(rawConfig);
  const flows = getFlowNames(setup);

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
  if (isFlowSetup(rawConfig)) {
    return getFlowNames(rawConfig);
  }
  return [];
}
