/**
 * CLI Build Configuration
 *
 * Build-time options for the walkerOS CLI bundle generation.
 * Completely separate from Flow.Config (runtime configuration).
 *
 * @packageDocumentation
 */

import type { Flow } from '@walkeros/core';
import type { BuildOptions as ESBuildOptions } from 'esbuild';

/**
 * Build options for bundle generation.
 *
 * @remarks
 * Contains all CLI-specific build settings including:
 * - Package management (NPM packages to bundle)
 * - Code injection (custom user code)
 * - Output configuration (file paths, formats)
 * - Esbuild settings (minification, source maps, etc.)
 *
 * Completely separate from Flow.Config which handles runtime event processing.
 */
export interface BuildOptions
  extends Pick<
    ESBuildOptions,
    | 'format' // esm | iife | cjs
    | 'target' // es2020, node20, etc.
    | 'minify' // Enable minification
    | 'sourcemap' // Generate source maps
    | 'platform' // browser | node | neutral
    | 'external' // External packages to not bundle
  > {
  /**
   * NPM packages to bundle.
   *
   * @remarks
   * Maps package name to version and imports configuration.
   * Packages are downloaded from npm and bundled into the output.
   *
   * @example
   * ```json
   * {
   *   "@walkeros/core": {
   *     "version": "^0.2.0",
   *     "imports": ["getId", "tryCatch"]
   *   }
   * }
   * ```
   */
  packages: Record<string, { version?: string; imports?: string[] }>;

  /**
   * User code to include in bundle.
   *
   * @remarks
   * Custom JavaScript/TypeScript code that will be included in the bundle.
   * Can reference imported packages and will be executed when bundle loads.
   *
   * @example
   * ```typescript
   * "export default () => startFlow({ sources: {...}, destinations: {...} })"
   * ```
   */
  code: string;

  /**
   * Output file path.
   *
   * @remarks
   * Absolute or relative path for the generated bundle.
   * Directory will be created if it doesn't exist.
   *
   * @default "./dist/walker.js" (web) or "./dist/bundle.js" (server)
   *
   * @example
   * "./dist/walker.min.js"
   */
  output: string;

  /**
   * Temporary directory for build artifacts.
   *
   * @remarks
   * Used for:
   * - Downloaded packages
   * - Generated entry points
   * - Intermediate build files
   *
   * Cleaned up after successful build unless shared with simulator.
   *
   * @default ".tmp"
   */
  tempDir?: string;

  /**
   * Custom template file path.
   *
   * @remarks
   * Override the default template (base.hbs or server.hbs).
   * Template receives variables: {{sources}}, {{destinations}}, {{collector}}, {{{CODE}}}
   *
   * @default undefined (uses platform-specific default)
   *
   * @example
   * "./templates/custom.hbs"
   */
  template?: string;

  /**
   * Enable package caching.
   *
   * @remarks
   * When enabled, downloaded packages are cached for faster subsequent builds.
   *
   * @default true
   */
  cache?: boolean;

  /**
   * Global variable name for IIFE bundles.
   *
   * @remarks
   * Only used when format=iife.
   * Creates a global variable on the window object.
   *
   * @default "walkerOS"
   *
   * @example
   * ```json
   * {
   *   "format": "iife",
   *   "globalName": "myTracker"
   * }
   * ```
   *
   * Results in: `window.myTracker = { ... }`
   */
  globalName?: string;

  /**
   * Minification options.
   *
   * @remarks
   * Fine-tune minification behavior.
   * Only applies when minify=true.
   */
  minifyOptions?: MinifyOptions;
}

/**
 * Minification options.
 *
 * @remarks
 * Controls esbuild's minification behavior.
 */
export interface MinifyOptions {
  /**
   * Minify identifiers (variable names).
   *
   * @default true
   */
  identifiers?: boolean;

  /**
   * Minify syntax (shorten code).
   *
   * @default true
   */
  syntax?: boolean;

  /**
   * Minify whitespace.
   *
   * @default true
   */
  whitespace?: boolean;

  /**
   * Keep original function/class names.
   *
   * @remarks
   * Useful for debugging production bundles.
   *
   * @default false
   */
  keepNames?: boolean;

