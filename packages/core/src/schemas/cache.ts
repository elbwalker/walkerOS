import { z } from './validation';
import { MatchExpressionSchema } from './matcher';
import { ValueSchema } from './mapping';

// ========================================
// Cache Rule Schema
// ========================================

/**
 * CacheRule — a single caching rule for a pipeline step.
 *
 * Mirrors: types/cache.ts → CacheRule
 *
 * - match: MatchExpression or '*' wildcard
 * - key: array of dot-path strings used to build the cache key
 * - ttl: time-to-live in seconds (must be positive)
 * - update: optional record of response mutations applied on cache hit
 */
export const CacheRuleSchema = z.object({
  match: z
    .union([MatchExpressionSchema, z.literal('*')])
    .describe(
      'Match expression or wildcard to determine when this rule applies',
    ),
  key: z
    .array(z.string())
    .min(1)
    .describe('Dot-path fields used to build the cache key'),
  ttl: z
    .number()
    .positive()
    .describe('Time-to-live in seconds for cached entries'),
  update: z
    .record(z.string(), ValueSchema)
    .optional()
    .describe('Response mutations applied on cache hit (key → Value mapping)'),
});

// ========================================
// Cache Schema
// ========================================

/**
 * Cache — top-level cache configuration for a pipeline step.
 *
 * Mirrors: types/cache.ts → Cache
 *
 * - full: whether to cache the full response (default false)
 * - store: optional store ID for persistent caching ($store:storeId wiring)
 * - rules: at least one CacheRule is required
 */
export const CacheSchema = z.object({
  full: z
    .boolean()
    .optional()
    .describe('Cache the full response object (default: false)'),
  store: z
    .string()
    .optional()
    .describe(
      'Store ID for persistent caching (references a configured store)',
    ),
  rules: z
    .array(CacheRuleSchema)
    .min(1)
    .describe('Cache rules — at least one required'),
});
