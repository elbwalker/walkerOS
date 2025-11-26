/**
 * Configuration Module
 *
 * Config format: Flow.Setup from @walkeros/core
 * Build options: Static platform defaults from build-defaults.ts
 */

// Type guards and validators
export {
  isObject,
  detectPlatform,
  hasValidPlatform,
  isFlowSetup,
  validateFlowSetup,
  getAvailableEnvironments as getEnvironmentNames,
} from './validators.js';

// Build defaults
export {
  WEB_BUILD_DEFAULTS,
  SERVER_BUILD_DEFAULTS,
  DEFAULT_OUTPUT_PATHS,
  getBuildDefaults,
  getDefaultOutput,
} from './build-defaults.js';

// Utility functions
export {
  substituteEnvVariables,
  loadJsonConfig,
  loadJsonFromSource,
  getTempDir,
} from './utils.js';

// Loader
export {
  loadBundleConfig,
  loadAllEnvironments,
  getAvailableEnvironments,
} from './loader.js';
export type { LoadConfigResult, LoadConfigOptions } from './loader.js';

// Type re-exports
export type {
  BuildOptions,
  CLIBuildOptions,
  MinifyOptions,
  Flow,
} from '../types/bundle.js';
