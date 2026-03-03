/**
 * Runtime executor for pre-built walkerOS flows
 *
 * This module runs pre-built .mjs flow bundles without any build-time operations.
 * All bundling, package downloading, and code generation happens BEFORE this runs.
 */

import { pathToFileURL } from 'url';
import { resolve, dirname } from 'path';
import type { Collector, Logger } from '@walkeros/core';

export interface RuntimeConfig {
  port?: number;
  host?: string;
}

export interface FlowHandle {
  collector: {
    command?: (cmd: string) => Promise<void>;
    status?: Collector.Status;
  };
  file: string;
}

/**
 * Load a pre-built flow bundle and return a handle for managing it.
 */
export async function loadFlow(
  file: string,
  config: RuntimeConfig | undefined,
  logger: Logger.Instance,
  loggerConfig?: Logger.Config,
): Promise<FlowHandle> {
  const absolutePath = resolve(file);
  const flowDir = dirname(absolutePath);
  process.chdir(flowDir);

  if (config?.port !== undefined) {
    process.env.PORT = String(config.port);
  }

  const fileUrl = pathToFileURL(absolutePath).href;

  // Bust Node.js module cache by appending query param
  const module = await import(`${fileUrl}?t=${Date.now()}`);

  if (!module.default || typeof module.default !== 'function') {
    throw new Error(
      `Invalid flow bundle: ${file} must export a default function`,
    );
  }

  const flowContext = loggerConfig
    ? { ...config, logger: loggerConfig }
    : config;
  const result = await module.default(flowContext);

  if (!result || !result.collector) {
    throw new Error(`Invalid flow bundle: ${file} must return { collector }`);
  }

  return {
    collector: {
      command: result.collector.command,
      status: result.collector.status,
    },
    file,
  };
}

/**
 * Swap the running flow to a new bundle. Shuts down old flow FIRST to release
 * the port, then loads the new bundle. Brief downtime is acceptable for Mode C.
 */
export async function swapFlow(
  currentHandle: FlowHandle,
  newFile: string,
  config: RuntimeConfig | undefined,
  logger: Logger.Instance,
  loggerConfig?: Logger.Config,
): Promise<FlowHandle> {
  logger.info('Shutting down current flow for hot-swap...');

  // Delegate to collector's shutdown command (destroys sources, destinations, transformers)
  try {
    if (currentHandle.collector.command) {
      await currentHandle.collector.command('shutdown');
    }
  } catch (error) {
    logger.debug(`Shutdown warning: ${error}`);
  }

  // Now load new flow — port is free
  const newHandle = await loadFlow(newFile, config, logger, loggerConfig);

  logger.info('Flow swapped successfully');
  return newHandle;
}

/**
 * Run a pre-built flow bundle (legacy API — kept for backward compatibility)
 *
 * @param file - Absolute path to pre-built .mjs flow file
 * @param config - Optional runtime configuration
 * @param logger - Logger instance for output
 * @param loggerConfig - Optional logger config to forward to the flow's collector
 */
export async function runFlow(
  file: string,
  config: RuntimeConfig | undefined,
  logger: Logger.Instance,
  loggerConfig?: Logger.Config,
): Promise<void> {
  logger.info(`Loading flow from ${file}`);

  try {
    const handle = await loadFlow(file, config, logger, loggerConfig);

    logger.info('Flow running');
    if (config?.port) {
      logger.info(`Port: ${config.port}`);
    }

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      // Hard safety valve — force exit if shutdown takes too long
      const forceTimer = setTimeout(() => {
        logger.error('Shutdown timed out, forcing exit');
        process.exit(1);
      }, 15000);

      try {
        if (handle.collector.command) {
          await handle.collector.command('shutdown');
        }
        logger.info('Shutdown complete');
        clearTimeout(forceTimer);
        process.exit(0);
      } catch (error) {
        clearTimeout(forceTimer);
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
