/**
 * Unified runtime pipeline for walkerOS flows
 *
 * Used by `runneros start`, locally and in containers, and by the flow child
 * of `runneros remote`. Creates the health server, loads the prebuilt flow,
 * and enables heartbeat and secrets when API config is provided; the remote
 * child hands in its secret values and its report instead. The served
 * artifact is immutable for the life of the process: there is no config
 * polling and no hot-swap.
 *
 * Env surface: `WALKEROS_FLOW_RELEASE` (with `WALKEROS_FLOW_NAME`) names the
 * artifact the container must run; any other artifact fails the boot.
 */

import {
  isObject,
  SHUTDOWN_DEADLINE_MS,
  type DeclaredEnv,
  type Destination,
  type Logger,
} from '@walkeros/core';
import type { KnownValues } from '@walkeros/core/node';
import { createHealthServer, type HealthServer } from './health-server.js';
import { loadFlow, type RuntimeConfig, type FlowHandle } from './runner.js';
import type { AppAuth } from './credentials.js';
import { createHeartbeat, type HeartbeatHandle } from './heartbeat.js';
import { fetchSecrets } from './secrets-fetcher.js';
import { RunnerAuthError } from './runner-auth-error.js';
import {
  knownValuesOf,
  planSecretInjection,
  SecretRefusalError,
} from './secret-injection.js';
import type { ErrorRing, LogRing } from './log-ring.js';
import type { FlowLogger } from './runtime-logging.js';
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
  /**
   * The flow logger contract handed to the bundle beside `loggerConfig`: a
   * forced level (`--verbose`) and the hook that receives the flow's own
   * logger settings, so the flow's level and format win.
   */
  flowLogger?: FlowLogger;
  /** The output format in effect, for lines written around the logger. */
  format?: () => Logger.Format;
  errorRing?: ErrorRing;
  logRing?: LogRing;
  /**
   * The values the caller's loggers and the heartbeat mask. Every fetched
   * secret value and the value of every name the flow declares join it before
   * the flow starts, so each line read from then on masks them.
   */
  knownValues: KnownValues;
  /** This runner process's id, printed at start and carried by each beat. */
  instanceId: string;
  /** The app, when the runner holds a credential: the boot's secret read and the check-in. */
  api?: {
    app: AppAuth;
    heartbeatIntervalMs: number;
    cacheDir: string;
  };
  /**
   * The secret values a supervisor delivered, injected the way fetched ones
   * are, in place of the app fetch. Read only without `api`.
   */
  delivered?: Readonly<Record<string, string>>;
  /**
   * Builds the report handle once the flow is ready, in place of the app
   * heartbeat: it is started, flushed on each new distinct error and sent
   * once more at the drain, as the heartbeat is.
   */
  report?: (collector: FlowHandle['collector']) => HeartbeatHandle;
  /** Called once the flow is ready and the signal handlers are in place. */
  onReady?: () => void;
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
  const guards = registerProcessGuards(logger, undefined, options.format);

  // The artifact this container was deployed to run. Read before the secrets
  // are injected into the environment, so a secret cannot replace it.
  const expected = readExpectedArtifact();

  logger.info(`walkeros/flow v${VERSION}`);
  // No colon after the label: `Instance: <hex>` reads as a key and a token
  // value to the redactor, which would print the id as ***.
  logger.info(`Instance ${options.instanceId}`);

  // Health server (always on)
  const healthServer = await createHealthServer(port, logger);

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

  // Load flow
  const runtimeConfig: RuntimeConfig = { port, ...options.flowLogger };
  let handle: FlowHandle;
  try {
    handle = await loadFlow(
      bundlePath,
      runtimeConfig,
      logger,
      loggerConfig,
      healthServer,
      (declared) =>
        injectSecrets(
          declared,
          api,
          options.delivered,
          logger,
          options.knownValues,
        ),
    );
    const loaded = showIdentity(handle.collector);
    logger.info(`Flow: ${loaded.name} release ${loaded.release}`);
    assertExpectedArtifact(expected, handle.collector);
  } catch (error) {
    // Collector construction failed, a delivered secret was refused, or the
    // artifact is not the one this container was deployed to run: keep
    // /ready non-200 so an orchestrator
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

  // The report (remote child) or the app heartbeat, never both.
  let heartbeat: HeartbeatHandle | null = null;

  if (options.report) {
    heartbeat = options.report(handle.collector);
    heartbeat.start();
  } else if (shouldStartHeartbeat(api)) {
    heartbeat = createHeartbeat(
      {
        app: api.app,
        instanceId: options.instanceId,
        intervalMs: api.heartbeatIntervalMs,
        getCounters: () => handle.collector.status,
        getErrors: () => options.errorRing?.snapshot() ?? [],
        getLogs: () => options.logRing?.snapshot() ?? [],
        knownValues: options.knownValues,
        release: handle.collector.release,
      },
      logger,
    );
    heartbeat.start();
    logger.info(`Heartbeat: active (every ${api.heartbeatIntervalMs / 1000}s)`);
  }

  // Flush on first new distinct error: a fresh error key triggers a single
  // debounced out-of-band beat so the failure surfaces well before the next
  // steady interval (and before a crash can drop the in-memory ring). Repeats
  // (isNew=false) do not flush, so a hot error loop does not spam POSTs. The
  // ring↔heartbeat coupling lives here because this file owns both.
  const beat = heartbeat;
  if (beat)
    options.errorRing?.setListener((_entry, isNew) => {
      if (isNew) beat.flushSoon();
    });

  // Single shutdown orchestrator, driven through the extracted, dependency-
  // injected `runShutdown` so the final-flush ordering is unit-testable.
  const shutdown = (signal: string) =>
    runShutdown(signal, {
      heartbeat,
      collector: handle.collector,
      healthServer,
      logger,
      exit: (code) => process.exit(code),
      // A second past the collector's own deadline, under Cloud Run's 10 s.
      forceTimeoutMs: SHUTDOWN_DEADLINE_MS + 1000,
    });

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Last, so a flow its caller sees ready always drains on SIGTERM.
  options.onReady?.();

  // Keep process alive
  await new Promise(() => {});
}

