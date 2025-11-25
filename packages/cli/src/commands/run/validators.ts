/**
 * Run Command Validators
 *
 * Validation logic for run command inputs
 */

import { existsSync } from 'fs';
import { resolveAsset } from '../../core/asset-resolver.js';
import type { RunMode } from './types.js';

/**
 * Valid run modes
 */
const VALID_MODES: RunMode[] = ['collect', 'serve'];

/**
 * Validates run mode
 *
 * @param mode - Mode to validate
 * @throws Error if mode is invalid
 */
export function validateMode(mode: string): asserts mode is RunMode {
  if (!VALID_MODES.includes(mode as RunMode)) {
    throw new Error(
      `Invalid mode: "${mode}"\n` +
        `   Valid modes: ${VALID_MODES.join(', ')}\n` +
        `   Example: walkeros run collect ./flow.json`,
    );
  }
}

/**
 * Validates flow file exists
 *
 * @param filePath - Path to flow configuration file (bare name, relative, or absolute)
 * @returns Absolute path to flow file
 * @throws Error if file doesn't exist
 */
export function validateFlowFile(filePath: string): string {
  // Use asset resolver to handle bare names, relative paths, and absolute paths
  const absolutePath = resolveAsset(filePath, 'bundle');

  if (!existsSync(absolutePath)) {
    throw new Error(
      `Flow file not found: ${filePath}\n` +
        `   Resolved path: ${absolutePath}\n` +
        `   Make sure the file exists and the path is correct`,
    );
  }

  return absolutePath;
}

/**
 * Validates port number
 *
 * @param port - Port number to validate
 * @throws Error if port is invalid
 */
export function validatePort(port: number): void {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid port: ${port}\n` +
        `   Port must be an integer between 1 and 65535\n` +
        `   Example: --port 8080`,
    );
  }
}
