/**
 * Validate Command Schemas
 *
 * Zod schemas for validate command parameter validation.
 */

import { z } from '@walkeros/core/dev';

/**
 * Validation type schema.
 *
 * @remarks
 * Validates the type of validation to perform.
 * - `event`: Validate a walkerOS event object
 * - `flow`: Validate a flow configuration file
 * - `mapping`: Validate mapping rules
 */
export const ValidationTypeSchema = z
  .enum(['event', 'flow', 'mapping'])
  .describe('Type of validation to perform');

export type ValidationType = z.infer<typeof ValidationTypeSchema>;

/**
 * Validate options schema.
 *
 * @remarks
 * Options for the programmatic validate() API.
 */
export const ValidateOptionsSchema = z.object({
  flow: z.string().optional().describe('Flow name for multi-flow configs'),
});

export type ValidateOptions = z.infer<typeof ValidateOptionsSchema>;

/**
 * Raw shape for MCP SDK compatibility (ZodRawShapeCompat).
 *
 * @remarks
 * MCP SDK's registerTool expects raw shapes (Record<string, ZodType>)
 * rather than ZodObject instances. Define shape first, then wrap.
 */
export const ValidateInputShape = {
  type: ValidationTypeSchema,
  input: z
    .string()
    .min(1)
    .describe('JSON string, file path, or URL to validate'),
  flow: z.string().optional().describe('Flow name for multi-flow configs'),
};

/**
 * Validate input schema for MCP tools.
 *
 * @remarks
 * Full input schema including type and input source.
 */
export const ValidateInputSchema = z.object(ValidateInputShape);

export type ValidateInput = z.infer<typeof ValidateInputSchema>;
