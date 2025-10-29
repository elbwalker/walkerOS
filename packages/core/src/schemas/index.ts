/**
 * walkerOS Core Schemas
 *
 * Zod schemas for runtime validation and TypeScript type inference.
 * These schemas serve as the single source of truth for walkerOS types.
 *
 * Export both Zod schemas (for validation) and JSON Schemas (for RJSF/Explorer).
 */

export * from './value-config';

/**
 * Schema Builder - DRY utility for destinations
 *
 * Destinations can use these utilities to create JSON Schemas WITHOUT
 * needing Zod as a dependency. The core package handles all schema logic.
 *
 * This follows the DRY principle - write once in core, use everywhere.
 */
export * from './schema-builder';
