/**
 * Run Command Types
 *
 * Types for running walkerOS flows via CLI or Docker.
 */

/**
 * CLI command options for `walkeros run`
 */
export interface RunCommandOptions {
  /** Flow configuration file path (.json or pre-built .mjs) */
  config?: string;

  /** Server port (overrides flow config) */
  port?: number;

  /** Flow name for multi-flow configs */
  flow?: string;

  /** API flow ID (enables heartbeat, polling, secrets) */
  flowId?: string;

  /** Deployment ID (for heartbeat tracking) */
  deploymentId?: string;

  /** Project ID */
  project?: string;

  /** Enable JSON output */
  json?: boolean;

  /** Verbose logging */
  verbose?: boolean;

  /** Suppress output */
  silent?: boolean;
}

/**
 * Programmatic run options
 */
export interface RunOptions {
  /** Flow configuration file path (.json or pre-built .mjs) */
  config?: string;

  /** Server port */
  port?: number;

  /** Flow name for multi-flow configs */
  flow?: string;

  /** API flow ID (enables heartbeat, polling, secrets) */
  flowId?: string;

  /** Project ID */
  project?: string;

  /** Verbose logging */
  verbose?: boolean;

  /** Suppress output */
  silent?: boolean;
}

/**
 * Result from running a flow
 */
export interface RunResult {
  /** Whether the flow ran successfully */
  success: boolean;

  /** Exit code */
  exitCode: number;

  /** Error message if failed */
  error?: string;

  /** Execution duration in milliseconds */
  duration: number;
}
