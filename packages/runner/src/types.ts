/**
 * Start Command Types
 *
 * Types for running prebuilt walkerOS flow artifacts via `runneros start`.
 */

/**
 * CLI command options for `runneros start`
 */
export interface RunCommandOptions {
  /** Prebuilt flow artifact: a path, an http(s) URL, or a .tar.gz archive */
  config?: string;

  /** Server port (overrides flow config) */
  port?: number;

  /** API flow ID (enables heartbeat and secrets) */
  flowId?: string;

  /** Deployment ID (for heartbeat tracking) */
  deploymentId?: string;

  /** Project ID */
  project?: string;

  /** Opt-in dotenv file to load into process.env before config resolution */
  envFile?: string;

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
  /** Prebuilt flow artifact: a path, an http(s) URL, or a .tar.gz archive */
  config?: string;

  /** Server port */
  port?: number;

  /** API flow ID (enables heartbeat and secrets) */
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
