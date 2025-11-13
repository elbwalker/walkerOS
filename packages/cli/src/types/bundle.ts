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
 * Extends Flow.Config with build options.
 */
export interface Config extends Flow.Config {
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
}

/**
 * Complete CLI setup configuration.
 *
 * @remarks
 * Extends Flow.Setup with Bundle.Config for environments.
 * Used when loading configs with CLI.
 */
export interface Setup extends Omit<Flow.Setup, 'environments'> {
  /**
   * Environments with build configurations.
   */
  environments: Record<string, Config>;
}
