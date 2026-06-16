/**
 * Unified runtime pipeline for walkerOS flows
 *
 * Used by both `walkeros run` (CLI) and Docker containers.
 * Creates health server, loads flow, and optionally enables
 * heartbeat/polling/secrets when API config is provided.
 *
 * Env surface: `WALKEROS_OBSERVER_URL` + `WALKEROS_INGEST_TOKEN` +
 * `WALKEROS_DEPLOYMENT_ID` together gate telemetry and the trace poller;
 * `WALKEROS_OBSERVE_LEVEL` sets the baseline telemetry level (a `trace`
 * baseline also skips the trace poller); `WALKEROS_CONFIG_FROZEN` pins the
 * served bundle as an immutable snapshot (secrets still injected, no
 * hot-swap, no heartbeat).
 */

import { writeFileSync } from 'fs';
import fs from 'fs-extra';
import type { Logger, ObserverFn, TelemetryLevel } from '@walkeros/core';
import {
  createBatchedPoster,
  createTelemetryObserver,
  getTraceUntil,
  resolveTelemetryOptions,
} from '@walkeros/core';
import { getTmpPath } from '../../core/tmp.js';
import { createHealthServer } from '../../runtime/health-server.js';
import {
  loadFlow,
  swapFlow,
  type RuntimeConfig,
  type FlowHandle,
} from '../../runtime/runner.js';
import {
  createHeartbeat,
  getInstanceId,
  type HeartbeatHandle,
} from '../../runtime/heartbeat.js';
import { createPoller, type PollerHandle } from '../../runtime/poller.js';
import {
  createTracePoller,
  type TracePollerHandle,
} from '../../runtime/trace-poller.js';
import {
  fetchSecrets,
  SecretsHttpError,
} from '../../runtime/secrets-fetcher.js';
import { writeCache } from '../../runtime/cache.js';
import type { ErrorRing, LogRing } from '../../runtime/index.js';
import { VERSION } from '../../version.js';

export interface PipelineOptions {
  bundlePath: string;
  port: number;
  /**
   * Etag of the config this process booted with, used to seed the poller so
   * the first poll can 304 instead of re-bundling the just-booted config.
   * Sourced (by the caller) from the boot-time config fetch, or from
   * `WALKEROS_CONFIG_ETAG` for the prebuilt-archive deploy path where the
   * in-container boot never fetched the config.
   */
  bootEtag?: string;
  logger: Logger.Instance;
  /**
   * Logger config handed to the deployed bundle's collector as
   * `context.logger`. Its handler taps the same ErrorRing/LogRing as the
   * runner CLI logger, so the collector's destination errors land in the ring
   * (and the heartbeat report) even without `--verbose`. The level is DEBUG so
   * the handler controls visibility; ERROR is always emitted into the ring.
   */
  loggerConfig?: Logger.Config;
  errorRing?: ErrorRing;
  logRing?: LogRing;
  api?: {
    appUrl: string;
    token: string;
    projectId: string;
    flowId: string;
    deploymentId?: string;
    heartbeatIntervalMs: number;
    pollIntervalMs: number;
    cacheDir: string;
    flowName?: string;
    /** Injected bundler function (lazy-loaded by caller to avoid pulling in bundler for pre-built flows) */
    prepareBundleForRun: (
      configPath: string,
      options: { verbose?: boolean; silent?: boolean; flowName?: string },
    ) => Promise<{ bundlePath: string; cleanup: () => Promise<void> }>;
  };
}

/**
 * Run the full pipeline: health server + flow + optional API features.
 * This function never returns (keeps process alive). Shutdown via signals.
 */
