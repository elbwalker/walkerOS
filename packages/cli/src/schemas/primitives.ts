/**
 * CLI Primitive Schemas
 *
 * Basic Zod schemas for CLI parameter validation.
 * Follows walkerOS patterns from @walkeros/core.
 */

import { z } from '@walkeros/core/dev';

/**
 * Run mode schema.
 *
 * @remarks
 * Validates CLI run mode for the `run` command.
 * - `collect`: Run as event collector
 * - `serve`: Run as HTTP server
 */
export const RunModeSchema = z
  .enum(['collect', 'serve'])
  .describe('CLI run mode: collect events or serve HTTP');

export type RunMode = z.infer<typeof RunModeSchema>;

/**
 * Port number schema.
 *
 * @remarks
 * Validates HTTP server port number.
 * Must be integer between 1-65535.
 */
export const PortSchema = z
  .number()
  .int('Port must be an integer')
  .min(1, 'Port must be at least 1')
  .max(65535, 'Port must be at most 65535')
  .describe('HTTP server port number');

/**
 * File path schema.
 *
 * @remarks
 * Basic string validation for file paths.
 * File existence is checked separately (Zod can't check filesystem).
 */
export const FilePathSchema = z
  .string()
  .min(1, 'File path cannot be empty')
  .describe('Path to configuration file');
