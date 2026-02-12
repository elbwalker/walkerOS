/**
 * Push Command Schemas
 *
 * Zod schemas for push command parameter validation.
 */

import { z } from '@walkeros/core/dev';
import { FilePathSchema } from './primitives';
import { PlatformSchema } from './simulate';

/**
 * Push options schema.
 *
 * @remarks
 * Options for the programmatic push() API.
 */
export const PushOptionsSchema = z.object({
  silent: z.boolean().optional().describe('Suppress all output'),
  verbose: z.boolean().optional().describe('Enable verbose logging'),
  json: z.boolean().optional().describe('Format output as JSON'),
});

export type PushOptions = z.infer<typeof PushOptionsSchema>;

/**
 * Raw shape for MCP SDK compatibility (ZodRawShapeCompat).
 *
 * @remarks
 * MCP SDK's registerTool expects raw shapes (Record<string, ZodType>)
 * rather than ZodObject instances. Define shape first, then wrap.
 */
export const PushInputShape = {
  configPath: FilePathSchema.describe('Path to flow configuration file'),
  event: z.string().min(1).describe('Event as JSON string, file path, or URL'),
  flow: z.string().optional().describe('Flow name for multi-flow configs'),
  platform: PlatformSchema.optional().describe('Override platform detection'),
};

/**
 * Push input schema for MCP tools.
 *
 * @remarks
 * Full input schema including config path, event, and options.
 */
export const PushInputSchema = z.object(PushInputShape);

export type PushInput = z.infer<typeof PushInputSchema>;
