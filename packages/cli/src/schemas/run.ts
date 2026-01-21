/**
 * Run Command Schemas
 *
 * Zod schemas for run command options validation.
 */

import { z } from '@walkeros/core/dev';
import { RunModeSchema, PortSchema, FilePathSchema } from './primitives';

/**
 * Run command options schema.
 *
 * @remarks
 * Validates all options for the `walkeros run` command.
 */
export const RunOptionsSchema = z.object({
  mode: RunModeSchema,
  flow: FilePathSchema,
  port: PortSchema.default(8080),
  flowName: z.string().optional().describe('Specific flow name to run'),
});

export type RunOptions = z.infer<typeof RunOptionsSchema>;
