// walkerOS/packages/cli/src/commands/validate/types.ts

import type { ValidationType } from '@walkeros/core/dev';

// Result types are declared in @walkeros/core/dev beside
// validateFlowStructure, so consumers can type its return without the CLI.
export type {
  ValidateResult,
  ValidateResultType,
  ValidationType,
  ValidationError,
  ValidationWarning,
} from '@walkeros/core/dev';

export interface ValidateCommandOptions {
  type: ValidationType;
  input?: string;
  output?: string;
  flow?: string; // Flow name for multi-flow configs
  path?: string; // Entry path for dot-notation validation (e.g., "destinations.snowplow")
  json?: boolean;
  verbose?: boolean;
  strict?: boolean;
  silent?: boolean;
}
