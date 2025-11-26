/**
 * CLI Build Configuration
 *
 * CLI-specific build options for walkerOS bundle generation.
 * Uses Flow.Setup and Flow.Config from @walkeros/core for config structure.
 *
 * @packageDocumentation
 */

import type { Flow } from '@walkeros/core';
import type { BuildOptions as ESBuildOptions } from 'esbuild';

// Re-export core Flow types for CLI consumers
export type { Flow };

/**
 * CLI-specific build options (public API).
 *
 * @remarks
 * These are CLI-only options not part of the config file.
 * The config file uses Flow.Setup from @walkeros/core.
 *
 * Platform-derived defaults:
 * - web: format=iife, target=es2020, platform=browser
 * - server: format=esm, target=node18, platform=node
 */
export interface CLIBuildOptions
  extends Pick<
    ESBuildOptions,
    'external' // External packages to not bundle
  > {
  /**
   * Output file path (CLI argument, not in config).
   * @default "./dist/walker.js" (web) or "./dist/bundle.mjs" (server)
   */
  output?: string;

  /**
   * Temporary directory for build artifacts.
   * @default ".tmp"
   */
  tempDir?: string;

  /**
   * Custom template file path.
   * @default undefined (uses platform-specific default)
   */
  template?: string;

  /**
   * Enable package caching.
   * @default true
   */
  cache?: boolean;

  /**
   * User code to include in bundle.
   */
  code?: string;
}

/**
 * Internal build options used by the bundler.
 *
 * @remarks
 * Combines CLI options with resolved esbuild settings.
 * This is populated after processing config and CLI arguments.
 */
export interface BuildOptions extends CLIBuildOptions {
  /**
   * Output file path (required for bundler).
   */
  output: string;

  /**
   * Packages to include in the bundle.
   */
  packages: Flow.Packages;

  /**
   * Output format.
   */
  format: 'esm' | 'iife' | 'cjs';

  /**
   * Target platform.
   */
  platform: 'browser' | 'node';

  /**
   * Enable minification.
   * @default true
   */
  minify?: boolean;

  /**
   * Enable source maps.
   * @default false
   */
  sourcemap?: boolean;

  /**
   * ECMAScript target version.
   */
  target?: string;

  /**
   * Minification options.
   */
  minifyOptions?: MinifyOptions;

  /**
   * Window property name for collector (web platform only).
   * @default "collector"
   */
  windowCollector?: string;

  /**
   * Window property name for elb function (web platform only).
   * @default "elb"
   */
  windowElb?: string;
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
   * @default true
   */
  identifiers?: boolean;

  /**
   * Minify syntax (shorten code).
   * @default true
   */
  syntax?: boolean;

  /**
   * Minify whitespace.
   * @default true
   */
  whitespace?: boolean;

  /**
   * Keep original function/class names.
   * @default false
   */
  keepNames?: boolean;

  /**
   * How to handle legal comments.
   * @default "none"
   */
  legalComments?: 'none' | 'inline' | 'eof' | 'linked' | 'external';
}

/**
 * CLI Environment Configuration.
 *
 * @remarks
 * Wraps Flow.Config with build options for a single environment.
 * This is CLI-specific and different from Flow.Setup.
 */
export interface EnvironmentConfig {
  /**
   * Flow configuration (runtime event processing).
   */
  flow: Flow.Config;

  /**
   * Build configuration (bundling options).
   */
  build: Partial<BuildOptions>;
}

/**
 * CLI Setup Configuration.
 *
 * @remarks
 * Multi-environment wrapper that contains multiple EnvironmentConfigs.
 * This is CLI-specific and different from Flow.Setup.
 *
 * @example
 * ```json
 * {
 *   "version": 1,
 *   "environments": {
 *     "production": { "flow": {...}, "build": {...} },
 *     "development": { "flow": {...}, "build": {...} }
 *   }
 * }
 * ```
 */
export interface Setup {
  /**
   * Schema version (always 1).
   */
  version: 1;

  /**
   * Environment configurations.
   */
  environments: Record<string, EnvironmentConfig>;
}
