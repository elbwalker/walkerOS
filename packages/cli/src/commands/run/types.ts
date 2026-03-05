/**
 * Run Command Types
 *
 * Types for running walkerOS flows via CLI using local runtime
 */

/**
 * CLI command options for `walkeros run`
 */
export interface RunCommandOptions {
  /** Flow configuration file path (.json or pre-built .mjs) */
  config: string;

  /** Server port (overrides flow config) */
  port?: number;

  /** Server host (default: 0.0.0.0) */
  host?: string;

  /** Enable JSON output */
  json?: boolean;

  /** Verbose logging */
  verbose?: boolean;

  /** Suppress output */
  silent?: boolean;

  /** Deployment slug (enables heartbeat to walkerOS app) */
  deployment?: string;

  /** Project ID (used with --deploy) */
  project?: string;

  /** Public URL of this server (used with --deploy) */
  url?: string;

  /** Health check endpoint path (used with --deploy, default: /health) */
  healthEndpoint?: string;

  /** Heartbeat interval in seconds (used with --deploy, default: 60) */
  heartbeatInterval?: number;
}

/**
 * Programmatic run options (subset of CLI options)
 */
export interface RunOptions {
  /** Flow configuration file path (.json or pre-built .mjs) */
  config: string | unknown;

  /** Server port */
  port?: number;

  /** Server host */
  host?: string;

  /** Suppress output */
  silent?: boolean;

  /** Verbose logging */
  verbose?: boolean;
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