export async function runPipeline(options: PipelineOptions): Promise<void> {
  const { bundlePath, port, logger, loggerConfig, api } = options;
  let configVersion: string | undefined;
  const configFrozen = readConfigFrozen();

  // Inject secrets before loading flow
  if (api) {
    await injectSecrets(api, logger);
  }

  logger.info(`walkeros/flow v${VERSION}`);
  logger.info(`Instance: ${getInstanceId()}`);
  if (configFrozen) {
    logger.info('Config frozen: hot-swap disabled (heartbeat still active)');
  }

  // Health server (always on)
  const healthServer = await createHealthServer(port, logger);

  // Telemetry observers: only wire when observer URL, ingest token, and
  // deployment id are all present. Missing env (local dev, run --flow without
  // API) results in a no-op telemetry path. The active trace window arrives
  // via the trace-poller below (which writes the shared `traceUntil` holder);
  // the per-emit supplier reads it, so trace flips on and off at runtime
  // without a redeploy. WALKEROS_OBSERVE_LEVEL sets the baseline telemetry
  // level for the process; `traceUntil` keeps higher priority in the
  // resolver, so a standard (or off) baseline can still be elevated to trace.
  const observeLevel = readObserveLevel(logger);
  const telemetryObservers = buildTelemetryObservers(
    api?.flowId ?? 'flow',
    observeLevel,
  );

  // Load flow
  const runtimeConfig: RuntimeConfig = { port };
  let handle: FlowHandle;
  try {
    handle = await loadFlow(
      bundlePath,
      runtimeConfig,
      logger,
      loggerConfig,
      healthServer,
      telemetryObservers,
    );
  } catch (error) {
    // Collector construction failed: keep /ready non-200 so an orchestrator
    // (Scaleway) does not shift traffic to this revision before we exit.
    healthServer.setFailed(
      error instanceof Error ? error.message : String(error),
    );
    await healthServer.close();
    throw error;
  }

  // Collector constructed successfully — flow is genuinely ready to serve.
  healthServer.setReady(true);

  logger.info('Flow running');
  logger.info(`Port: ${port}`);

  // API features (heartbeat + poller)
  let heartbeat: HeartbeatHandle | null = null;
  let poller: PollerHandle | null = null;
  let tracePoller: TracePollerHandle | null = null;

  // Trace-poller: GET the observer's `/trace/:deploymentId` and feed the
  // result into the shared `traceUntil` holder. Gated on the SAME env as the
  // telemetry observers (observer base + ingest token + deployment id), NOT on
  // `api`: a flow with `api` but no observer env (local dev) must not start a
  // poller that errors every interval.
  const observerBase = process.env.WALKEROS_OBSERVER_URL;
  const ingestToken = process.env.WALKEROS_INGEST_TOKEN;
  const deploymentId = process.env.WALKEROS_DEPLOYMENT_ID;
  if (observerBase && ingestToken && deploymentId) {
    if (observeLevel === 'trace') {
      // The poller only exists to elevate the level via `traceUntil`. With a
      // trace baseline there is nothing to elevate, so polling would burn a
      // request every interval for no effect.
      logger.info('Trace poller: skipped (observe level is trace)');
    } else {
      tracePoller = createTracePoller(
        {
          url: `${observerBase}/trace/${deploymentId}`,
          token: ingestToken,
          intervalMs: 15_000,
        },
        logger,
      );
      tracePoller.start();
      logger.info('Trace poller: active (every 15s)');
    }
  }

  // Track temp files for cleanup on hot-swap and shutdown
  let currentBundleCleanup: (() => Promise<void>) | undefined;
  let currentConfigPath: string | undefined;

  if (shouldStartHeartbeat(api)) {
    // Heartbeat runs even under freeze so the operator keeps observability.
    heartbeat = createHeartbeat(
      {
        appUrl: api.appUrl,
        token: api.token,
        projectId: api.projectId,
        flowId: api.flowId,
        deploymentId: api.deploymentId,
        configVersion,
        intervalMs: api.heartbeatIntervalMs,
        getCounters: () => handle.collector.status,
        getErrors: () => options.errorRing?.snapshot() ?? [],
        getLogs: () => options.logRing?.snapshot() ?? [],
      },
      logger,
    );
    heartbeat.start();
    logger.info(`Heartbeat: active (every ${api.heartbeatIntervalMs / 1000}s)`);
  }

  if (api && shouldStartPoller(api, configFrozen)) {
    poller = createPoller(
      {
        fetchOptions: {
          appUrl: api.appUrl,
          token: api.token,
          projectId: api.projectId,
          flowId: api.flowId,
        },
        intervalMs: api.pollIntervalMs,
        initialEtag: resolveInitialEtag(options.bootEtag),
        onUpdate: async (content, version) => {
          // Refresh secrets before hot-swap
          try {
            await injectSecrets(api, logger);
          } catch (error) {
            logger.error(
              `Failed to refresh secrets during poll, skipping hot-swap: ${error instanceof Error ? error.message : error}`,
            );
            return;
          }

          const tmpConfigPath = getTmpPath(
            undefined,
            `walkeros-flow-${Date.now()}.json`,
          );
          writeFileSync(
            tmpConfigPath,
            JSON.stringify(content, null, 2),
            'utf-8',
          );

          const newBundleResult = await api.prepareBundleForRun(tmpConfigPath, {
            verbose: false,
            silent: true,
            flowName: api.flowName,
          });

          // swapFlow is atomic with rollback: it loads the new bundle into a
          // fresh handle first and only mounts it on success, otherwise it
          // returns the OLD handle unchanged and the old flow keeps serving.
          // So readiness must NOT drop before the swap — a failed swap must
          // leave /ready true (no wedge). When the swap succeeds the handler is
          // already mounted atomically; readiness was never lost.
          const swapped = await swapFlow(
            handle,
            newBundleResult.bundlePath,
            runtimeConfig,
            logger,
            loggerConfig,
            healthServer,
            telemetryObservers,
          );

          // Rollback case: handle unchanged. Skip cache write and version
          // bookkeeping so a failed swap doesn't record the unbuilt version.
          if (swapped === handle) {
            await newBundleResult.cleanup().catch(() => {});
            await fs.remove(tmpConfigPath).catch(() => {});
            return;
          }
          handle = swapped;

          writeCache(
            api.cacheDir,
            newBundleResult.bundlePath,
            JSON.stringify(content),
            version,
          );
          configVersion = version;
          if (heartbeat) heartbeat.updateConfigVersion(version);

          // Clean up previous temp files
          if (currentBundleCleanup)
            await currentBundleCleanup().catch(() => {});
          if (currentConfigPath)
            await fs.remove(currentConfigPath).catch(() => {});

          // Track new paths
          currentBundleCleanup = newBundleResult.cleanup;
          currentConfigPath = tmpConfigPath;

          logger.info(`Hot-swapped to version ${version}`);
        },
      },
      logger,
    );
    poller.start();
    logger.info(`Polling: active (every ${api.pollIntervalMs / 1000}s)`);
  }

  // Single shutdown orchestrator
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);

    const forceTimer = setTimeout(() => {
      logger.error('Shutdown timed out, forcing exit');
      process.exit(1);
    }, 15000);

    try {
      if (tracePoller) tracePoller.stop();
      if (poller) poller.stop();
      if (heartbeat) heartbeat.stop();
      if (handle.collector.command) {
        await handle.collector.command('shutdown');
      }
      await healthServer.close();

      // Clean up temp files
      if (currentBundleCleanup) await currentBundleCleanup().catch(() => {});
      if (currentConfigPath) await fs.remove(currentConfigPath).catch(() => {});

      logger.info('Shutdown complete');
      clearTimeout(forceTimer);
      process.exit(0);
    } catch (error) {
      clearTimeout(forceTimer);
      logger.error(
        `Error during shutdown: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Process-level safety net: a stray unhandled rejection or uncaught
  // exception (e.g. from the dynamically imported bundle) must degrade, not
  // crash the container. The guards log into the error ring via the logger and
  // keep the process serving; the orchestrator's own /ready gate still governs
  // traffic. Registration is idempotent in case runPipeline runs more than once.
  registerProcessGuards(logger);

  // Keep process alive
  await new Promise(() => {});
}

/**
 * Dependencies the process guards need, injectable so the handler bodies are
 * unit-testable without registering real `process` listeners or exiting.
 */
export interface ProcessGuardDeps {
  logger: Logger.Instance;
  exit: (code: number) => void;
}

/**
 * Handle an `unhandledRejection`: log the reason into the error ring (via the
 * logger) and keep serving. A stray rejection is treated as non-fatal — the
 * container degrades instead of crash-looping.
 */
export function handleUnhandledRejection(
  reason: unknown,
  deps: ProcessGuardDeps,
): void {
  deps.logger.error(
    `Unhandled rejection (continuing): ${
      reason instanceof Error ? reason.message : String(reason)
    }`,
  );
}

/**
 * Handle an `uncaughtException`: log the error into the error ring (via the
 * logger) and keep serving for non-fatal cases. `process.exit` is reserved for
 * genuinely unrecoverable state (handled by the shutdown orchestrator on
 * signals), not for a single stray throw.
 */
export function handleUncaughtException(
  error: Error,
  deps: ProcessGuardDeps,
): void {
  deps.logger.error(`Uncaught exception (continuing): ${error.message}`);
}

let processGuardsRegistered = false;

/**
 * Register the process-level error guards exactly once per process. Guards
 * against double-registration so a second `runPipeline` call in the same
 * process does not stack listeners (which would multiply log lines).
 */
export function registerProcessGuards(logger: Logger.Instance): void {
  if (processGuardsRegistered) return;
  processGuardsRegistered = true;

  const deps: ProcessGuardDeps = {
    logger,
    exit: (code) => process.exit(code),
  };

  process.on('unhandledRejection', (reason) =>
    handleUnhandledRejection(reason, deps),
  );
  process.on('uncaughtException', (error) =>
    handleUncaughtException(error, deps),
  );
}

/**
 * Resolve the poller's seed etag. The boot-time config fetch (Case 2 of the
 * run command) knows the etag and wins; the prebuilt-archive deploy path
 * never fetches the config in-container, so it falls back to
 * `WALKEROS_CONFIG_ETAG`. Neither present means the first poll sends no
 * `If-None-Match` (the safe legacy behavior).
 */
export function resolveInitialEtag(bootEtag?: string): string | undefined {
  return bootEtag ?? process.env.WALKEROS_CONFIG_ETAG;
}

/**
 * The heartbeat runs whenever the flow has API credentials, regardless of the
 * frozen gate. Freezing a deployed flow disables the in-container re-bundle
 * (the poller); it must NOT silence the heartbeat, or the operator loses all
 * runner observability (counters, errors, logs) on frozen production flows.
 */
export function shouldStartHeartbeat(
  api: PipelineOptions['api'],
): api is NonNullable<PipelineOptions['api']> {
  return Boolean(api);
}

/**
 * The poller (config hot-swap via in-container re-bundle) runs only when the
 * flow has API credentials AND is not frozen. `WALKEROS_CONFIG_FROZEN` exists
 * to stop the re-bundle crash-loop, so it gates the poller alone.
 */
export function shouldStartPoller(
  api: PipelineOptions['api'],
  configFrozen: boolean,
): boolean {
  return Boolean(api) && !configFrozen;
}

const OBSERVE_LEVELS: ReadonlyArray<TelemetryLevel> = [
  'off',
  'standard',
  'trace',
];

/**
 * Read `WALKEROS_CONFIG_FROZEN` once at pipeline start (`'1'` or `'true'`
 * enables it, matching the package's boolean env convention; anything else,
 * including `'0'`, is off).
 *
 * Frozen mode is the immutable-bundle contract: a runtime serving a config
 * snapshot must never hot-swap itself to a newer config, so the config
 * poller is not constructed. The heartbeat is skipped for the same reason:
 * it reports the config-version lifecycle of a hot-swappable runtime, which
 * an immutable snapshot does not have. Secrets are still injected at boot,
 * and the health server, telemetry, and trace poller are unaffected.
 */
function readConfigFrozen(): boolean {
  const raw = process.env.WALKEROS_CONFIG_FROZEN;
  return raw === '1' || raw === 'true';
}

/**
 * Read and validate `WALKEROS_OBSERVE_LEVEL` once at boot. The value sets
 * the runtime's baseline telemetry level (`off` | `standard` | `trace`).
 * The resolver gives the runtime `traceUntil` window higher priority, so a
 * baseline of `off` or `standard` can still be elevated to trace at runtime.
 * Unset or empty means the resolver's standard default applies. Invalid
 * values are logged and ignored (treated as unset).
 */
function readObserveLevel(logger: Logger.Instance): TelemetryLevel | undefined {
  const raw = process.env.WALKEROS_OBSERVE_LEVEL;
  if (raw === undefined || raw === '') return undefined;
  const level = OBSERVE_LEVELS.find((candidate) => candidate === raw);
  if (!level) {
    logger.warn(
      `Ignoring invalid WALKEROS_OBSERVE_LEVEL "${raw}" (expected off, standard, or trace)`,
    );
    return undefined;
  }
  return level;
}

/**
 * Build the telemetry observer array the runtime forwards through the
 * bundle context. Returns undefined when telemetry is disabled (missing env
 * vars). The bundle then sees no `context.observers` and skips the install
 * loop entirely.
 *
 * `WALKEROS_OBSERVER_URL` is the observer base; the ingest POST URL is built
 * as `${base}/ingest/${WALKEROS_DEPLOYMENT_ID}`. Transport-level env is
 * sampled once at boot: rebuilding the poster on every emit would discard
 * the batch buffer. Projection-level opts (`level`, `sample`,
 * `includeIn`/`Out`/`MappingKey`, plus the active `traceUntil`) are
 * re-resolved per emit through the supplier so the trace-poller's writes to
 * the shared holder reach the projection. The optional `observeLevel`
 * baseline (from `WALKEROS_OBSERVE_LEVEL`) feeds the resolver's `observe`
 * block; `traceUntil` keeps its higher priority.
 */
function buildTelemetryObservers(
  flowId: string,
  observeLevel?: TelemetryLevel,
): Array<ObserverFn> | undefined {
  const base = process.env.WALKEROS_OBSERVER_URL;
  const token = process.env.WALKEROS_INGEST_TOKEN;
  const deploymentId = process.env.WALKEROS_DEPLOYMENT_ID;
  if (!base || !token || !deploymentId) return undefined;

  const url = `${base}/ingest/${deploymentId}`;
  const emit = createBatchedPoster({ url, token });
  const observe =
    observeLevel !== undefined ? { level: observeLevel } : undefined;
  return [
    createTelemetryObserver(emit, () =>
      resolveTelemetryOptions({ flowId, observe, traceUntil: getTraceUntil() }),
    ),
  ];
}

async function injectSecrets(
  api: NonNullable<PipelineOptions['api']>,
  logger: Logger.Instance,
): Promise<void> {
  try {
    const secrets = await fetchSecrets({
      appUrl: api.appUrl,
      token: api.token,
      projectId: api.projectId,
      flowId: api.flowId,
    });
    const count = Object.keys(secrets).length;
    if (count > 0) {
      for (const [name, value] of Object.entries(secrets)) {
        process.env[name] = value;
      }
      logger.info(`Injected ${count} secret(s) into environment`);
    }
  } catch (error) {
    if (
      error instanceof SecretsHttpError &&
      (error.status === 401 || error.status === 403)
    ) {
      throw error; // Fatal — token is invalid
    }
    logger.warn(
      `Could not fetch secrets: ${error instanceof Error ? error.message : error}`,
    );
    logger.info('Continuing without secrets (flow may not require them)');
  }
}
