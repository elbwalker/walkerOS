/* eslint-disable no-console */
import chalk from 'chalk';

export interface LoggerOptions {
  verbose?: boolean;
  silent?: boolean;
  json?: boolean;
}

export interface Logger {
  log: (color: string, ...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  success: (...args: unknown[]) => void;
  warning: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  gray: (...args: unknown[]) => void;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const { verbose = false, silent = false, json = false } = options;

  const shouldLog = !silent && !json;
  const shouldDebug = verbose && !silent && !json;

  return {
    log: (color: string, ...args: unknown[]) => {
      if (shouldLog) {
        const message = args.map((arg) => String(arg)).join(' ');
        // Map color names to chalk functions
        const colorMap: Record<string, (text: string) => string> = {
          red: chalk.red,
          green: chalk.green,
          blue: chalk.blue,
          yellow: chalk.yellow,
          gray: chalk.gray,
          grey: chalk.gray,
          cyan: chalk.cyan,
          magenta: chalk.magenta,
          white: chalk.white,
          black: chalk.black,
        };
        const colorFn = colorMap[color];
        const coloredMessage = colorFn ? colorFn(message) : message;
        console.log(coloredMessage);
      }
    },

    info: (...args: unknown[]) => {
      if (shouldLog) {
        const message = args.map((arg) => String(arg)).join(' ');
        console.log(chalk.blue(message));
      }
    },

    success: (...args: unknown[]) => {
      if (shouldLog) {
        const message = args.map((arg) => String(arg)).join(' ');
        console.log(chalk.green(message));
      }
    },

    warning: (...args: unknown[]) => {
      if (shouldLog) {
        const message = args.map((arg) => String(arg)).join(' ');
        console.log(chalk.yellow(message));
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
        console.log(chalk.gray(message));
      }
    },

    gray: (...args: unknown[]) => {
      if (shouldLog) {
        const message = args.map((arg) => String(arg)).join(' ');
        console.log(chalk.gray(message));
      }
    },
  };
}