  /**
   * How to handle legal comments.
   *
   * @default "none"
   */
  legalComments?: 'none' | 'inline' | 'eof' | 'linked' | 'external';
}

/**
 * Single environment configuration.
 *
 * @remarks
 * Combines Flow.Config (runtime) with BuildOptions (build-time).
 * This is the structure stored in config files for each environment.
 */
export interface EnvironmentConfig {
  /**
   * Runtime event processing configuration.
   *
   * @remarks
   * Defines sources, destinations, collector settings.
   * From @walkeros/core - platform-agnostic.
   */
  flow: Flow.Config;

  /**
   * Build-time configuration.
   *
   * @remarks
   * Defines how to bundle the flow configuration.
   * CLI-specific settings.
   */
  build: BuildOptions;
}

/**
 * Multi-environment setup configuration.
 *
 * @remarks
 * Top-level config file format supporting multiple deployment environments.
 * Each environment has separate flow and build configurations.
 *
 * @example
 * ```json
 * {
 *   "version": 1,
 *   "variables": {
 *     "GA_ID": "G-XXXXXXXXXX"
 *   },
 *   "environments": {
 *     "production": {
 *       "flow": { "platform": "web", ... },
 *       "build": { "packages": {...}, "output": "./dist/prod.js" }
 *     },
 *     "staging": {
 *       "flow": { "platform": "web", ... },
 *       "build": { "packages": {...}, "output": "./dist/staging.js" }
 *     }
 *   }
 * }
 * ```
 */
export interface Setup {
  /**
   * Configuration schema version.
   */
  version: 1;

  /**
   * JSON Schema reference for IDE validation.
   */
  $schema?: string;

  /**
   * Shared variables for interpolation across all environments.
   */
  variables?: Record<string, string | number | boolean>;

  /**
   * Reusable configuration definitions.
   */
  definitions?: Record<string, unknown>;

  /**
   * Environments with flow and build configurations.
   */
  environments: Record<string, EnvironmentConfig>;
}

/**
 * Get default build configuration for platform.
 *
 * @param platform - Target platform ('web' or 'server')
 * @param code - User code to include (required for BuildOptions)
 * @param output - Output file path (optional, uses platform default)
 * @returns Platform-specific default build options
 *
 * @remarks
 * Provides sensible defaults for each platform:
 * - web: IIFE format for browser, ES2020 target
 * - server: ESM format for Node.js, Node18 target
 */
export function getDefaultBuildOptions(
  platform: 'web' | 'server',
  code: string,
  output?: string,
): Partial<BuildOptions> {
  const common = {
    code,
    packages: {} as Record<string, { version?: string; imports?: string[] }>,
    minify: false,
    sourcemap: false,
    cache: true,
  };

  if (platform === 'web') {
    return {
      ...common,
      platform: 'browser',
      format: 'iife',
      target: 'es2020',
      output: output || './dist/walker.js',
      globalName: 'walkerOS',
    };
  }

  return {
    ...common,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    output: output || './dist/bundle.js',
  };
}

/**
 * Ensure build options have all required fields.
 *
 * @param buildOptions - Build options (possibly incomplete)
 * @param flowPlatform - Platform from Flow.Config
 * @returns Complete build options with defaults filled in
 *
 * @remarks
 * Validates and fills in missing required fields using platform-specific defaults.
 * Throws error if critical fields (code, output) are missing.
 */
export function ensureBuildOptions(
  buildOptions: Partial<BuildOptions>,
  flowPlatform: 'web' | 'server',
): BuildOptions {
  const defaults = getDefaultBuildOptions(
    flowPlatform,
    buildOptions.code || '',
    buildOptions.output,
  );

  // Validate required fields
  if (!buildOptions.code && !defaults.code) {
    throw new Error('BuildOptions.code is required');
  }
  if (!buildOptions.output && !defaults.output) {
    throw new Error('BuildOptions.output is required');
  }

  return {
    ...defaults,
    ...buildOptions,
    code: buildOptions.code || defaults.code!,
    output: buildOptions.output || defaults.output!,
    packages: buildOptions.packages || defaults.packages!,
  } as BuildOptions;
}
