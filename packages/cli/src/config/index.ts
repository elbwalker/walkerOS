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
  isFlowSetup,
  validateFlowSetup,
  getAvailableFlows as getFlowNames,
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
  isUrl,
} from './utils.js';

// Loader
export { loadBundleConfig, loadAllFlows, getAvailableFlows } from './loader.js';
export type { LoadConfigResult, LoadConfigOptions } from './loader.js';

// Type re-exports
export type {
  BuildOptions,
  CLIBuildOptions,
  MinifyOptions,
  Flow,
} from '../types/bundle.js';
