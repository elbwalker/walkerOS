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

const CacheRuleSchema = z
  .object({
    match: z
      .union([MatchExpressionSchema, z.literal('*')])
      .describe('Match expression or "*" to match all events'),
    key: z
      .array(z.string())
      .describe('Event property paths used to build the cache key'),
    ttl: z
      .number()
      .positive()
      .describe('Time-to-live in seconds for cached entries'),
    headers: z
      .record(z.string(), z.string())
      .optional()
      .describe('HTTP response headers to include with cached responses'),
  })
  .describe(
    'Cache rule: defines which events to cache, key composition, and TTL',
  );

/**
 * Cache transformer settings schema.
 *
 * Mirrors: types.ts CacheSettings
 */
export const SettingsSchema = z
  .object({
    maxSize: z
      .number()
      .positive()
      .optional()
      .describe('Maximum cache size in bytes. Default: 10MB'),
    rules: z
      .array(CacheRuleSchema)
      .describe('Cache rules evaluated in order. First matching rule wins.'),
  })
  .describe(
    'Cache transformer: caches event responses by match rules with TTL',
  );

export type Settings = z.infer<typeof SettingsSchema>;
