/**
 * Runtime executor for pre-built walkerOS flows
 *
 * This module runs pre-built .mjs flow bundles without any build-time operations.
 * All bundling, package downloading, and code generation happens BEFORE this runs.
 */

import { pathToFileURL } from 'url';
import { resolve, dirname } from 'path';
import type { Logger } from '@walkeros/core';

export interface RuntimeConfig {
  port?: number;
  host?: string;
}

/**
 * Run a pre-built flow bundle
 *
 * @param file - Absolute path to pre-built .mjs flow file
 * @param config - Optional runtime configuration
 * @param logger - Logger instance for output
 */
export async function runFlow(
  file: string,
  config: RuntimeConfig | undefined,
  logger: Logger.Instance,
): Promise<void> {
  logger.info(`Loading flow from ${file}`);

  try {
    const absolutePath = resolve(file);
    const flowDir = dirname(absolutePath);

    // Change working directory to flow's directory
    // This ensures relative paths (e.g., ./shared/credentials.json) work
    // consistently in both local and Docker execution modes
    process.chdir(flowDir);

    const fileUrl = pathToFileURL(absolutePath).href;
    const module = await import(fileUrl);

    if (!module.default || typeof module.default !== 'function') {
      logger.throw(
        `Invalid flow bundle: ${file} must export a default function`,
      );
    }

    // Execute the flow's factory function
    const result = await module.default(config);

    if (!result || !result.collector) {
      logger.throw(`Invalid flow bundle: ${file} must return { collector }`);
    }

    const { collector } = result;

    logger.info('Flow running');
    if (config?.port) {
      logger.info(`Port: ${config.port}`);
    }

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        // Use collector's shutdown command if available
        if (collector.command) {
          await collector.command('shutdown');
        }
        logger.info('Shutdown complete');
        process.exit(0);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error during shutdown: ${message}`);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to run flow: ${message}`);
    if (error instanceof Error && error.stack) {
      logger.debug('Stack trace:', { stack: error.stack });
    }
    throw error;
  }
}
