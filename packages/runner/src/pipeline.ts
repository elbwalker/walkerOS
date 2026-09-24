/**
 * Unified runtime pipeline for walkerOS flows
 *
 * Used by `runneros start`, locally and in containers. Creates the health
 * server, loads the prebuilt flow, and enables heartbeat and secrets when API
 * config is provided. The served artifact is immutable for the life of the
 * process: there is no config polling and no hot-swap.
 *
 * Env surface: `WALKEROS_OBSERVER_URL` + `WALKEROS_INGEST_TOKEN` +
 * `WALKEROS_DEPLOYMENT_ID` together gate telemetry and the trace poller;
 * `WALKEROS_OBSERVE_LEVEL` sets the baseline telemetry level (a `trace`
 * baseline also skips the trace poller).
 */

import type {
  Logger,
  ObserverFn,
  PreviewKey,
  TelemetryLevel,
} from '@walkeros/core';
import {
  createBatchedPoster,
  createTelemetryObserver,
  getTraceUntil,
  resolveTelemetryOptions,
} from '@walkeros/core';
import {
  createHealthServer,
  type HealthServer,
  type PreviewGateConfig,
} from './health-server.js';
import { loadFlow, type RuntimeConfig, type FlowHandle } from './runner.js';
import {
  createHeartbeat,
  getInstanceId,
  type HeartbeatHandle,
} from './heartbeat.js';
import { createTracePoller, type TracePollerHandle } from './trace-poller.js';
import { fetchSecrets, SecretsHttpError } from './secrets-fetcher.js';
import type { ErrorRing, LogRing } from './log-ring.js';
import { VERSION } from './version.js';

export interface PipelineOptions {
  bundlePath: string;
  port: number;
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
    cacheDir: string;
  };
}

/**
 * Run the full pipeline: health server + flow + optional API features.
 * This function never returns (keeps process alive). Shutdown via signals.
 */
export async function runPipeline(options: PipelineOptions): Promise<void> {
  const { bundlePath, port, logger, loggerConfig, api } = options;

  // Process-level safety net FIRST, before any construction (secret injection,
  // health server, flow load, openWriter). A stray init-window emit from a step
  // or third-party lib (e.g. a gRPC StreamConnection's listener-less
  // emit('error', ...) on a detached tick) must land in the net rather than
  // crash the container before the guards are up. The degrade hook is wired in
  // once the health server exists; the listeners stay registered from here.
  const guards = registerProcessGuards(logger);

  // Inject secrets before loading flow
  if (api) {
    await injectSecrets(api, logger);
  }

  logger.info(`walkeros/flow v${VERSION}`);
  logger.info(`Instance: ${getInstanceId()}`);

  // Preview intake gate: resolved once from the boot env. A production
  // container has no `WALKEROS_PREVIEW_*` vars, so this is undefined and the
  // health server delegates exactly as before. A preview container is stamped
  // with all five vars (by the app) and gets an armed gate. A partial or
  // malformed set throws here, before the server binds (see resolvePreviewGate).
  const previewGate = resolvePreviewGate();

  // Health server (always on)
  const healthServer = await createHealthServer(port, logger, previewGate);

  // Wire the out-of-band degrade net into the already-registered guards. A
  // sustained loop of uncaught exceptions / unhandled rejections (a wedged
  // step or third-party lib) crosses the windowed threshold and flips `/ready`
  // to 503 so the orchestrator recycles the container; a single stray error
  // stays under the threshold and self-heals (stays 200). Degraded is a
  // recycle signal: only the boot-time `setReady(true)` below clears it, so a
  // degraded container clears on a fresh boot after the orchestrator recycles
  // it.
  // The tracker keeps its own latch so it fires `setDegraded` once per
  // crossing; that latch is independent of the health server's degraded flag.
  const outOfBandTracker = createOutOfBandErrorTracker({
    threshold: OUT_OF_BAND_THRESHOLD,
    windowMs: OUT_OF_BAND_WINDOW_MS,
    onThresholdExceeded: () => {
      logger.error(
        `Out-of-band errors crossed ${OUT_OF_BAND_THRESHOLD} within ${OUT_OF_BAND_WINDOW_MS / 1000}s, degrading /ready for recycle`,
      );
      healthServer.setDegraded('out-of-band error loop');
    },
  });
  guards.setOnOutOfBandError(() => outOfBandTracker.record());

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
  // Gated on the observers: no telemetry wired means the bundle must see no
  // observeLevel either (collector capture stays fully absent).
  const telemetryObserveLevel = telemetryObservers
    ? buildObserveLevelSupplier(api?.flowId ?? 'flow', observeLevel)
    : undefined;

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
      telemetryObserveLevel,
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

  // Collector constructed successfully: flow is genuinely ready to serve.
  healthServer.setReady(true);

  logger.info('Flow running');
  logger.info(`Port: ${port}`);

  // API features (heartbeat)
  let heartbeat: HeartbeatHandle | null = null;
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

  if (shouldStartHeartbeat(api)) {
    heartbeat = createHeartbeat(
      {
        appUrl: api.appUrl,
        token: api.token,
        projectId: api.projectId,
        flowId: api.flowId,
        deploymentId: api.deploymentId,
        intervalMs: api.heartbeatIntervalMs,
        getCounters: () => handle.collector.status,
        getErrors: () => options.errorRing?.snapshot() ?? [],
        getLogs: () => options.logRing?.snapshot() ?? [],
      },
      logger,
    );
    heartbeat.start();
    logger.info(`Heartbeat: active (every ${api.heartbeatIntervalMs / 1000}s)`);

    // Flush on first new distinct error: a fresh error key triggers a single
    // debounced out-of-band beat so the failure surfaces well before the next
    // steady interval (and before a crash can drop the in-memory ring). Repeats
    // (isNew=false) do not flush, so a hot error loop does not spam POSTs. The
    // ring↔heartbeat coupling lives here because this file owns both.
    const beat = heartbeat;
    options.errorRing?.setListener((_entry, isNew) => {
      if (isNew) beat.flushSoon();
    });
  }

  // Single shutdown orchestrator, driven through the extracted, dependency-
  // injected `runShutdown` so the final-flush ordering is unit-testable.
  const shutdown = (signal: string) =>
    runShutdown(signal, {
      tracePoller,
      heartbeat,
      collector: handle.collector,
      healthServer,
      logger,
      exit: (code) => process.exit(code),
      forceTimeoutMs: 15000,
    });

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Keep process alive
  await new Promise(() => {});
}

