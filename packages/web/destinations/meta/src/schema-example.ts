/**
 * EXAMPLE: Using Core Schema Builder (DRY approach)
 *
 * This demonstrates how to use the schema builder from @walkeros/core
 * WITHOUT needing Zod as a dependency in the destination package.
 *
 * Benefits:
 * - No Zod dependency needed
 * - Simple, declarative definitions
 * - DRY - core utility handles all schema logic
 * - Type-safe with TypeScript
 * - Much less code than hand-written JSON Schema
 *
 * Compare:
 * - Old approach: 92 lines of hand-written JSON Schema
 * - New approach: ~30 lines of declarative definitions
 */

import {
  createObjectSchema,
  createEnumSchema,
  type JSONSchema,
} from '@walkeros/core';

/**
 * Settings schema using schema builder
 *
 * Before (hand-written JSON Schema): 22 lines
 * After (schema builder): 11 lines
 */
export const settingsSchemaBuilt = createObjectSchema(
  {
    pixelId: {
      type: 'string',
      required: true,
      pattern: '^[0-9]+$',
      description: 'Your Meta (Facebook) Pixel ID',
      minLength: 1,
    },
  },
  'Meta Pixel Settings',
);

/**
 * Mapping schema using schema builder
 *
 * Before (hand-written JSON Schema): 76 lines
 * After (schema builder): ~20 lines
 */
export const mappingSchemaBuilt = createObjectSchema(
  {
    track: {
      type: 'string',
      description: 'Meta Pixel standard event name',
      enum: [
        'PageView',
        'AddPaymentInfo',
        'AddToCart',
        'AddToWishlist',
        'CompleteRegistration',
        'Contact',
        'CustomizeProduct',
        'Donate',
        'FindLocation',
        'InitiateCheckout',
        'Lead',
        'Purchase',
        'Schedule',
        'Search',
        'StartTrial',
        'SubmitApplication',
        'Subscribe',
        'ViewContent',
      ],
    },
    trackCustom: {
      type: 'string',
      description: 'Custom event name for trackCustom',
    },
  },
  'Meta Pixel Mapping',
);

/**
 * Alternative: Using createEnumSchema for cleaner code
 */
const metaStandardEvents = [
  'PageView',
  'AddPaymentInfo',
  'AddToCart',
  'AddToWishlist',
  'CompleteRegistration',
  'Contact',
  'CustomizeProduct',
  'Donate',
  'FindLocation',
  'InitiateCheckout',
  'Lead',
  'Purchase',
  'Schedule',
  'Search',
  'StartTrial',
  'SubmitApplication',
  'Subscribe',
  'ViewContent',
] as const;

export const mappingSchemaAlternative = createObjectSchema(
  {
    track: {
      ...(createEnumSchema(metaStandardEvents, 'string', {
        description: 'Meta Pixel standard event name',
      }) as Record<string, unknown>),
      type: 'string',
    },
    trackCustom: {
      type: 'string',
      description: 'Custom event name for trackCustom',
    },
  },
  'Meta Pixel Mapping',
);

/**
 * Usage in destination exports
 *
 * The destination would export these schemas alongside the destination code:
 *
 * ```typescript
 * // src/index.ts
 * export { destinationMeta } from './destination';
 * export { settingsSchemaBuilt as settingsSchema } from './schema-example';
 * export { mappingSchemaBuilt as mappingSchema } from './schema-example';
 * ```
 *
 * No Zod dependency needed in package.json!
 */

/**
 * Comparison
 *
 * Hand-written JSON Schema (schema.ts):
 * - Lines: 92
 * - Maintainability: Medium (verbose, easy to make mistakes)
 * - Dependencies: @rjsf/utils (types only)
 *
 * Schema Builder (schema-example.ts):
 * - Lines: ~30 (for actual schema definitions)
 * - Maintainability: High (declarative, type-safe)
 * - Dependencies: @walkeros/core (already required)
 *
 * Zod Approach (would have been):
 * - Lines: ~40-50
 * - Maintainability: High (type-safe, validation)
 * - Dependencies: zod, zod-to-json-schema (NEW dependencies per destination)
 *
 * Winner: Schema Builder! ✅
 * - Least code
 * - No extra dependencies
 * - DRY (core utility)
 * - Type-safe
 * - Easy to use
 */
