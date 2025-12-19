/**
 * Global CLI Options
 *
 * Options that apply to all commands.
 */

/**
 * Global options available across all CLI commands
 */
export interface GlobalOptions {
  /**
   * Show detailed execution logs
   * @default false
   */
  verbose?: boolean;

  /**
   * Suppress all output except errors
   * @default false
   */
  silent?: boolean;

  /**
   * Preview command without executing
   * @default false
   */
  dryRun?: boolean;
}

/**
 * Check if output should be shown based on global options
 */
export function shouldShowOutput(options: GlobalOptions): boolean {
  return !options.silent;
}

/**
 * Check if verbose output should be shown
 */
export function isVerbose(options: GlobalOptions): boolean {
  return options.verbose === true;
}

/**
 * Check if this is a dry run
 */
export function isDryRun(options: GlobalOptions): boolean {
  return options.dryRun === true;
}
