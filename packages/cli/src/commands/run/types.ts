/**
 * Run Command Types
 *
 * Types for running walkerOS flows via CLI using @walkeros/docker as a library
 */

import type { GlobalOptions } from '../../types';

/**
 * Run mode - determines which execution mode to use
 */
export type RunMode = 'collect' | 'serve';

/**
 * CLI command options for `walkeros run`
 */
export interface RunCommandOptions extends GlobalOptions {
  /** Flow configuration file path (.json or pre-built .mjs) */
  config: string;

  /** Server port (overrides flow config) */
  port?: number;

  /** Server host (default: 0.0.0.0) */
  host?: string;

  /** Serve path (URL directory path, e.g., 'libs/v1') */
  servePath?: string;

  /** Serve name (filename in URL, default: walker.js) */
  serveName?: string;

  /** Enable JSON output */
  json?: boolean;
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

  /** Serve path (URL directory path, e.g., 'libs/v1') */
  servePath?: string;

  /** Serve name (filename in URL, default: walker.js) */
  serveName?: string;

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
