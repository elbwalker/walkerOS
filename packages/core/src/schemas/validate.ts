import type { IntelliSenseContext } from './intellisense';

export interface ValidationIssue {
  message: string;
  severity: 'error' | 'warning';
  path?: string;
  /** A stable code for checks shared with `validateFlowStructure`. */
  code?: string;
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

export { validateFlowConfig } from './validate-flow-config';
