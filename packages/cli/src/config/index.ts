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
} from './validators';

// Utility functions
export {
  substituteEnvVariables,
  loadJsonConfig,
  loadJsonFromSource,
  getTempDir,
} from './utils';

// Platform defaults
export { getDefaultBuildOptions, ensureBuildOptions } from './defaults';

// Parser
export {
  parseBundleConfig,
  safeParseBundleConfig,
  normalizeConfigs,
} from './parser';
export type { ParsedConfig } from './parser';

// Loader
export {
  loadBundleConfig,
  loadAllEnvironments,
  getAvailableEnvironments,
} from './loader';
export type { LoadConfigResult, LoadConfigOptions } from './loader';

// Type re-exports from bundle types
export type {
  BuildOptions,
  MinifyOptions,
  EnvironmentConfig,
  Setup,
} from '../types/bundle';
