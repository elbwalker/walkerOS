/**
 * Run Command Validators
 *
 * Validation logic for run command inputs.
 * Uses Zod schemas for type-safe validation.
 */

import { existsSync } from 'fs';
import { resolveAsset } from '../../core/asset-resolver.js';
import {
  RunModeSchema,
  PortSchema,
  type RunMode,
} from '../../schemas/index.js';

/**
 * Validates run mode using Zod schema.
 *
 * @param mode - Mode to validate
 * @throws Error if mode is invalid
 */
export function validateMode(mode: string): asserts mode is RunMode {
  const result = RunModeSchema.safeParse(mode);
  if (!result.success) {
    throw new Error(
      `Invalid mode: "${mode}"\n` +
        `   Valid modes: collect, serve\n` +
        `   Example: walkeros run collect ./flow.json`,
    );
  }
}

/**
 * Validates flow file exists.
 *
 * @remarks
 * File existence cannot be validated by Zod, so this remains a custom check.
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
 * Validates port number using Zod schema.
 *
 * @param port - Port number to validate
 * @throws Error if port is invalid
 */
export function validatePort(port: number): void {
  const result = PortSchema.safeParse(port);
  if (!result.success) {
    throw new Error(
      `Invalid port: ${port}\n` +
        `   Port must be an integer between 1 and 65535\n` +
        `   Example: --port 8080`,
    );
  }
}
