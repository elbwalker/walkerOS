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
 * - `contract`: Validate a data contract
 * - `event`: Validate a walkerOS event object
 * - `flow`: Validate a flow configuration file
 * - `mapping`: Validate mapping rules
 */
export const ValidationTypeSchema = z
  .enum(['contract', 'event', 'flow', 'mapping'])
  .describe('Validation type: "event", "flow", "mapping", or "contract"');

export type ValidationType = z.infer<typeof ValidationTypeSchema>;

/**
 * Validate options schema.
 *
 * @remarks
 * Options for the programmatic validate() API.
 */
export const ValidateOptionsSchema = z.object({
  flow: z.string().optional().describe('Flow name for multi-flow configs'),
  path: z
    .string()
    .optional()
    .describe(
      'Entry path for package schema validation (e.g., "destinations.snowplow", "stores.cache"). Checks the entry in every flow that has it, or only in --flow.',
    ),
  strict: z
    .boolean()
    .optional()
    .describe(
      'Escalate: strict turns warnings and skips into failures (valid is false), contract disagreements error',
    ),
  offline: z
    .boolean()
    .optional()
    .describe(
      'Do not fetch package schemas: step settings are not checked against them, and the result scope says so. Only with type "flow" and no path.',
    ),
  configDir: z
    .string()
    .optional()
    .describe(
      "Directory local `path` packages resolve against. Defaults to the input file's directory; set it when passing a parsed document.",
    ),
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
  path: z
    .string()
    .optional()
    .describe(
      'Entry path for package schema validation (e.g., "destinations.snowplow"). Only with type "flow": validates the entry against its package JSON Schema in every flow that has it, or only in the given flow.',
    ),
  strict: z
    .boolean()
    .optional()
    .describe(
      'Escalate: strict turns warnings and skips into failures: valid is false (the CLI exits 2), and contract example disagreements become errors. Every check runs with or without it.',
    ),
  offline: z
    .boolean()
    .optional()
    .describe(
      'Do not fetch package schemas: step settings are not checked against them, and details.scope says so. Only with type "flow" and no path.',
    ),
};

/**
 * Validate input schema for MCP tools.
 *
 * @remarks
 * Full input schema including type and input source.
 */
export const ValidateInputSchema = z.object(ValidateInputShape);

export type ValidateInput = z.infer<typeof ValidateInputSchema>;
