/**
 * CLI Bundle Configuration
 *
 * Extends Flow configuration with build-time options.
 * Used by the walkerOS CLI for bundle generation.
 *
 * @packageDocumentation
 */

import type { Flow } from '@walkeros/core';
import type { BuildOptions as ESBuildOptions } from 'esbuild';

/**
 * CLI-specific environment configuration.
 * Based on Flow.Config with build-specific extensions.
 */
export interface Config {
  /**
   * Target platform.
   */
  platform: 'web' | 'server';

  /**
   * NPM packages to bundle.
   */
  packages: Record<string, { version?: string; imports?: string[] }>;

  /**
   * User code to include in bundle.
   */
  code: string;

  /**
   * Output file path.
   */
  output: string;

  /**
   * Source configurations (optional).
   */
  sources?: Record<string, unknown>;

  /**
   * Destination configurations (optional).
   */
  destinations?: Record<string, unknown>;

  /**
   * Collector configuration (optional).
   */
  collector?: unknown;

  /**
   * Environment-specific variables (optional).
   */
  env?: Record<string, string>;

  /**
   * Temporary directory for build artifacts.
   */
  tempDir?: string;

  /**
   * Custom template file path.
   */
  template?: string;

  /**
   * Build configuration for esbuild.
   *
   * @remarks
   * Controls how the bundle is generated:
   * - Output format (IIFE, CJS, ESM)
   * - Minification and optimization
   * - Source maps
   * - Output path
   *
   * Platform-specific defaults apply:
   * - web: format=iife, platform=browser, target=es2020
   * - server: format=esm, platform=node, target=node20
   *
   * @see {@link BuildOptions}
   */
  build?: BuildOptions;

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
   * Allow additional properties for extensibility.
   */
  [key: string]: unknown;
}

/**
 * Build options for bundle generation.
 *
 * @remarks
 * Extends esbuild's BuildOptions with walkerOS-specific additions.
 * Reuses esbuild types to avoid duplication (DRY principle).
 */
export interface BuildOptions
  extends Pick<
    ESBuildOptions,
    | 'format' // esm | iife
    | 'target' // es2020, node20, etc.
    | 'minify' // Enable minification
    | 'sourcemap' // Generate source maps
    | 'platform' // browser | node | neutral
    | 'external' // External packages to not bundle
  > {
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
  output?: string;

  /**
   * Temporary directory for build artifacts.
   *
   * @remarks
   * Used for:
   * - Downloaded packages
   * - Generated entry points
   * - Intermediate build files
   *
   * Cleaned up after successful build unless --keep-temp flag is used.
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
   *   "build": {
   *     "format": "iife",
   *     "globalName": "myTracker"
   *   }
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
 * Complete CLI setup configuration.
 *
 * @remarks
 * Extends Flow.Setup with Bundle.Config for environments.
 * Used when loading configs with CLI.
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
   * Environments with build configurations.
   */
  environments: Record<string, Config>;
}

/**
 * Get default build configuration for platform.
 *
 * @param platform - Target platform ('web' or 'server')
 * @returns Platform-specific default build options
 *
 * @remarks
 * Provides sensible defaults for each platform:
 * - web: IIFE format for browser, ES2020 target
 * - server: ESM format for Node.js, Node18 target
 */
export function getDefaultBuildOptions(
  platform: 'web' | 'server',
): BuildOptions {
  if (platform === 'web') {
    return {
      platform: 'browser',
      format: 'iife',
      target: 'es2020',
      minify: false,
      sourcemap: false,
      output: './dist/walker.js',
      globalName: 'walkerOS',
    };
  }
  return {
    platform: 'node',
    format: 'esm',
    target: 'node18',
    minify: false,
    sourcemap: false,
    output: './dist/bundle.js',
  };
}

/**
 * Ensure build config exists with defaults.
 *
 * @param config - Bundle configuration
 * @returns Configuration with guaranteed build property
 *
 * @remarks
 * If config.build is undefined, this function adds platform-specific defaults.
 * This ensures that code can safely access config.build properties.
 *
 * @example
 * ```typescript
 * const validatedConfig = ensureBuildConfig(config);
 * // Now safe to access: validatedConfig.build.format
 * ```
 */
export function ensureBuildConfig(
  config: Config,
): Config & { build: BuildOptions } {
  return {
    ...config,
    build: config.build ?? getDefaultBuildOptions(config.platform),
  };
}