/**
 * Dependencies the shutdown orchestrator needs, injectable so the final-flush
 * ordering and force-timer behavior are unit-testable without a live pipeline.
 * Mirrors the {@link ProcessGuardDeps} pattern.
 */
export interface ShutdownDeps {
  tracePoller: TracePollerHandle | null;
  heartbeat: HeartbeatHandle | null;
  collector: FlowHandle['collector'];
  healthServer: Pick<
    HealthServer,
    'setReady' | 'setFailed' | 'setDegraded' | 'close'
  >;
  logger: Logger.Instance;
  exit: (code: number) => void;
  /** Hard deadline (ms) after which shutdown forces exit(1). */
  forceTimeoutMs: number;
}

/**
 * Orchestrate a graceful shutdown. Order:
 *   /ready drops to 503 → tracePoller.stop → final heartbeat sendOnce (await,
 *   best-effort) → heartbeat.stop → collector shutdown → healthServer.close →
 *   exit(0).
 *
 * Readiness drops FIRST so a load balancer stops routing new traffic to a
 * container that is draining.
 *
 * The final `sendOnce` runs BEFORE collector drain so the last beat reflects the
 * pre-drain counters/DLQ depth (what the operator wants at the moment of
 * failure) and carries the final ring contents (incl. the error that may have
 * triggered the shutdown). It is wrapped so a slow/rejecting POST cannot block
 * shutdown; the whole sequence sits inside a force-timer so a hung step still
 * exits at `forceTimeoutMs` (`sendOnce` has its own ~10s AbortSignal, under the
 * 15s deadline).
 */
export async function runShutdown(
  signal: string,
  deps: ShutdownDeps,
): Promise<void> {
  deps.logger.info(`Received ${signal}, shutting down...`);
  deps.healthServer.setReady(false);

  const forceTimer = setTimeout(() => {
    deps.logger.error('Shutdown timed out, forcing exit');
    deps.exit(1);
  }, deps.forceTimeoutMs);

  try {
    if (deps.tracePoller) deps.tracePoller.stop();

    // Final out-of-band beat: egress the last ring contents (incl. the failure
    // that may have triggered this shutdown) before stopping/draining. Best-
    // effort: a slow or rejecting POST must not wedge shutdown.
    if (deps.heartbeat) await deps.heartbeat.sendOnce().catch(() => {});
    if (deps.heartbeat) deps.heartbeat.stop();

    if (deps.collector.command) {
      await deps.collector.command('shutdown');
    }
    await deps.healthServer.close();

    deps.logger.info('Shutdown complete');
    clearTimeout(forceTimer);
    deps.exit(0);
  } catch (error) {
    clearTimeout(forceTimer);
    deps.logger.error(
      `Error during shutdown: ${error instanceof Error ? error.message : String(error)}`,
    );
    deps.exit(1);
  }
}

