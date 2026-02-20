/**
 * Run Command Utilities
 *
 * Shared utilities for the run command
 */

import path from 'path';
import fs from 'fs-extra';
import { bundle } from '../bundle/index.js';
import { getTmpPath } from '../../core/index.js';

/**
 * Prepares a JSON config file for execution by bundling it to a temporary location.
 *
 * Creates bundle in os.tmpdir() (e.g. /tmp) by default.
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
  // Create temp directory in os.tmpdir()
  const tempDir = getTmpPath(
    undefined,
    `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );
  await fs.ensureDir(tempDir);

  // Generate output path in temp directory
  const tempPath = path.join(tempDir, 'bundle.mjs');

  // Bundle with proper output override
  await bundle(configPath, {
    cache: true,
    verbose: options.verbose,
    silent: options.silent,
    buildOverrides: {
      output: tempPath,
      format: 'esm',
      platform: 'node',
    },
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
