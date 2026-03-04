import { createLogger, Level, type Logger } from '@walkeros/core';
import type { RuntimeConfig } from '../../runtime/index.js';
import { runFlow } from '../../runtime/index.js';

// Create logger for local execution - DEBUG level when VERBOSE, otherwise INFO
const logLevel = process.env.VERBOSE === 'true' ? Level.DEBUG : Level.INFO;
const loggerConfig: Logger.Config = { level: logLevel };
const logger = createLogger(loggerConfig);

/**
 * Execute run command locally
 *
 * @param mode - Run mode (collect)
 * @param flowPath - Path to flow bundle
 * @param options - Runtime options
 */
export async function executeRunLocal(
  mode: 'collect',
  flowPath: string | null,
  options: {
    port?: number;
    host?: string;
  },
): Promise<void> {
  if (!flowPath) {
    throw new Error('Flow path is required for collect mode');
  }
  const config: RuntimeConfig = {
    port: options.port,
    host: options.host,
  };
  await runFlow(flowPath, config, logger.scope('runner'), loggerConfig);
}
