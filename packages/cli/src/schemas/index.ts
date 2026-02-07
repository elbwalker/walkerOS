/**
 * CLI Schemas
 *
 * Zod schemas for CLI parameter validation.
 * Follows walkerOS patterns from @walkeros/core.
 */

export {
  RunModeSchema,
  PortSchema,
  FilePathSchema,
  type RunMode,
} from './primitives';

export { RunOptionsSchema, type RunOptions } from './run';

export {
  ValidationTypeSchema,
  ValidateOptionsSchema,
  ValidateInputShape,
  ValidateInputSchema,
  type ValidationType,
  type ValidateOptions,
  type ValidateInput,
} from './validate';

export {
  BundleOptionsSchema,
  BundleInputShape,
  BundleInputSchema,
  type BundleOptions,
  type BundleInput,
} from './bundle';

export {
  PlatformSchema,
  SimulateOptionsSchema,
  SimulateInputShape,
  SimulateInputSchema,
  type Platform,
  type SimulateOptions,
  type SimulateInput,
} from './simulate';
