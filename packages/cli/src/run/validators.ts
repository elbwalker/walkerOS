/**
 * Run Command Validators
 *
 * Validation logic for run command inputs
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import type { RunMode } from './types';

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
 * @param filePath - Path to flow configuration file
 * @returns Absolute path to flow file
 * @throws Error if file doesn't exist
 */
export function validateFlowFile(filePath: string): string {
  const absolutePath = resolve(filePath);

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

/**
 * Validates container name
 *
 * @param name - Container name to validate
 * @throws Error if name is invalid
 */
export function validateContainerName(name: string): void {
  // Docker container name rules:
  // - Only [a-zA-Z0-9][a-zA-Z0-9_.-]
  // - Must start with alphanumeric
  const validNamePattern = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

  if (!validNamePattern.test(name)) {
    throw new Error(
      `Invalid container name: "${name}"\n` +
        `   Container names must:\n` +
        `   - Start with a letter or number\n` +
        `   - Contain only letters, numbers, underscores, periods, and hyphens\n` +
        `   Example: --name walkeros-collector`,
    );
  }
}
