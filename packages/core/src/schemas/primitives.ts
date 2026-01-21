import { z } from './validation';

/**
 * Primitive Schema Definitions
 *
 * Reusable primitive schemas following DRY principle.
 * These are the building blocks used throughout all schemas to ensure consistency.
 *
 * Benefits:
 * - Single source of truth for common patterns
 * - Consistent descriptions across all schemas
 * - Easier maintenance and updates
 * - Better IntelliSense/autocomplete
 */

// ========================================
// Basic Primitives
// ========================================

/**
 * Required string field
 * Used for required text fields throughout schemas
 */
export const RequiredString = z.string();

/**
 * Required number field
 * Used for required numeric fields throughout schemas
 */
export const RequiredNumber = z.number();

/**
 * Required boolean field
 * Used for required flag fields throughout schemas
 */
export const RequiredBoolean = z.boolean();

// ========================================
// Semantic Primitives
// ========================================

/**
 * Identifier - Required unique string identifier
 * Used for entity IDs, session IDs, etc.
 */
export const Identifier = z.string().min(1);

/**
 * Timestamp - Unix timestamp in milliseconds
 * Used for event timestamps, session timestamps, etc.
 */
export const Timestamp = z.number().int().positive();

/**
 * Counter - Sequential counter (non-negative integer)
 * Used for event counts, session counts, etc.
 */
export const Counter = z.number().int().nonnegative();

/**
 * TaggingVersion - Version number for event tagging
 * Standardized description used in both Version and Config schemas
 */
export const TaggingVersion = z.number().describe('Tagging version number');

// ========================================
// Primitive Value Unions
// ========================================

/**
 * PrimitiveValue - Basic primitive types
 * Union of string, number, and boolean
 * Used in Property definitions and value transformations
 */
export const PrimitiveValue = z.union([z.string(), z.number(), z.boolean()]);

/**
 * OptionalPrimitiveValue - Optional primitive value
 */
export const OptionalPrimitiveValue = PrimitiveValue.optional();
