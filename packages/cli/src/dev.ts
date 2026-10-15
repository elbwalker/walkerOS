/**
 * CLI Development Exports
 *
 * Schemas and utilities for building tools on top of @walkeros/cli.
 * Use this entry point when you need Zod schemas for validation.
 * Also the two helpers the MCP's flow_examples needs: resolveExportName and
 * selectDevExamples.
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
export { resolveExportName } from './core/resolve-export-name.js';
export { selectDevExamples } from './commands/push/dev-examples.js';