/**
 * Dependencies the process guards need, injectable so the handler bodies are
 * unit-testable without registering real `process` listeners or exiting.
 */
export interface ProcessGuardDeps {
  logger: Logger.Instance;
  exit: (code: number) => void;
  /**
   * Fed by BOTH guard handlers on every out-of-band error so a windowed
   * counter can auto-degrade `/ready` after a sustained loop (and so a later
   * task's collector `reportError` can route into the same counter). Optional
   * because the handler bodies stay unit-testable without a real server.
   */
  onOutOfBandError?: () => void;
}

/**
 * Handle an `unhandledRejection`: log the reason into the error ring (via the
 * logger) and keep serving. A stray rejection is treated as non-fatal, the
 * container degrades instead of crash-looping.
 *
 * This IS the registered `unhandledRejection` listener, so the body must never
 * throw: if the logger or the degrade chain throws synchronously, the escape
 * would itself become an uncaught error and crash the process, the exact
 * failure this guard exists to prevent. The whole body is therefore wrapped;
 * the fallback uses bare `console.error` (never a re-entrant `deps.logger`).
 */
export function handleUnhandledRejection(
  reason: unknown,
  deps: ProcessGuardDeps,
): void {
  try {
    deps.logger.error(
      `Unhandled rejection (continuing): ${
        reason instanceof Error ? reason.message : String(reason)
      }`,
    );
    deps.onOutOfBandError?.();
  } catch (guardError) {
    console.error('Process guard handler failed (continuing):', guardError);
  }
}

/**
 * Handle an `uncaughtException`: log the error into the error ring (via the
 * logger) and keep serving for non-fatal cases. `process.exit` is reserved for
 * genuinely unrecoverable state (handled by the shutdown orchestrator on
 * signals), not for a single stray throw.
 *
 * This IS the registered `uncaughtException` listener, so the body must never
 * throw (see `handleUnhandledRejection`): a throw escaping here is fatal. The
 * whole body is wrapped; the fallback uses bare `console.error`.
 */
export function handleUncaughtException(
  error: Error,
  deps: ProcessGuardDeps,
): void {
  try {
    deps.logger.error(`Uncaught exception (continuing): ${error.message}`);
    deps.onOutOfBandError?.();
  } catch (guardError) {
    console.error('Process guard handler failed (continuing):', guardError);
  }
}

/**
 * Handle returned by {@link registerProcessGuards} so the caller can wire the
 * `/ready` auto-degrade hook in AFTER the health server is constructed, while
 * keeping the `uncaughtException`/`unhandledRejection` listeners registered
 * from the very top of the pipeline.
 */
export interface ProcessGuardHandle {
  /** Wire (or replace) the out-of-band error hook fed by both guard handlers. */
  setOnOutOfBandError(onOutOfBandError: () => void): void;
}

let processGuardsRegistered = false;
// Live deps shared by the registered listeners. Held at module scope so the
// idempotent re-registration path can still re-wire the degrade hook onto the
// already-mounted listeners (a fresh runPipeline gets a fresh health server).
let processGuardDeps: ProcessGuardDeps | undefined;

const noopGuardHandle: ProcessGuardHandle = {
  setOnOutOfBandError(onOutOfBandError) {
    if (processGuardDeps) processGuardDeps.onOutOfBandError = onOutOfBandError;
  },
};

/**
 * Register the process-level error guards exactly once per process, and return
 * a handle to wire the out-of-band degrade hook later. Guards against
 * double-registration so a second `runPipeline` call in the same process does
 * not stack listeners (which would multiply log lines); the returned handle
 * still re-points the live hook so the newest health server gets degraded.
 *
 * `onOutOfBandError` may be supplied up front, or wired later via the handle.
 * The listeners read `deps.onOutOfBandError` live, so wiring it after the
 * health server exists does not lose any error that arrived in between (it is
 * just logged, not yet counted).
 */
