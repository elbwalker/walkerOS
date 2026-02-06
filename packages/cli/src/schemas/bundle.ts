/**
 * Bundle Command Schemas
 *
 * Zod schemas for bundle command parameter validation.
 */

import { z } from '@walkeros/core/dev';
import { FilePathSchema } from './primitives';

/**
 * Bundle options schema.
 *
 * @remarks
 * Options for the programmatic bundle() API.
 */
export const BundleOptionsSchema = z.object({
  silent: z.boolean().optional().describe('Suppress all output'),
  verbose: z.boolean().optional().describe('Enable verbose logging'),
  stats: z
    .boolean()
    .optional()
    .default(true)
    .describe('Return bundle statistics'),
  cache: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable package caching'),
  flowName: z.string().optional().describe('Flow name for multi-flow configs'),
});

export type BundleOptions = z.infer<typeof BundleOptionsSchema>;

/**
 * Raw shape for MCP SDK compatibility (ZodRawShapeCompat).
 *
 * @remarks
 * MCP SDK's registerTool expects raw shapes (Record<string, ZodType>)
 * rather than ZodObject instances. Define shape first, then wrap.
 */
export const BundleInputShape = {
  configPath: FilePathSchema.describe(
    'Path to flow configuration file (JSON or JavaScript)',
  ),
  flow: z.string().optional().describe('Flow name for multi-flow configs'),
  stats: z
    .boolean()
    .optional()
    .default(true)
    .describe('Return bundle statistics'),
  output: z
    .string()
    .optional()
    .describe('Output file path (defaults to config-defined)'),
};

/**
 * Bundle input schema for MCP tools.
 *
 * @remarks
 * Full input schema including config path and options.
 */
export const BundleInputSchema = z.object(BundleInputShape);

export type BundleInput = z.infer<typeof BundleInputSchema>;
