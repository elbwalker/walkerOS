import chalk from 'chalk';

export interface LoggerOptions {
  verbose?: boolean;
  silent?: boolean;
  json?: boolean;
}

export interface Logger {
  log: (color: string, message: string) => void;
  info: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;
  gray: (message: string) => void;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const { verbose = false, silent = false, json = false } = options;

  const shouldLog = !silent && !json;
  const shouldDebug = verbose && !silent && !json;

  return {
    log: (color: string, message: string) => {
      if (shouldLog) {
        console.log(chalk[color as keyof typeof chalk]?.(message) || message);
      }
    },

    info: (message: string) => {
      if (shouldLog) {
        console.log(chalk.blue(message));
      }
    },

    success: (message: string) => {
      if (shouldLog) {
        console.log(chalk.green(message));
      }
    },

    warning: (message: string) => {
      if (shouldLog) {
        console.log(chalk.yellow(message));
      }
    },

    error: (message: string) => {
      if (!json) {
        console.error(chalk.red(message));
      }
    },

    debug: (message: string) => {
      if (shouldDebug) {
        console.log(chalk.gray(message));
      }
    },

    gray: (message: string) => {
      if (shouldLog) {
        console.log(chalk.gray(message));
      }
    },
  };
}
