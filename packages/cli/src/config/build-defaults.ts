/**
 * Static Build Defaults
 *
 * Platform-specific build defaults for CLI bundling.
 * Build options are CLI concerns, separate from Flow configuration.
 */

import type { BuildOptions } from '../types/bundle.js';

/**
 * Build defaults for web platform (browser bundles).
 *
 * @remarks
 * These settings produce browser-compatible IIFE bundles.
 */
export const WEB_BUILD_DEFAULTS: Omit<BuildOptions, 'output' | 'packages'> = {
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  template: 'web.hbs',
  minify: true,
  sourcemap: false,
  cache: true,
  tempDir: '.tmp',
  windowCollector: 'collector',
  windowElb: 'elb',
};

/**
 * Build defaults for server platform (Node.js bundles).
 *
 * @remarks
 * These settings produce Node.js-compatible ESM bundles.
 */
export const SERVER_BUILD_DEFAULTS: Omit<BuildOptions, 'output' | 'packages'> =
  {
    format: 'esm',
    platform: 'node',
    target: 'node20',
    template: 'server.hbs',
    minify: true,
    sourcemap: false,
    cache: true,
    tempDir: '.tmp',
  };

/**
 * Default output paths by platform.
 */
export const DEFAULT_OUTPUT_PATHS = {
  web: './dist/walker.js',
  server: './dist/bundle.mjs',
} as const;

/**
 * Get build defaults for a platform.
 *
 * @param platform - Target platform ('web' or 'server')
 * @returns Platform-specific build defaults
 *
 * @example
 * ```typescript
 * const defaults = getBuildDefaults('web');
 * // { format: 'iife', platform: 'browser', ... }
 * ```
 */
export function getBuildDefaults(
  platform: 'web' | 'server',
): Omit<BuildOptions, 'output' | 'packages'> {
  return platform === 'web' ? WEB_BUILD_DEFAULTS : SERVER_BUILD_DEFAULTS;
}

/**
 * Get default output path for a platform.
 *
 * @param platform - Target platform ('web' or 'server')
 * @returns Default output file path
 */
export function getDefaultOutput(platform: 'web' | 'server'): string {
  return DEFAULT_OUTPUT_PATHS[platform];
}
