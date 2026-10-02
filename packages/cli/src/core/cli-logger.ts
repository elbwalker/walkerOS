import chalk from 'chalk';
import {
  createCLILogger as createCoreCLILogger,
  createCLILoggerConfig as createCoreCLILoggerConfig,
  type CLILoggerColors,
  type CLILoggerOptions,
} from '@walkeros/core/node';
import type { Logger } from '@walkeros/core';

export type { CLILoggerOptions };

/**
 * The CLI's terminal colours. Binding them here matters: the shared factory in
 * `@walkeros/core/node` defaults every level to identity, so a plain re-export
 * would silently drop red ERROR output at every CLI call site.
 */
const CLI_COLORS: CLILoggerColors = { error: chalk.red };

/**
 * Build the `Logger.Config` backing the CLI logger, with the CLI's colours.
 * See `createCLILoggerConfig` in `@walkeros/core/node` for the handler contract.
 */
export function createCLILoggerConfig(
  options: CLILoggerOptions = {},
): Logger.Config {
  return createCoreCLILoggerConfig(options, CLI_COLORS);
}

/**
 * Create a core Logger.Instance with CLI-appropriate behavior.
 *
 * Behavior:
 * - ERROR: always shown (chalk red, via console.error) unless --json
 * - WARN: shown unless --silent or --json
 * - INFO: shown unless --silent or --json
 * - DEBUG: shown only with --verbose (and not --silent/--json)
 * - json(): shown unless --silent
 */
export function createCLILogger(
  options: CLILoggerOptions = {},
): Logger.Instance {
  return createCoreCLILogger(options, CLI_COLORS);
}
