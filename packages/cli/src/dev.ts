/**
 * CLI Development Exports
 *
 * Schemas and utilities for building tools on top of @walkeros/cli.
 * Use this entry point when you need Zod schemas for validation.
 * Also the helpers the MCP's flow_examples needs: resolveStepPackage and
 * readStepPackageInfo (which source a step's package comes from, and its
 * walkerOS.json there), resolveExportName and selectDevExamples.
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
export {
  resolveStepPackage,
  type ResolvedStepPackage,
} from './core/step-packages.js';
export {
  readStepPackageInfo,
  type StepPackageInfo,
} from './core/package-info.js';
