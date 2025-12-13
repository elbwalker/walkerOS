import { createLogger, Level } from '@walkeros/core';
import type { RuntimeConfig, ServeConfig } from '@walkeros/docker';
import { runFlow, runServeMode } from '@walkeros/docker';

// Create logger for local execution - DEBUG level when VERBOSE, otherwise INFO
const logLevel = process.env.VERBOSE === 'true' ? Level.DEBUG : Level.INFO;
const logger = createLogger({ level: logLevel });

/**
 * Execute run command locally
 *
 * @param mode - Run mode (collect | serve)
 * @param flowPath - Path to flow bundle (required for collect, optional for serve)
 * @param options - Runtime options
 */
export async function executeRunLocal(
  mode: 'collect' | 'serve',
  flowPath: string | null,
  options: {
    port?: number;
    host?: string;
    serveName?: string;
    servePath?: string;
  },
): Promise<void> {
  switch (mode) {
    case 'collect': {
      if (!flowPath) {
        throw new Error('Flow path is required for collect mode');
      }
      const config: RuntimeConfig = {
        port: options.port,
        host: options.host,
      };
      await runFlow(flowPath, config, logger.scope('runner'));
      break;
    }

    case 'serve': {
      const config: ServeConfig = {
        port: options.port,
        host: options.host,
        serveName: options.serveName,
        servePath: options.servePath,
        file: flowPath || undefined,
      };
      await runServeMode(config, logger.scope('serve'));
      break;
    }

    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
}
