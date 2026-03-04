/* eslint-disable no-console */
import chalk from 'chalk';
import { createLogger, Level } from '@walkeros/core';
import type { Logger } from '@walkeros/core';

export interface CLILoggerOptions {
  verbose?: boolean;
  silent?: boolean;
  json?: boolean;
  stderr?: boolean;
}

/**
 * Create a core Logger.Instance with CLI-appropriate behavior.
 *
 * Replaces the old CLI logger, adaptLogger, and createCollectorLoggerConfig.
 * One factory, one logger type, DRY.
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
  const {
    verbose = false,
    silent = false,
    json = false,
    stderr = false,
  } = options;
  const out = stderr ? console.error : console.log;

  return createLogger({
    // Let handler control visibility — pass everything through
    level: Level.DEBUG,
    handler: (level, message, _context, scope) => {
      // Build formatted message
      const scopePath = scope.length > 0 ? `[${scope.join(':')}] ` : '';
      const fullMessage = `${scopePath}${message}`;

      // ERROR: always shown unless json mode
      if (level === Level.ERROR) {
        if (!json) console.error(chalk.red(fullMessage));
        return;
      }

      // Non-errors suppressed in silent or json mode
      if (silent || json) return;

      // DEBUG: only with verbose
      if (level === Level.DEBUG) {
        if (!verbose) return;
        out(`  ${fullMessage}`);
        return;
      }

      // WARN / INFO: normal output
      out(fullMessage);
    },
    jsonHandler: (data) => {
      if (!silent) out(JSON.stringify(data, null, 2));
    },
  });
}
