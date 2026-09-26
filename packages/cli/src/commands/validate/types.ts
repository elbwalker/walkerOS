// walkerOS/packages/cli/src/commands/validate/types.ts

import type {
  ValidateResult as CoreValidateResult,
  ValidationError as CoreValidationError,
  ValidationType,
  ValidationWarning as CoreValidationWarning,
} from '@walkeros/core/dev';

// Base result types are declared in @walkeros/core/dev beside
// validateFlowStructure, so consumers can type its return without the CLI.
// The CLI narrows them: every code comes from VALIDATE_CODES, and the
// details carry the scope, skips and deferred values of the run.
export type { ValidateResultType, ValidationType } from '@walkeros/core/dev';

/**
 * Every code an error, warning or skip of `validate` can carry. Agents and
 * tests branch on these, never on message text.
 */
export const VALIDATE_CODES = [
  // Input and options
  'INPUT_ERROR',
  'SERIALIZATION_ERROR',
  'OPTION_NOT_APPLICABLE',
  // Scope (--flow, --path)
  'FLOW_NOT_FOUND',
  'ENTRY_NOT_FOUND',
  'AMBIGUOUS_ENTRY',
  'UNSUPPORTED_SECTION',
  'INVALID_PATH',
  // Flow file
  'SCHEMA_VALIDATION',
  'CONFIG_WARNING',
  'EMPTY_FLOWS',
  'UNKNOWN_KEY',
  'CONFLICT',
  'MISSING_PACKAGE',
  'OBSOLETE_CODE_STRING',
  'INVALID_IMPORT',
  'INVALID_CODE_SHAPE',
  'PACKAGE_VERSION_MISSING',
  'DEPRECATED_PACKAGE',
  'UNKNOWN_ROUTE_TARGET',
  'ROUTE_DEAD_CODE',
  'ROUTE_EMPTY_MANY',
  'ROUTE_SINGLE_MANY',
  'ROUTE_FIRST_MATCH',
  'INCOMPATIBLE_EXAMPLES',
  'EXAMPLES_INCOMPLETE',
  'CONTRACT_VIOLATION',
  'MAPPING_DOT_KEY',
  'FLOW_REF_WARNING',
  'FLOW_CYCLE',
  // Entry settings against the package schema
  'ENTRY_SCHEMA',
  // Contract
  'INVALID_CONTRACT',
  'FLAT_CONTRACT_SHAPE',
  'INVALID_CONTRACT_ENTRY',
  'UNKNOWN_CONTRACT_KEY',
  'INVALID_TAGGING',
  'INVALID_SCHEMA',
  'INVALID_EXTENDS',
  'INVALID_SECTION',
  'INVALID_EVENTS',
  'CIRCULAR_EXTENDS',
  'INVALID_ENTITY_KEY',
  'INVALID_ENTITY',
  'INVALID_ACTION_KEY',
  'INVALID_SCHEMA_ENTRY',
  // Event
  'NOT_AN_OBJECT',
  'MISSING_EVENT_NAME',
  'EMPTY_EVENT_NAME',
  'INVALID_EVENT_NAME',
  // Mapping
  'INVALID_MAPPING_TYPE',
  'INVALID_EVENT_PATTERN',
  'INVALID_RULE_TYPE',
  'CATCH_ALL_NOT_LAST',
  // Skips (details.skipped[].code)
  'GATED_BY_ERRORS',
  'NO_PACKAGE',
  'NO_SETTINGS_SCHEMA',
  'SCHEMA_UNAVAILABLE',
] as const;

export type ValidateCode = (typeof VALIDATE_CODES)[number];

/** Codes that mean validate could not run as asked (CLI exit 3). */
export const USAGE_CODES: readonly ValidateCode[] = ['OPTION_NOT_APPLICABLE'];

/**
 * Named checks a run includes (`details.scope.checks`). `file:` checks run
 * on the whole file whatever `--flow` says; `flow:` checks run per flow in
 * scope; `entry:` checks run per entry `--path` addressed.
 */
export type ValidateCheck =
  | 'file:schema'
  | 'flow:schema'
  | 'flow:steps'
  | 'flow:package-versions'
  | 'flow:routes'
  | 'flow:examples'
  | 'flow:contract-examples'
  | 'flow:mapping-keys'
  | 'flow:flow-refs'
  | 'entry:settings'
  | 'contract'
  | 'event'
  | 'mapping';

export interface ValidateScopeEntry {
  /** Section of the addressed entry, when the path or the match names one. */
  section?: string;
  key: string;
  /** Flows that have the entry and were checked. */
  flows: string[];
  /** Flows searched for the entry. */
  searchedFlows: string[];
}

/** What a run covered (C6). */
export interface ValidateScope {
  flows: string[];
  entry?: ValidateScopeEntry;
  checks: ValidateCheck[];
}

/** A check the scope includes that did not run (C5). */
export interface ValidateSkip {
  path: string;
  check: ValidateCheck;
  reason: string;
  code: ValidateCode;
}

/** A value known only at runtime, not schema-checked (info, not a skip). */
export interface ValidateDeferred {
  path: string;
  reference: string;
}

export interface ValidateDetails {
  scope?: ValidateScope;
  skipped?: ValidateSkip[];
  deferred?: ValidateDeferred[];
  [key: string]: unknown;
}

// `code` stays core's `string` for consumers; validate emits only
// ValidateCode values.
export interface ValidationError extends CoreValidationError {
  /** The JSON Schema keyword of an ENTRY_SCHEMA error. */
  keyword?: string;
}

export interface ValidationWarning extends CoreValidationWarning {
  keyword?: string;
}

export interface ValidateResult extends CoreValidateResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  details: ValidateDetails;
}

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
