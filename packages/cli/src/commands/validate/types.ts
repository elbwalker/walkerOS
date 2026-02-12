// walkerOS/packages/cli/src/commands/validate/types.ts

export type ValidationType = 'event' | 'flow' | 'mapping';

export interface ValidateCommandOptions {
  type: ValidationType;
  input?: string;
  output?: string;
  flow?: string; // Flow name for multi-flow configs
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
  type: ValidationType;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  details: Record<string, unknown>;
}
