/**
 * Simulate Command Schemas
 *
 * Zod schemas for simulate command parameter validation.
 */

import { z } from '@walkeros/core/dev';
import { FilePathSchema } from './primitives';

/**
 * Platform schema.
 *
 * @remarks
 * Validates platform type for event simulation.
 */
export const PlatformSchema = z
  .enum(['web', 'server'])
  .describe('Platform type for event processing');

export type Platform = z.infer<typeof PlatformSchema>;

/**
 * Simulate options schema.
 *
 * @remarks
 * Options for the programmatic simulate() API.
 */
export const SimulateOptionsSchema = z.object({
  silent: z.boolean().optional().describe('Suppress all output'),
  verbose: z.boolean().optional().describe('Enable verbose logging'),
  json: z.boolean().optional().describe('Format output as JSON'),
});

export type SimulateOptions = z.infer<typeof SimulateOptionsSchema>;

/**
 * Simulate input schema for MCP tools.
 *
 * @remarks
 * Full input schema including config path, event, and options.
 */
export const SimulateInputSchema = z.object({
  configPath: FilePathSchema.describe('Path to flow configuration file'),
  event: z.string().min(1).describe('Event as JSON string, file path, or URL'),
  flow: z.string().optional().describe('Flow name for multi-flow configs'),
  platform: PlatformSchema.optional().describe('Override platform detection'),
});

export type SimulateInput = z.infer<typeof SimulateInputSchema>;
