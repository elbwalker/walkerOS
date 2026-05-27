/**
 * Runtime executor for pre-built walkerOS flows
 *
 * This module runs pre-built .mjs flow bundles without any build-time operations.
 * All bundling, package downloading, and code generation happens BEFORE this runs.
 */

import { resolve, dirname } from 'path';
import type { Collector, Logger, ObserverFn } from '@walkeros/core';
import type { HealthServer } from './health-server.js';
import { loadBundle } from './load-bundle.js';

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
  httpHandler?: (...args: unknown[]) => void;
}

/**
 * Load a pre-built flow bundle and return a handle for managing it.
 *
 * `observers` is the telemetry observer array built by `pipeline.ts`. The
 * generated bundle factory (see `generateServerEntry` in
 * `commands/bundle/bundler.ts`) installs each observer onto
 * `collector.observers` after `startFlow` returns.
 */
export async function loadFlow(
  file: string,
  config: RuntimeConfig | undefined,
  logger: Logger.Instance,
  loggerConfig?: Logger.Config,
  healthServer?: HealthServer,
  observers?: Array<ObserverFn>,
): Promise<FlowHandle> {
  const absolutePath = resolve(file);
  const flowDir = dirname(absolutePath);
  process.chdir(flowDir);

  const flowContext = {
    ...config,
    ...(loggerConfig ? { logger: loggerConfig } : {}),
    ...(healthServer ? { sourceSettings: { port: undefined } } : {}),
    ...(observers ? { observers } : {}),
  };

  const result = await loadBundle(absolutePath, flowContext, logger);

  // Mount flow's httpHandler onto runner's health server (opaque — no type inspection)
  if (healthServer && typeof result.httpHandler === 'function') {
    healthServer.setFlowHandler(result.httpHandler);
  }

  return {
    collector: {
      command: result.collector.command as FlowHandle['collector']['command'],
      status: result.collector.status as FlowHandle['collector']['status'],
    },
    file,
    httpHandler: result.httpHandler,
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
  healthServer?: HealthServer,
  observers?: Array<ObserverFn>,
): Promise<FlowHandle> {
  logger.info('Shutting down current flow for hot-swap...');

  // Detach old handler, health endpoints still work during swap
  if (healthServer) {
    healthServer.setFlowHandler(null);
  }

  // Delegate to collector's shutdown command (destroys sources, destinations, transformers)
  try {
    if (currentHandle.collector.command) {
      await currentHandle.collector.command('shutdown');
    }
  } catch (error) {
    logger.debug(`Shutdown warning: ${error}`);
  }

  // Load new flow, mounts new handler onto same server
  const newHandle = await loadFlow(
    newFile,
    config,
    logger,
    loggerConfig,
    healthServer,
    observers,
  );

  logger.info('Flow swapped successfully');
  return newHandle;
}
