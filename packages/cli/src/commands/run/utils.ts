/**
 * Run Command Utilities
 *
 * Shared utilities for the run command
 */

import path from 'path';
import os from 'os';
import { loadJsonConfig } from '../../config/index.js';
import { bundle } from '../bundle/index.js';

/**
 * Prepares a JSON config file for execution by bundling it to a temporary location
 *
 * @param configPath - Path to the JSON configuration file
 * @param options - Bundle options
 * @param options.verbose - Enable verbose logging
 * @param options.silent - Suppress output
 * @returns Path to the bundled output file
 */
export async function prepareBundleForRun(
  configPath: string,
  options: {
    verbose?: boolean;
    silent?: boolean;
  },
): Promise<string> {
  // Load JSON config
  const rawConfig = await loadJsonConfig(configPath);

  // Generate unique temp path
  const tempPath = path.join(
    os.tmpdir(),
    `walkeros-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.mjs`,
  );

  // Extract existing build config if present
  const existingBuild =
    typeof rawConfig === 'object' &&
    rawConfig !== null &&
    'build' in rawConfig &&
    typeof (rawConfig as Record<string, unknown>).build === 'object'
      ? ((rawConfig as Record<string, unknown>).build as Record<
          string,
          unknown
        >)
      : {};

  // Create config with temp output path
  const configWithOutput = {
    ...(rawConfig as Record<string, unknown>),
    build: {
      ...existingBuild,
      output: tempPath,
    },
  };

  // Bundle the config
  await bundle(configWithOutput, {
    cache: true,
    verbose: options.verbose,
    silent: options.silent,
  });

  return tempPath;
}

/**
 * Checks if a config file is pre-built or needs bundling
 *
 * @param configPath - Path to configuration file
 * @returns True if file is pre-built (js/mjs/cjs), false if needs bundling (json)
 */
export function isPreBuiltConfig(configPath: string): boolean {
  return (
    configPath.endsWith('.mjs') ||
    configPath.endsWith('.js') ||
    configPath.endsWith('.cjs')
  );
}
