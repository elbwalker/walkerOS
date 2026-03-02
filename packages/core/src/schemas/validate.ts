import type { IntelliSenseContext } from './intellisense';

export interface ValidationIssue {
  message: string;
  severity: 'error' | 'warning';
  path?: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  context?: Partial<IntelliSenseContext>;
}

export { validateFlowSetup } from './validate-flow-setup';
