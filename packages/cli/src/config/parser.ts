/**
 * Configuration Parser
 *
 * Parsing and normalization logic for configurations.
 */

import path from 'path';
import type { Flow } from '@walkeros/core';
import type {
  BuildOptions,
  EnvironmentConfig,
  Setup,
} from '../types/bundle.js';
import {
  isObject,
  isSingleEnvConfig,
  isMultiEnvConfig,
  detectPlatform,
  hasValidPlatform,
} from './validators.js';

/**
 * Result of parsing bundle configuration.
 */
export interface ParsedConfig {
  flowConfig: Flow.Config;
  buildOptions: BuildOptions;
}

/**
 * Result of config structure parsing (before validation).
 */
export interface ParsedStructure {
  /** Raw flow config (not yet validated) */
  flowConfig: unknown;
  /** Raw build options (not yet validated) */
  buildOptions: unknown;
  /** Metadata about the config */
  metadata: {
    /** Selected environment name */
    environment: string;
    /** Whether this is a multi-environment setup */
    isMultiEnvironment: boolean;
    /** All available environment names (for multi-env setups) */
    availableEnvironments?: string[];
  };
}

/**
 * Options for parsing config structure.
 */
export interface ParseStructureOptions {
  /** Config file path (for error messages) */
  configPath?: string;
  /** Environment to select (for multi-env configs) */
  environment?: string;
}

/**
 * Parse config structure and extract environment-specific configuration.
 *
 * @param rawConfig - Raw configuration object
 * @param options - Parsing options
 * @returns Extracted flow config, build options, and metadata
 * @throws Error if config format is invalid or environment is missing
 *
 * @remarks
 * **Level 1 of 3-level config loading**:
 * - Detects multi-env vs single-env format
 * - Extracts the appropriate environment config
 * - No validation performed (happens in normalizeAndValidate)
 */
export function parseConfigStructure(
  rawConfig: unknown,
  options: ParseStructureOptions = {},
): ParsedStructure {
  // Multi-environment format
  if (isMultiEnvConfig(rawConfig)) {
    const setup = rawConfig as Setup;
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

    const envConfig = setup.environments[selectedEnv];

    return {
      flowConfig: envConfig.flow,
      buildOptions: envConfig.build,
      metadata: {
        environment: selectedEnv,
        isMultiEnvironment: true,
        availableEnvironments,
      },
    };
  }

  // Single-environment format
  if (isSingleEnvConfig(rawConfig)) {
    const config = rawConfig as EnvironmentConfig;

    return {
      flowConfig: config.flow,
      buildOptions: config.build,
      metadata: {
        environment: 'default',
        isMultiEnvironment: false,
      },
    };
  }

  // Invalid format - provide helpful error
  const configPath = options.configPath || 'configuration';
  const configType = isObject(rawConfig)
    ? 'platform' in rawConfig
      ? `invalid platform value: "${(rawConfig as { platform: unknown }).platform}"`
      : 'missing "flow" and "build" fields'
    : `not an object (got ${typeof rawConfig})`;

  throw new Error(
    `Invalid configuration format at ${configPath}.\n` +
      `Configuration ${configType}.\n\n` +
      `Expected either:\n` +
      `  1. Multi-environment: { version: 1, environments: { prod: { flow: {...}, build: {...} } } }\n` +
      `  2. Single-environment: { flow: { platform: "web" | "server", ... }, build: { packages: {...}, ... } }`,
  );
}

/**
 * Normalize and validate flow and build configurations.
 *
 * @param flowConfig - Raw flow configuration
 * @param buildOptions - Raw build options
 * @param configPath - Path to config file (for relative template resolution)
 * @returns Validated and normalized configuration
 * @throws Error if validation fails
 *
 * @remarks
 * **Level 2 of 3-level config loading**:
 * - Validates platform (once!)
 * - Applies platform-specific defaults (single pass)
 * - Resolves relative template paths
 * - Ensures all required fields are present
 */
