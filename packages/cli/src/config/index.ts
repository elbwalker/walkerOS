/**
 * Configuration Module
 *
 * Unified configuration loading, parsing, and validation.
 */

// Type guards and validators
export {
  isObject,
  validatePlatform,
  isMultiEnvConfig,
  isSingleEnvConfig,
} from './validators.js';

// Utility functions
export {
  substituteEnvVariables,
  loadJsonConfig,
  loadJsonFromSource,
  getTempDir,
} from './utils.js';

// Platform defaults
export { getDefaultBuildOptions, ensureBuildOptions } from './defaults.js';

// Parser
export {
  parseBundleConfig,
  safeParseBundleConfig,
  normalizeConfigs,
} from './parser.js';
export type { ParsedConfig } from './parser.js';

// Loader
export {
  loadBundleConfig,
  loadAllEnvironments,
  getAvailableEnvironments,
} from './loader.js';
export type { LoadConfigResult, LoadConfigOptions } from './loader.js';

// Type re-exports from bundle types
export type {
  BuildOptions,
  MinifyOptions,
  EnvironmentConfig,
  Setup,
} from '../types/bundle.js';
