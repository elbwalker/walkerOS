import { z } from 'zod';

// CLI tool output shapes
export const ValidateOutputShape = {
  valid: z.boolean().describe('Whether validation passed'),
  type: z
    .union([
      z.enum(['contract', 'event', 'flow', 'mapping']),
      z.string().regex(/^(destinations|sources|transformers)\.\w+$/),
    ])
    .describe('What was validated'),
  errors: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
        value: z.unknown().optional(),
        code: z.string().optional(),
      }),
    )
    .describe('Validation errors'),
  warnings: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
        suggestion: z.string().optional(),
      }),
    )
    .describe('Validation warnings'),
  details: z
    .record(z.string(), z.unknown())
    .describe('Additional validation details'),
};

export const BundleOutputShape = {
  success: z.boolean().describe('Whether bundling succeeded'),
  totalSize: z.number().optional().describe('Total bundle size in bytes'),
  buildTime: z.number().optional().describe('Build time in milliseconds'),
  packages: z
    .array(
      z.object({
        name: z.string(),
        size: z.number(),
      }),
    )
    .optional()
    .describe('Per-package size breakdown'),
  treeshakingEffective: z
    .boolean()
    .optional()
    .describe('Whether tree-shaking was effective'),
  message: z.string().optional().describe('Status message'),
};

export const SimulateOutputShape = {
  success: z.boolean().describe('Whether simulation succeeded'),
  error: z.string().optional().describe('Error message if simulation failed'),
  collector: z
    .unknown()
    .optional()
    .describe('Collector state after simulation'),
  elbResult: z.unknown().optional().describe('Push result from the collector'),
  logs: z.array(z.unknown()).optional().describe('Log entries from simulation'),
  usage: z
    .record(z.string(), z.array(z.unknown()))
    .optional()
    .describe('API call usage per destination'),
  duration: z
    .number()
    .optional()
    .describe('Simulation duration in milliseconds'),
};

export const PushOutputShape = {
  success: z.boolean().describe('Whether push succeeded'),
  elbResult: z.unknown().optional().describe('Push result from the collector'),
  duration: z.number().describe('Push duration in milliseconds'),
  error: z.string().optional().describe('Error message if push failed'),
};

// Examples List output shape
export const ExamplesListOutputShape = {
  flow: z.string().describe('Flow name'),
  count: z.number().describe('Number of examples found'),
  examples: z
    .array(
      z.object({
        step: z.string().describe('Step location (e.g., "destination.gtag")'),
        stepType: z
          .enum(['source', 'transformer', 'destination'])
          .describe('Step type'),
        stepName: z.string().describe('Step name'),
        exampleName: z.string().describe('Example name'),
        hasIn: z.boolean().describe('Whether the example has an input value'),
        hasOut: z.boolean().describe('Whether the example has an output value'),
        hasMapping: z
          .boolean()
          .describe('Whether the example has a mapping configuration'),
        in: z.unknown().optional().describe('Input event data'),
        out: z.unknown().optional().describe('Expected output data'),
        mapping: z
          .unknown()
          .optional()
          .describe('Mapping configuration for destinations'),
      }),
    )
    .describe('Step examples'),
};

// Package Search output shape (lightweight metadata)
export const PackageSearchOutputShape = {
  package: z.string().describe('Package name'),
  version: z.string().describe('Package version'),
  description: z.string().optional().describe('Package description'),
  type: z
    .string()
    .optional()
    .describe('Package type (destination, source, transformer)'),
  platform: z.string().optional().describe('Target platform (web, server)'),
};

// Package Schema output shape (full details)
export const PackageSchemaOutputShape = {
  package: z.string().describe('Package name'),
  version: z.string().describe('Package version'),
  type: z.string().describe('Package type (destination, source, transformer)'),
  platform: z.string().describe('Target platform (web, server)'),
  schemas: z
    .record(z.string(), z.unknown())
    .describe('JSON Schemas for settings and mapping'),
  examples: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Configuration examples'),
  hints: z
    .record(
      z.string(),
      z.object({
        text: z.string(),
        code: z
          .array(
            z.object({
              lang: z.string().optional(),
              code: z.string(),
            }),
          )
          .optional(),
      }),
    )
    .optional()
    .describe('Lightweight actionable hints for AI consumption'),
};