export function normalizeAndValidate(
  flowConfig: unknown,
  buildOptions: unknown,
  configPath?: string,
): ParsedConfig {
  // Extract and validate platform (supports both web/server keys and legacy platform property)
  if (!isObject(flowConfig)) {
    throw new Error(
      `Invalid flow config: expected object, got ${typeof flowConfig}`,
    );
  }

  const platform = detectPlatform(flowConfig);

  if (!platform) {
    throw new Error(
      `Invalid flow config: missing platform. ` +
        `Expected either "web" or "server" key, or legacy "platform" property.`,
    );
  }

  // Validate build options structure
  if (!isObject(buildOptions)) {
    throw new Error(
      `Invalid build options: expected object, got ${typeof buildOptions}`,
    );
  }

  // Apply platform-specific defaults (single pass merge)
  const platformDefaults: Partial<BuildOptions> =
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

  // Single merge: defaults + user config + conditional defaults
  const merged: Partial<BuildOptions> = {
    ...platformDefaults,
    ...(buildOptions as Partial<BuildOptions>),
  };

  // Auto-select default template based on platform if not specified
  if (merged.template === undefined) {
    merged.template = platform === 'server' ? 'server.hbs' : 'web.hbs';
  }

  // Apply window assignment for browser IIFE
  // Priority: flow.web config > build options > defaults
  if (merged.format === 'iife' && merged.platform === 'browser') {
    const webConfig = flowConfig.web as Record<string, unknown> | undefined;

    // Extract from flow.web first, then fall back to build options, then defaults
    if (merged.windowCollector === undefined) {
      merged.windowCollector =
        (webConfig?.windowCollector as string | undefined) || 'collector';
    }
    if (merged.windowElb === undefined) {
      merged.windowElb = (webConfig?.windowElb as string | undefined) || 'elb';
    }
  }

  // Resolve template path relative to config file directory if it starts with ./ or ../
  if (
    configPath &&
    merged.template &&
    !path.isAbsolute(merged.template) &&
    (merged.template.startsWith('./') || merged.template.startsWith('../'))
  ) {
    const configDir = path.dirname(configPath);
    merged.template = path.resolve(configDir, merged.template);
  }

  // Apply platform-specific defaults for required fields
  if (!merged.output || merged.output === '') {
    merged.output =
      platform === 'web' ? './dist/walker.js' : './dist/bundle.js';
  }

  // Resolve output path relative to config file directory if it's relative
  // Skip resolution for placeholder paths used in tests/programmatic API
  if (
    configPath &&
    configPath !== '/unknown/path' &&
    merged.output &&
    !path.isAbsolute(merged.output)
  ) {
    const configDir = path.dirname(configPath);
    merged.output = path.resolve(configDir, merged.output);
  }

  if (!merged.packages) {
    merged.packages = {};
  }

  if (merged.code === undefined || merged.code === '') {
    merged.code = '';
  }

  // Return fully validated config
  return {
    flowConfig: flowConfig as Flow.Config,
    buildOptions: merged as BuildOptions,
  };
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

  // Check for { flow, build } format
  if (!('flow' in data) || !isObject(data.flow)) {
    throw new Error(
      `Invalid config: missing "flow" field. ` +
        `Expected format: { flow: { web: {...} | server: {...}, ... }, build: { ... } }`,
    );
  }

  if (!('build' in data) || !isObject(data.build)) {
    throw new Error(
      `Invalid config: missing "build" field. ` +
        `Expected format: { flow: { web: {...} | server: {...}, ... }, build: { ... } }`,
    );
  }

  // Validate build.packages field
  const buildData = data.build as Record<string, unknown>;
  if ('packages' in buildData && !isObject(buildData.packages)) {
    throw new Error(
      `Invalid config: build.packages must be an object, got ${typeof buildData.packages}`,
    );
  }

  // Use new simplified validation
  return normalizeAndValidate(data.flow, data.build, '/unknown/path');
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
 *
 * @deprecated Use normalizeAndValidate() instead (simpler, single-pass validation)
 *
 * @remarks
 * Kept for backward compatibility. Internally delegates to normalizeAndValidate().
 */
export function normalizeConfigs(
  config:
    | EnvironmentConfig
    | { flow: Flow.Config; build: Partial<BuildOptions> },
  configPath?: string,
): { flowConfig: Flow.Config; buildOptions: BuildOptions } {
  // Delegate to new simplified function
  return normalizeAndValidate(config.flow, config.build, configPath);
}
