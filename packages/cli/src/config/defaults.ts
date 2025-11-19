/**
 * Configuration Defaults
 *
 * Platform-specific default build options.
 */

import type { BuildOptions } from '../types/bundle';

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
  if (!buildOptions.output && !defaults.output) {
    throw new Error('BuildOptions.output is required');
  }

  return {
    ...defaults,
    ...buildOptions,
    code: buildOptions.code || defaults.code || '',
    output: buildOptions.output || defaults.output!,
    packages: buildOptions.packages || defaults.packages!,
  } as BuildOptions;
}
