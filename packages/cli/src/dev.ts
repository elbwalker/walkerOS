/**
 * CLI Development Exports
 *
 * Schemas and utilities for building tools on top of @walkeros/cli.
 * Use this entry point when you need Zod schemas for validation.
 *
 * @example
 * ```typescript
 * import { schemas } from '@walkeros/cli/dev';
 *
 * // Access schemas
 * const result = schemas.ValidateInputSchema.parse(input);
 * ```
 */

export * as schemas from './schemas';
