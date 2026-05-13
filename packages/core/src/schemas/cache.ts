import { z } from './validation';
import { MatchExpressionSchema } from './matcher';
import { ValueSchema } from './mapping';

// ========================================
// Event Cache Rule Schema
// ========================================

/**
 * EventCacheRule — a single caching rule for an event-context pipeline step
 * (sources, transformers, destinations).
 *
 * Mirrors: types/cache.ts → EventCacheRule
 *
 * - match: MatchExpression — omit for always-match.
 * - key: array of dot-path strings used to compose the cache key from event fields.
 * - ttl: time-to-live in seconds (positive).
 * - update: optional record of response mutations applied on cache hit.
 */
export const EventCacheRuleSchema = z
  .object({
    match: MatchExpressionSchema.optional().describe(
      'Optional match expression — omit for always-match.',
    ),
    key: z
      .array(z.string())
      .min(1)
      .describe('Dot-path fields used to build the cache key'),
    ttl: z.number().positive().describe('Time-to-live in seconds'),
    update: z
      .record(z.string(), ValueSchema)
      .optional()
      .describe(
        'Response mutations applied on cache hit (key → Value mapping)',
      ),
  })
  .meta({
    id: 'EventCacheRule',
    title: 'EventCache.Rule',
    description:
      'Single event-cache rule: when it applies (match), what event fields it keys off, TTL, and optional response mutations on hit.',
  });

// ========================================
// Event Cache Schema
// ========================================

/**
 * EventCache — top-level cache configuration for an event-context pipeline step.
 *
 * Mirrors: types/cache.ts → Cache<EventCacheRule>
 */
export const EventCacheSchema = z
  .object({
    stop: z
      .boolean()
      .optional()
      .describe(
        'Stop the chain on cache HIT (default: false). When true, skip remaining steps and return cached value.',
      ),
    store: z
      .string()
      .optional()
      .describe(
        'Store ID for persistent caching (references a configured store)',
      ),
    namespace: z
      .string()
      .optional()
      .describe(
        'Optional key prefix. Omit to write keys directly to the store. Same store + same key + same namespace = same cache entry.',
      ),
    rules: z
      .array(EventCacheRuleSchema)
      .min(1)
      .describe('Cache rules — at least one required'),
  })
  .meta({
    id: 'EventCacheConfig',
    title: 'EventCache.Config',
    description:
      'Top-level cache configuration for an event-context pipeline step (source / transformer / destination).',
  });

// ========================================
// Store Cache Rule Schema
// ========================================

/**
 * StoreCacheRule — a single caching rule applied at the store boundary.
 *
 * Mirrors: types/cache.ts → StoreCacheRule
 *
 * The caller (store wrapper) provides the cache key, so `key` is not allowed
 * here. There is no event to mutate, so `update` is rejected.
 *
 * - match: optional MatchExpression evaluated against `{ key, value? }`.
 * - ttl: time-to-live in seconds (positive).
 *
 * `.strict()` rejects unknown keys so footguns surface at validation time.
 */
export const StoreCacheRuleSchema = z
  .strictObject({
    match: MatchExpressionSchema.optional().describe(
      'Optional match expression evaluated against `{ key, value? }`. Omit for always-match.',
    ),
    ttl: z.number().positive().describe('Time-to-live in seconds'),
  })
  .meta({
    id: 'StoreCacheRule',
    title: 'StoreCache.Rule',
    description:
      'Single store-cache rule: optional match against `{ key, value? }` and a TTL. No `key` (caller provides it) and no `update` (no event to mutate).',
  });

// ========================================
// Store Cache Schema
// ========================================

/**
 * StoreCache — top-level cache configuration for a store wrapper.
 *
 * Mirrors: types/cache.ts → Cache<StoreCacheRule>
 *
 * Differences from EventCache:
 * - No `stop` field (read-through always falls through on miss).
 * - `namespace` rejects `""` (empty namespace collapses keys across stores
 *   sharing `__cache` and re-introduces collisions).
 * - Rules use StoreCacheRuleSchema (no `key`, no `update`).
 */
export const StoreCacheSchema = z
  .strictObject({
    store: z
      .string()
      .optional()
      .describe(
        'Store ID for persistent caching (references a configured store)',
      ),
    namespace: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional key prefix. Omit to default to the host store id. Empty string is rejected.',
      ),
    rules: z
      .array(StoreCacheRuleSchema)
      .min(1)
      .describe('Cache rules — at least one required'),
  })
  .meta({
    id: 'StoreCacheConfig',
    title: 'StoreCache.Config',
    description:
      'Top-level cache configuration for a store wrapper. No `stop` (always falls through on miss); namespace defaults to the host store id.',
  });

// ========================================
// Backwards-compatible aliases (deprecated)
// ========================================

/**
 * @deprecated Use {@link EventCacheRuleSchema}. Kept for one cycle to avoid
 * breaking external callers.
 */
export const CacheRuleSchema = EventCacheRuleSchema;

/**
 * @deprecated Use {@link EventCacheSchema}. Kept for one cycle to avoid
 * breaking external callers.
 */
export const CacheSchema = EventCacheSchema;
