/* eslint-disable no-console */
import chalk from 'chalk';
import type { GlobalOptions } from '../types/global.js';

export const BRAND_COLOR = '#01b5e2';

export interface LoggerOptions {
  verbose?: boolean;
  silent?: boolean;
  json?: boolean;
  stderr?: boolean;
}

export interface Logger {
  log: (...args: unknown[]) => void;
  brand: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  json: (data: unknown) => void;
  // Backward-compatible methods (map to default terminal color per design)
  info: (...args: unknown[]) => void;
  success: (...args: unknown[]) => void;
  warning: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  gray: (...args: unknown[]) => void;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const {
    verbose = false,
    silent = false,
    json = false,
    stderr = false,
  } = options;

  const shouldLog = !silent && !json;
  const shouldDebug = verbose && !silent && !json;
  const out = stderr ? console.error : console.log;

  return {
    log: (...args: unknown[]) => {
      if (shouldLog) {
        const message = args.map((arg) => String(arg)).join(' ');
        out(message);
      }
    },

    brand: (...args: unknown[]) => {
      if (shouldLog) {
        const message = args.map((arg) => String(arg)).join(' ');
        out(chalk.hex(BRAND_COLOR)(message));
      }
    },

    error: (...args: unknown[]) => {
      if (!json) {
        const message = args.map((arg) => String(arg)).join(' ');
        console.error(chalk.red(message));
      }
    },

    debug: (...args: unknown[]) => {
      if (shouldDebug) {
        const message = args.map((arg) => String(arg)).join(' ');
        out(`  ${message}`);
      }
    },

    json: (data: unknown) => {
      if (!silent) {
        out(JSON.stringify(data, null, 2));
      }
    },

    // Backward-compatible methods (all use default terminal color per design)
    info: (...args: unknown[]) => {
      if (shouldLog) {
        const message = args.map((arg) => String(arg)).join(' ');
        out(message);
      }
    },

    success: (...args: unknown[]) => {
      if (shouldLog) {
        const message = args.map((arg) => String(arg)).join(' ');
        out(message);
      }
    },

    warning: (...args: unknown[]) => {
      if (shouldLog) {
        const message = args.map((arg) => String(arg)).join(' ');
        out(message);
      }
    },

    warn: (...args: unknown[]) => {
      if (shouldLog) {
        const message = args.map((arg) => String(arg)).join(' ');
        out(message);
      }
    },

    gray: (...args: unknown[]) => {
      if (shouldLog) {
        const message = args.map((arg) => String(arg)).join(' ');
        out(message);
      }
    },
  };
}

/**
 * Create logger from command options
 * Factory function that standardizes logger creation across commands
 *
 * @param options - Command options containing verbose, silent, and json flags
 * @returns Configured logger instance
 */
export function createCommandLogger(
  options: GlobalOptions & { json?: boolean; stderr?: boolean },
): Logger {
  return createLogger({
    verbose: options.verbose,
    silent: options.silent ?? false,
    json: options.json,
    stderr: options.stderr,
  });
}
