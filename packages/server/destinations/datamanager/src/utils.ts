export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

/* eslint-disable no-console */
export function createLogger(level: LogLevel = 'none') {
  const levels = { debug: 0, info: 1, warn: 2, error: 3, none: 4 };
  const currentLevel = levels[level];

  return {
    debug: (message: string, data?: unknown) => {
      if (currentLevel <= 0)
        console.log(`[DataManager] ${message}`, data || '');
    },
    info: (message: string, data?: unknown) => {
      if (currentLevel <= 1)
        console.log(`[DataManager] ${message}`, data || '');
    },
    warn: (message: string, data?: unknown) => {
      if (currentLevel <= 2)
        console.warn(`[DataManager] ${message}`, data || '');
    },
    error: (message: string, data?: unknown) => {
      if (currentLevel <= 3)
        console.error(`[DataManager] ${message}`, data || '');
    },
  };
}
/* eslint-enable no-console */