export function registerProcessGuards(
  logger: Logger.Instance,
  onOutOfBandError?: () => void,
): ProcessGuardHandle {
  if (processGuardsRegistered) {
    if (processGuardDeps && onOutOfBandError)
      processGuardDeps.onOutOfBandError = onOutOfBandError;
    return noopGuardHandle;
  }
  processGuardsRegistered = true;

  const deps: ProcessGuardDeps = {
    logger,
    exit: (code) => process.exit(code),
    onOutOfBandError,
  };
  processGuardDeps = deps;

  process.on('unhandledRejection', (reason) =>
    handleUnhandledRejection(reason, deps),
  );
  process.on('uncaughtException', (error) =>
    handleUncaughtException(error, deps),
  );

  return {
    setOnOutOfBandError(next) {
      deps.onOutOfBandError = next;
    },
  };
}

/**
 * Reset the one-shot registration latch so a test can register a fresh set of
 * guard listeners. Tests must also `process.removeAllListeners(...)` the
 * relevant events; this only clears the module-level idempotency flag.
 */
export function resetProcessGuardsForTest(): void {
  processGuardsRegistered = false;
  processGuardDeps = undefined;
}

/**
 * Configuration for the windowed out-of-band error counter that decides when
 * `/ready` should auto-degrade.
 */
export interface OutOfBandErrorTrackerConfig {
  /** Number of errors within `windowMs` that triggers a degrade. */
  threshold: number;
  /** Rolling window length in milliseconds. */
  windowMs: number;
  /**
   * Called once when the count first crosses the threshold within the window.
   * Not called again until the window drains below the threshold and re-crosses.
   */
  onThresholdExceeded: () => void;
  /** Injectable clock so the window is testable without fake timers. */
  now?: () => number;
}

export interface OutOfBandErrorTracker {
  /** Record one out-of-band error at the current `now()`. */
  record(): void;
}

/**
 * Windowed counter for out-of-band errors. A single stray error self-heals
 * (stays under threshold, `/ready` keeps 200); a sustained hot loop crosses the
 * threshold within the rolling window and triggers `onThresholdExceeded`
 * exactly once per crossing, so the container is recycled rather than wedged
 * behind a 200 with a half-open writer.
 */
export function createOutOfBandErrorTracker(
  config: OutOfBandErrorTrackerConfig,
): OutOfBandErrorTracker {
  const now = config.now ?? (() => Date.now());
  const timestamps: number[] = [];
  let degraded = false;

  return {
    record() {
      const ts = now();
      timestamps.push(ts);
      const cutoff = ts - config.windowMs;
      while (timestamps.length > 0 && timestamps[0] < cutoff)
        timestamps.shift();

      if (timestamps.length >= config.threshold) {
        if (!degraded) {
          degraded = true;
          config.onThresholdExceeded();
        }
      } else {
        degraded = false;
      }
    },
  };
}

/** N out-of-band errors within {@link OUT_OF_BAND_WINDOW_MS} degrade `/ready`. */
const OUT_OF_BAND_THRESHOLD = 5;
/** Rolling window for the out-of-band degrade counter. */
const OUT_OF_BAND_WINDOW_MS = 60_000;

/**
 * The five env vars that stamp a preview container's identity. All five are set
 * together by the app when it boots a preview session container; a production
 * container has none of them. `iss` and `pb` are as load-bearing as the keyring:
 * without `pb`, `verifyActivation` returns `pb-mismatch` for every grant, and
 * `iss` is a required verifier input, so three vars could never work.
 */
const PREVIEW_ENV_VARS = {
  keyring: 'WALKEROS_PREVIEW_KEYRING',
  ses: 'WALKEROS_PREVIEW_SES',
  sb: 'WALKEROS_PREVIEW_SB',
  iss: 'WALKEROS_PREVIEW_ISS',
  pb: 'WALKEROS_PREVIEW_PB',
} as const;

type PreviewEnvKey = keyof typeof PREVIEW_ENV_VARS;
const PREVIEW_ENV_KEYS: PreviewEnvKey[] = ['keyring', 'ses', 'sb', 'iss', 'pb'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parse `WALKEROS_PREVIEW_KEYRING` defensively, it is attacker-adjacent config.
 * A malformed value throws (fail closed at boot), never falls through to inert:
 * an inert-on-parse-error path would silently reopen the exact hole the gate
 * closes. Expects a non-empty JSON array of `{ kid: string, spki: string }`.
 */
function parsePreviewKeyring(raw: string): PreviewKey[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `${PREVIEW_ENV_VARS.keyring} is not valid JSON (expected a JSON array of {kid, spki})`,
    );
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      `${PREVIEW_ENV_VARS.keyring} must be a non-empty JSON array of {kid, spki}`,
    );
  }
  const keyring: PreviewKey[] = [];
  for (const entry of parsed) {
    if (
      !isRecord(entry) ||
      typeof entry.kid !== 'string' ||
      entry.kid === '' ||
      typeof entry.spki !== 'string' ||
      entry.spki === ''
    ) {
      throw new Error(
        `${PREVIEW_ENV_VARS.keyring} entries must each be {kid: string, spki: string}`,
      );
    }
    keyring.push({ kid: entry.kid, spki: entry.spki });
  }
  return keyring;
}

