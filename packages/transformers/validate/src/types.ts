import type { Flow } from '@walkeros/core';

/**
 * A single source of validation constraints.
 *
 * Either a resolved `$contract.*` rule (a `Flow.ContractRule` with `.events`
 * entity-action schemas and/or a full-event `.schema`), or an inline whole-event
 * JSON Schema applied to the entire event.
 */
export type ContractSource = Flow.ContractRule | Record<string, unknown>;

/**
 * Where the validation verdict and the issue list are written.
 *
 * `isValid` is a dot-path on the EVENT. Defaults to `source.valid`: putting the
 * boolean verdict under `event.source` keeps it type-clean, since
 * `WalkerOS.Source extends WalkerOS.Properties` accepts a boolean value, and it
 * travels with the event to downstream destinations as analytics-grade data.
 *
 * `errors` is a dot-path on the INGEST (pipeline scratch). Defaults to
 * `validation`: the issue list is observer-visible diagnostics, never analytics
 * data, so it stays off the event and on the mutable ingest context where other
 * steps and observers can read it.
 */
export interface ValidateOutput {
  /** Event dot-path for the boolean verdict. Default `source.valid`. Empty string = skip. */
  isValid?: string;
  /** Ingest dot-path for the issue list. Default `validation`. Empty string = skip. */
  errors?: string;
}

/**
 * Validate transformer settings.
 *
 * Defaults:
 * - `mode`: `pass` (annotate and continue; never drops the event).
 * - `output.isValid`: `source.valid` (verdict written to the EVENT).
 * - `output.errors`: `validation` (issues written to the INGEST, relative root).
 */
export interface ValidateSettings {
  /** Validation constraints. Each entry is AND-ed; all errors are aggregated. */
  contract?: ContractSource[];
  /** Also validate that the event is a valid `WalkerOS.PartialEvent`: the canonical event structure with all fields optional, so `format` checks shape and field types, not presence. Required-field enforcement is the contract arm's job. */
  format?: boolean;
  /** `strict` drops invalid events (chain-stop); `pass` annotates and continues. Default `pass`. */
  mode?: 'strict' | 'pass';
  /** Where the verdict and issue list are written. */
  output?: ValidateOutput;
}

/** A single validation issue. */
export interface ValidationIssue {
  path: string;
  message: string;
  level?: 'error' | 'warn';
}

/** Aggregate validation result. */
export interface ValidateResult {
  isValid: boolean;
  errors: ValidationIssue[];
}
