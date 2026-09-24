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
    command?: (cmd: string) => Promise<unknown>;
    status?: Collector.Status;
  };
  file: string;
  httpHandler?: (...args: unknown[]) => void;
}

/**
 * Whether the collector exposes a status object. The heartbeat reads its
 * counters live, so the reference is kept, not copied.
 */
function isCollectorStatus(value: unknown): value is Collector.Status {
  return (
    typeof value === 'object' &&
    value !== null &&
    'in' in value &&
    typeof value.in === 'number' &&
    'out' in value &&
    typeof value.out === 'number'
  );
}

/**
 * Load a pre-built flow bundle, mount its HTTP handler onto the health server,
 * and return a handle for managing it.
 *
 * `observers` is the telemetry observer array built by `pipeline.ts`;
 * `observeLevel` is the matching level supplier. The generated bundle factory
 * (see `generateServerEntry` in the CLI's bundler) installs each observer onto
 * `collector.observers` and the supplier onto `collector.observeLevel` after
 * `startFlow` returns.
 */
export async function loadFlow(
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
  const status = result.collector.status;

  const handle: FlowHandle = {
    collector: {
      command: result.collector.command,
      ...(isCollectorStatus(status) ? { status } : {}),
    },
    file,
    httpHandler: result.httpHandler,
  };

  // Mount flow's httpHandler onto runner's health server (opaque, no type inspection)
  if (healthServer && typeof handle.httpHandler === 'function') {
    healthServer.setFlowHandler(handle.httpHandler);
  }

  return handle;
}
