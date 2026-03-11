import { z } from '@walkeros/core/dev';

const MatchConditionSchema = z.object({
  key: z.string().describe('Property path to match against'),
  operator: z
    .enum(['eq', 'contains', 'prefix', 'suffix', 'regex', 'gt', 'lt', 'exists'])
    .describe('Match operator'),
  value: z.string().describe('Value to compare against'),
  not: z.boolean().optional().describe('Negate the condition'),
});

const MatchExpressionSchema: z.ZodType = z.union([
  MatchConditionSchema,
  z.object({ and: z.array(z.lazy(() => MatchExpressionSchema)) }),
  z.object({ or: z.array(z.lazy(() => MatchExpressionSchema)) }),
]);

const RouteSchema = z
  .object({
    match: z
      .union([MatchExpressionSchema, z.literal('*')])
      .describe('Match expression or "*" as catch-all route'),
    next: z
      .union([z.string(), z.array(z.string())])
      .describe('Next transformer(s) in the chain for matched events'),
  })
  .describe(
    'Route: directs events to different transformer chains based on match criteria',
  );

/**
 * Router transformer settings schema.
 *
 * Mirrors: types.ts RouterSettings
 */
export const SettingsSchema = z
  .object({
    routes: z
      .array(RouteSchema)
      .optional()
      .describe('Routing rules evaluated in order. First matching route wins.'),
  })
  .describe(
    'Router transformer: routes events to different transformer chains based on match rules',
  );

export type Settings = z.infer<typeof SettingsSchema>;
