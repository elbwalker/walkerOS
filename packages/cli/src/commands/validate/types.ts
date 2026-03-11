// walkerOS/packages/cli/src/commands/validate/types.ts

export type ValidationType = 'contract' | 'event' | 'flow' | 'mapping';

export type ValidateResultType = ValidationType | 'entry';

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

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
  code?: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

export interface ValidateResult {
  valid: boolean;
  type: ValidateResultType;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  details: Record<string, unknown>;
}
