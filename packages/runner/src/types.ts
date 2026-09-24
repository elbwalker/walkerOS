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

  /** Enable JSON output */
  json?: boolean;

  /** Verbose logging */
  verbose?: boolean;

  /** Suppress output */
  silent?: boolean;
}