/**
 * Dependencies the shutdown orchestrator needs, injectable so the final-flush
 * ordering and force-timer behavior are unit-testable without a live pipeline.
 * Mirrors the {@link ProcessGuardDeps} pattern.
 */
export interface ShutdownDeps {
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

/** Collectors whose drain has begun: a later signal only says so. */
const draining = new WeakSet<ShutdownDeps['collector']>();

/**
 * Orchestrate a graceful shutdown. Order:
 *   /ready drops to 503 → final heartbeat started → heartbeat.stop →
 *   collector drain → the final beat awaited until the drain deadline →
 *   healthServer.close → exit 1 when the drain names a destination or
 *   pushes its deadline cut, else 0.
 *
 * Readiness drops FIRST so a load balancer stops routing new traffic to a
 * container that is draining.
 *
 * The final beat builds its body at once, so it carries the pre-drain
 * counters and the last ring contents (incl. the error that may have
 * triggered the shutdown); its POST runs beside the drain, so an
 * unreachable app never takes the drain's time. The collector bounds its
 * drain by `SHUTDOWN_DEADLINE_MS`; the force timer exits 1 at
 * `forceTimeoutMs` if anything still hangs. A second signal during the
 * drain writes one line, and the first decides the exit code.
 */
export async function runShutdown(
  signal: string,
  deps: ShutdownDeps,
): Promise<void> {
  if (draining.has(deps.collector)) {
    deps.logger.info(`Received ${signal} during shutdown, the drain goes on`);
    return;
  }
  draining.add(deps.collector);
  deps.logger.info(`Received ${signal}, shutting down...`);
  deps.healthServer.setReady(false);
  const deadlineAt = Date.now() + SHUTDOWN_DEADLINE_MS;

  const forceTimer = setTimeout(() => {
    deps.logger.error('Shutdown timed out, forcing exit');
    deps.exit(1);
  }, deps.forceTimeoutMs);

  try {
    // Best-effort: a slow or rejecting POST must not wedge shutdown.
    const beat = deps.heartbeat?.sendOnce().catch(() => {});
    deps.heartbeat?.stop();

    const result = deps.collector.command
      ? await deps.collector.command('shutdown')
      : undefined;
    if (beat) await settledBy(beat, deadlineAt);
    await deps.healthServer.close();

    const lost = lostDestinationsOf(result);
    for (const { id, code, phase } of lost)
      deps.logger.error(
        phase === 'destroy'
          ? `Shutdown: destination '${id}' did not close cleanly (${code}); events it buffered may be lost`
          : `Shutdown lost events: destination '${id}' did not flush its batch (${code})`,
      );
    const cut = shutdownFailureOf(result);
    if (cut)
      deps.logger.error(`Shutdown lost events: ${cut.message} (${cut.code})`);

    deps.logger.info('Shutdown complete');
    clearTimeout(forceTimer);
    deps.exit(lost.length || cut ? 1 : 0);
  } catch (error) {
    clearTimeout(forceTimer);
    deps.logger.error(
      `Error during shutdown: ${error instanceof Error ? error.message : String(error)}`,
    );
    deps.exit(1);
  }
}

/** Resolves when `work` settles or at `deadlineAt`, whichever comes first. */
function settledBy(work: Promise<void>, deadlineAt: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, Math.max(0, deadlineAt - Date.now()));
    void work.finally(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * The destinations a collector's shutdown answer names under `failed`, each
 * with its reason code and the phase that failed; none unless `ok` is false.
 * A failed destination is lost (`flush`) unless the answer marks it as one
 * that did not close cleanly (`destroy`). A collector of an earlier version
 * answers nothing.
 */
export function lostDestinationsOf(result: unknown): Array<{
  id: string;
  code: string;
  phase: NonNullable<Destination.Ref['phase']>;
}> {
  if (!isObject(result) || result.ok !== false || !isObject(result.failed))
    return [];
  return Object.entries(result.failed).map(([id, ref]) => ({
    id,
    code:
      isObject(ref) &&
      isObject(ref.reason) &&
      typeof ref.reason.code === 'string'
        ? ref.reason.code
        : 'unknown',
    phase: isObject(ref) && ref.phase === 'destroy' ? 'destroy' : 'flush',
  }));
}

/**
 * The failure a collector's shutdown answer names beside its destinations:
 * `ok` false with a `reason`, as for pushes still running at the drain
 * deadline, whose events go with the process. None for any other answer.
 */
function shutdownFailureOf(
  result: unknown,
): { code: string; message: string } | undefined {
  if (!isObject(result) || result.ok !== false || !isObject(result.reason))
    return undefined;
  const { code, message } = result.reason;
  return typeof code === 'string' && typeof message === 'string'
    ? { code, message }
    : undefined;
}

/**
 * Dependencies the process guards need, injectable so the handler bodies are
 * unit-testable without registering real `process` listeners or exiting.
 */
export interface ProcessGuardDeps {
  logger: Logger.Instance;
  exit: (code: number) => void;
  /**
   * The output format in effect. In JSON mode a failed guard writes one
   * fixed, pre-serialized line, so the stream stays one JSON object per line.
   */
  format?: () => Logger.Format;
  /**
   * Fed by BOTH guard handlers on every out-of-band error so a windowed
   * counter can auto-degrade `/ready` after a sustained loop (and so a later
   * task's collector `reportError` can route into the same counter). Optional
   * because the handler bodies stay unit-testable without a real server.
   */
  onOutOfBandError?: () => void;
}

/**
 * The line a failed guard writes in JSON mode: fixed and pre-serialized,
 * without the error text, so nothing in it can fail to serialize or carry a
 * secret.
 */
const GUARD_FAILED_JSON_LINE =
  '{"severity":"ERROR","message":"[runner] Process guard handler failed (continuing)"}\n';

/**
 * The fallback when a guard's own logging throws: never a re-entrant
 * `deps.logger`. Text mode prints the error with bare `console.error`.
 */
function reportGuardFailure(guardError: unknown, deps: ProcessGuardDeps): void {
  if (deps.format?.() === 'json') process.stderr.write(GUARD_FAILED_JSON_LINE);
  else console.error('Process guard handler failed (continuing):', guardError);
}

/**
 * Handle a Node process warning (`process.on('warning')`, for example a
 * `MetadataLookupWarning`): log it at WARN through the logger, masked and
 * in the flow's format. Never throws (it is a registered listener).
 */
export function handleProcessWarning(
  warning: Error,
  deps: ProcessGuardDeps,
): void {
  try {
    deps.logger.warn(`${warning.name}: ${warning.message}`);
  } catch (guardError) {
    reportGuardFailure(guardError, deps);
  }
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
 * the fallback never re-enters `deps.logger` (see `reportGuardFailure`).
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
    reportGuardFailure(guardError, deps);
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
 * whole body is wrapped; the fallback never re-enters `deps.logger`.
 */
export function handleUncaughtException(
  error: Error,
  deps: ProcessGuardDeps,
): void {
  try {
    deps.logger.error(`Uncaught exception (continuing): ${error.message}`);
    deps.onOutOfBandError?.();
  } catch (guardError) {
    reportGuardFailure(guardError, deps);
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
  format?: () => Logger.Format,
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
    format,
  };
  processGuardDeps = deps;

  process.on('unhandledRejection', (reason) =>
    handleUnhandledRejection(reason, deps),
  );
  process.on('uncaughtException', (error) =>
    handleUncaughtException(error, deps),
  );
  process.on('warning', (warning) => handleProcessWarning(warning, deps));

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

/** A flow's identity as its bundle baked it onto the collector. */
type ArtifactIdentity = Pick<FlowHandle['collector'], 'name' | 'release'>;

/** The artifact a container must run: a release, and a flow name when set. */
interface ExpectedArtifact {
  name?: string;
  release: string;
}

/**
 * Read the artifact this container must run from `WALKEROS_FLOW_RELEASE` and
 * `WALKEROS_FLOW_NAME`. Only a release turns the check on: a container stamped
 * with the flow name alone is not checked. An empty value counts as unset.
 */
function readExpectedArtifact(): ExpectedArtifact | undefined {
  const release = process.env.WALKEROS_FLOW_RELEASE;
  if (release === undefined || release === '') return undefined;
  const name = process.env.WALKEROS_FLOW_NAME;
  return name === undefined || name === '' ? { release } : { name, release };
}

/** Display values of an identity; an artifact may carry neither. */
function showIdentity({ name, release }: ArtifactIdentity): {
  name: string;
  release: string;
} {
  return { name: name ?? '(unnamed)', release: release ?? '(none)' };
}

/**
 * Refuse a loaded artifact that is not the one this container was deployed to
 * run: another release, no release at all, or another flow name when a name is
 * expected. The throw keeps `/ready` from ever reporting it ready, and the
 * message names both sides.
 */
function assertExpectedArtifact(
  expected: ExpectedArtifact | undefined,
  loaded: ArtifactIdentity,
): void {
  if (!expected) return;
  const nameMatches =
    expected.name === undefined || loaded.name === expected.name;
  if (loaded.release === expected.release && nameMatches) return;

  // Without an expected name any name is accepted, so the loaded one is shown.
  const want = showIdentity({
    name: expected.name ?? loaded.name,
    release: expected.release,
  });
  const got = showIdentity(loaded);
  throw new Error(
    `Artifact mismatch: expected ${want.name}@${want.release}, loaded ${got.name}@${got.release}`,
  );
}

/**
 * The heartbeat runs whenever the runner holds a credential, so the operator
 * keeps runner observability (counters, errors, logs).
 */
export function shouldStartHeartbeat(
  api: PipelineOptions['api'],
): api is NonNullable<PipelineOptions['api']> {
  return Boolean(api);
}

/**
 * Prepare the environment of a loaded artifact before its flow starts: fetch
 * the app's secrets (when connected) or take the delivered ones, mask every
 * such value and every value of a name the flow declares, refuse the boot on
 * a reserved or already set name, then set what the plan allows. A fetch that
 * fails for another reason than auth boots on without the app's secrets.
 */
async function injectSecrets(
  declared: DeclaredEnv | undefined,
  api: PipelineOptions['api'],
  delivered: PipelineOptions['delivered'],
  logger: Logger.Instance,
  knownValues: KnownValues,
): Promise<void> {
  const fetched = api ? await fetchAppSecrets(api, logger) : (delivered ?? {});
  knownValues.add(knownValuesOf(fetched, declared, process.env));

  const plan = planSecretInjection(fetched, declared, process.env);
  if (plan.refused.length > 0) throw new SecretRefusalError(plan.refused);

  const set = Object.entries(plan.set);
  for (const [name, value] of set) process.env[name] = value;
  if (set.length > 0)
    logger.info(`Injected ${set.length} secret(s) into environment`);
  if (plan.notDeclared.length > 0)
    logger.info(
      `Not injected, the flow does not read them: ${plan.notDeclared.join(', ')}`,
    );
}

async function fetchAppSecrets(
  api: NonNullable<PipelineOptions['api']>,
  logger: Logger.Instance,
): Promise<Record<string, string>> {
  try {
    // Before the flow serves. Unless the bundle's read bought it already,
    // this buys the credential's first token (its first connect), bounded by
    // the token request's own time, and signs when the auth server is down.
    return await fetchSecrets({ app: api.app });
  } catch (error) {
    // Fatal: a 401/403 means the app refused the credential: replaced,
    // revoked or ended, or not a runner's. fetchSecrets classifies it as
    // RunnerAuthError before any generic status check.
    if (error instanceof RunnerAuthError) throw error;
    logger.warn(
      `Could not fetch secrets: ${error instanceof Error ? error.message : error}`,
    );
    logger.info('Continuing without secrets (flow may not require them)');
    return {};
  }
}