/**
 * Resolve the preview intake gate from the boot env. Three outcomes, and the
 * partial case is deliberately loud:
 *
 * - NONE of the five vars present → returns undefined. The runner is a
 *   production container; intake stays byte-identical to today.
 * - ALL five present → returns a resolved {@link PreviewGateConfig}. The gate is
 *   armed and every delegated request must carry a session-bound grant.
 * - A PARTIAL set (or malformed keyring) → throws. A partial set is an app-side
 *   stamping bug; running unauthenticated would reopen the hole this gate
 *   closes, and 401-ing everything would be undiagnosable, so we fail the boot
 *   loudly naming the offending vars. An empty-string var counts as absent.
 *
 * Injectable `env` for testing; defaults to `process.env` at the boot site.
 */
export function resolvePreviewGate(
  env: NodeJS.ProcessEnv = process.env,
): PreviewGateConfig | undefined {
  const value = (key: PreviewEnvKey): string | undefined => {
    const raw = env[PREVIEW_ENV_VARS[key]];
    return raw === undefined || raw === '' ? undefined : raw;
  };

  const present = PREVIEW_ENV_KEYS.filter((key) => value(key) !== undefined);
  if (present.length === 0) return undefined;

  if (present.length < PREVIEW_ENV_KEYS.length) {
    const missing = PREVIEW_ENV_KEYS.filter(
      (key) => value(key) === undefined,
    ).map((key) => PREVIEW_ENV_VARS[key]);
    throw new Error(
      `Incomplete preview gate env: missing ${missing.join(', ')}. All of ` +
        `${PREVIEW_ENV_KEYS.map((key) => PREVIEW_ENV_VARS[key]).join(', ')} ` +
        `must be set together (app-side container stamping bug).`,
    );
  }

  const keyringRaw = value('keyring');
  const iss = value('iss');
  const pb = value('pb');
  const ses = value('ses');
  const sb = value('sb');
  // present.length === PREVIEW_ENV_KEYS.length guarantees all are defined; the
  // guard keeps the types honest without a cast.
  if (!keyringRaw || !iss || !pb || !ses || !sb) return undefined;

  return {
    keyring: parsePreviewKeyring(keyringRaw),
    iss,
    pb,
    expectSession: { ses, sb },
  };
}

/**
 * The heartbeat runs whenever the flow has API credentials, so the operator
 * keeps runner observability (counters, errors, logs).
 */
export function shouldStartHeartbeat(
  api: PipelineOptions['api'],
): api is NonNullable<PipelineOptions['api']> {
  return Boolean(api);
}

const OBSERVE_LEVELS: ReadonlyArray<TelemetryLevel> = [
  'off',
  'standard',
  'trace',
];

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

/**
 * Build the level supplier forwarded through the bundle context beside the
 * observers. The generated server entry installs it as
 * `collector.observeLevel`, which the collector's destination capture path
 * reads to gate call capture at trace. Resolves through the SAME
 * `resolveTelemetryOptions` inputs as the observer's per-emit supplier, so
 * the reported level follows the trace-poller's `traceUntil` window exactly:
 * null (off with no active trace) maps to 'off', otherwise the resolved
 * level ('standard' fallback matches the observer's own default).
 */
function buildObserveLevelSupplier(
  flowId: string,
  observeLevel?: TelemetryLevel,
): () => TelemetryLevel {
  const observe =
    observeLevel !== undefined ? { level: observeLevel } : undefined;
  return () => {
    const opts = resolveTelemetryOptions({
      flowId,
      observe,
      traceUntil: getTraceUntil(),
    });
    // The ?? fallback satisfies the non-optional return type only; the
    // resolver always sets level on a non-null result, so it never fires.
    return opts ? (opts.level ?? 'standard') : 'off';
  };
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
      throw error; // Fatal: token is invalid
    }
    logger.warn(
      `Could not fetch secrets: ${error instanceof Error ? error.message : error}`,
    );
    logger.info('Continuing without secrets (flow may not require them)');
  }
}
