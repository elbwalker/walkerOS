/**
 * Run Command Types
 *
 * Types for orchestrating Docker containers via CLI
 */

/**
 * Run mode - determines which Docker mode to execute
 */
export type RunMode = 'collect' | 'serve';

/**
 * CLI command options for `walkeros run`
 */
export interface RunCommandOptions {
  /** Flow configuration file path */
  config: string;

  /** Server port (overrides flow config) */
  port?: number;

  /** Server host (default: 0.0.0.0) */
  host?: string;

  /** Enable verbose output */
  verbose?: boolean;

  /** Run container in background (detached) */
  detach?: boolean;

  /** Container name */
  name?: string;

  /** Skip Docker image pull */
  noPull?: boolean;

  /** Docker image to use (default: walkeros/docker:latest) */
  image?: string;

  /** Enable JSON output */
  json?: boolean;
}

/**
 * Programmatic run options (subset of CLI options)
 */
export interface RunOptions {
  /** Flow configuration file path or config object */
  config: string | unknown;

  /** Server port */
  port?: number;

  /** Server host */
  host?: string;

  /** Run in detached mode */
  detach?: boolean;

  /** Container name */
  name?: string;

  /** Skip image pull */
  noPull?: boolean;

  /** Docker image to use */
  image?: string;

  /** Suppress output */
  silent?: boolean;

  /** Verbose logging */
  verbose?: boolean;
}

/**
 * Internal configuration for building Docker run arguments
 */
export interface DockerRunConfig {
  /** Run mode */
  mode: RunMode;

  /** Absolute path to flow file */
  flowFile: string;

  /** Server port */
  port?: number;

  /** Server host */
  host?: string;

  /** Run in detached mode */
  detach?: boolean;

  /** Container name */
  name?: string;

  /** Docker image */
  image: string;
}

/**
 * Result from running a Docker container
 */
export interface RunResult {
  /** Whether the container ran successfully */
  success: boolean;

  /** Container exit code */
  exitCode: number;

  /** Container ID (for detached mode) */
  containerId?: string;

  /** Error message if failed */
  error?: string;

  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Docker availability check result
 */
export interface DockerCheckResult {
  /** Docker is installed */
  installed: boolean;

  /** Docker daemon is running */
  running: boolean;

  /** Error message if checks failed */
  error?: string;
}
