/**
 * Runtime executor for pre-built walkerOS flows
 *
 * This module runs pre-built .mjs flow bundles without any build-time operations.
 * All bundling, package downloading, and code generation happens BEFORE this runs.
 */

import { resolve, dirname } from 'path';
import type {
  Collector,
  Logger,
  ObserverFn,
  TelemetryLevel,
} from '@walkeros/core';
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
 * `observers` is the telemetry observer array built by `pipeline.ts`;
 * `observeLevel` is the matching level supplier. The generated bundle factory
 * (see `generateServerEntry` in `commands/bundle/bundler.ts`) installs each
 * observer onto `collector.observers` and the supplier onto
 * `collector.observeLevel` after `startFlow` returns.
 */
/**
 * Load a bundle into a `FlowHandle` WITHOUT mounting its handler onto the
 * health server. This is the atomic-swap primitive: `swapFlow` loads the new
 * bundle into a detached handle first, and only mounts it once the load
 * succeeded, so a failed load never leaves the server handler-less.
 */
async function loadFlowHandle(
  file: string,
  config: RuntimeConfig | undefined,
  logger: Logger.Instance,
  loggerConfig?: Logger.Config,
  healthServer?: HealthServer,
  observers?: Array<ObserverFn>,
  observeLevel?: () => TelemetryLevel,
): Promise<FlowHandle> {
  const absolutePath = resolve(file);
  const flowDir = dirname(absolutePath);
  process.chdir(flowDir);

  const flowContext = {
    ...config,
    ...(loggerConfig ? { logger: loggerConfig } : {}),
    ...(healthServer ? { sourceSettings: { port: undefined } } : {}),
    ...(observers ? { observers } : {}),
    ...(observeLevel ? { observeLevel } : {}),
  };

  const result = await loadBundle(absolutePath, flowContext, logger);

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
 * Signature of the bundle loader `swapFlow` uses to produce a fresh, unmounted
 * handle. Defaults to `loadFlowHandle`; injectable so tests can drive the
 * success/failure paths without a real on-disk bundle.
 */
export type FlowLoader = (
  file: string,
  config: RuntimeConfig | undefined,
  logger: Logger.Instance,
  loggerConfig?: Logger.Config,
  healthServer?: HealthServer,
  observers?: Array<ObserverFn>,
  observeLevel?: () => TelemetryLevel,
) => Promise<FlowHandle>;

export async function loadFlow(
  file: string,
  config: RuntimeConfig | undefined,
  logger: Logger.Instance,
  loggerConfig?: Logger.Config,
  healthServer?: HealthServer,
  observers?: Array<ObserverFn>,
  observeLevel?: () => TelemetryLevel,
): Promise<FlowHandle> {
  const handle = await loadFlowHandle(
    file,
    config,
    logger,
    loggerConfig,
    healthServer,
    observers,
    observeLevel,
  );

  // Mount flow's httpHandler onto runner's health server (opaque — no type inspection)
  if (healthServer && typeof handle.httpHandler === 'function') {
    healthServer.setFlowHandler(handle.httpHandler);
  }

  return handle;
}

/**
 * Atomically swap the running flow to a new bundle with rollback.
 *
 * Load-then-swap (not shut-then-load): the new bundle is loaded into a fresh,
 * detached handle FIRST. Only on success is the new handler mounted and the
 * OLD collector shut down. If the load fails, the OLD handler stays mounted,
 * `/ready` is untouched (the old flow keeps serving), the error is logged, and
 * the unchanged OLD handle is returned. This avoids the wedge where a failed
 * load leaves the container handler-less with `/ready` stuck at 503.
 *
 * `load` is injectable for testing; it defaults to the real detached loader.
 */
export async function swapFlow(
  currentHandle: FlowHandle,
  newFile: string,
  config: RuntimeConfig | undefined,
  logger: Logger.Instance,
  loggerConfig?: Logger.Config,
  healthServer?: HealthServer,
  observers?: Array<ObserverFn>,
  observeLevel?: () => TelemetryLevel,
  load: FlowLoader = loadFlowHandle,
): Promise<FlowHandle> {
  logger.info('Loading new flow for hot-swap...');

  // 1. Load the new bundle into a fresh, unmounted handle. The old flow stays
  //    mounted and serving throughout this step.
  let newHandle: FlowHandle;
  try {
    newHandle = await load(
      newFile,
      config,
      logger,
      loggerConfig,
      healthServer,
      observers,
      observeLevel,
    );
  } catch (error) {
    // Rollback: keep the OLD handler mounted, keep /ready true, return the OLD
    // handle unchanged. No wedge — the old flow continues serving.
    logger.error(
      `Hot-swap load failed, keeping current flow: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return currentHandle;
  }

  // 2. Success — mount the new handler, then shut the OLD collector down. Mount
  //    before shutdown so the server never has a window without a handler.
  if (healthServer && typeof newHandle.httpHandler === 'function') {
    healthServer.setFlowHandler(newHandle.httpHandler);
  }

  try {
    if (currentHandle.collector.command) {
      await currentHandle.collector.command('shutdown');
    }
  } catch (error) {
    // The new flow is already live; an old-collector shutdown error is non-fatal.
    logger.debug(`Shutdown warning: ${error}`);
  }

  logger.info('Flow swapped successfully');
  return newHandle;
}
