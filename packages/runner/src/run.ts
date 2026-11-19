/**
 * Start command
 *
 * Entry point for `runneros start`: runs a PREBUILT walkerOS flow artifact.
 * This package cannot bundle. A flow config is built with `walkeros bundle`
 * first, and only the resulting artifact is handed to the runtime.
 */

import { existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { createTimer, getErrorMessage } from '@walkeros/core';
import type { Logger } from '@walkeros/core';
import {
  createCLILogger,
  createKnownValues,
  scrubSecrets,
} from '@walkeros/core/node';
import { errorSinkPath, wireErrorSink } from './error-sink.js';
import { ErrorRing, LogRing, ringTap } from './log-ring.js';
import { newInstanceId } from './heartbeat.js';
import { removeInstanceFolder } from './instance-folder.js';
import { connectApp, holdsCredential, type AppAuth } from './credentials.js';
import {
  isPrebuiltArtifact,
  resolveBundle,
  type ResolvedBundle,
} from './resolve-bundle.js';
import { validatePort } from './validators.js';
import { runPipeline, type PipelineOptions } from './pipeline.js';
import { createRuntimeLogging, RUNTIME_COLORS } from './runtime-logging.js';
import type { RunCommandOptions } from './types.js';

/** Artifact looked up in the working directory when none is given. */
const DEFAULT_ARTIFACT = 'flow.mjs';

/** Heartbeat cadence when none is configured, in seconds. */
const DEFAULT_HEARTBEAT_INTERVAL_S = 60;
/** Floor for the heartbeat cadence, in seconds: protects the app API from a tight loop. */
export const MIN_HEARTBEAT_INTERVAL_S = 10;

/**
 * Ceiling for the heartbeat cadence, in milliseconds. Node clamps any timer
 * delay above 2147483647 ms (2^31 - 1) to 1 ms, and the heartbeat adds up to
 * +10% jitter to the interval (heartbeat.ts `start`), so the cap is applied
 * BEFORE jitter with that headroom: floor(2147483647 / 1.1) = 1952257860 ms,
 * about 22.6 days.
 */
export const MAX_HEARTBEAT_INTERVAL_MS = Math.floor(2_147_483_647 / 1.1);

/**
 * Resolve `WALKEROS_HEARTBEAT_INTERVAL` (seconds) to milliseconds. Unset uses
 * the 60 s default. A value that is not a number, or is below 10 s (0 and
 * negatives included), is clamped to the 10 s minimum with a warning, and a
 * value whose jittered delay would pass Node's timer limit is capped at
 * {@link MAX_HEARTBEAT_INTERVAL_MS} with a warning, so neither a typo nor a
 * huge value can turn the heartbeat into a millisecond loop against the app.
 */
export function resolveHeartbeatIntervalMs(
  raw: string | undefined,
  logger: Pick<Logger.Instance, 'warn'>,
): number {
  if (raw === undefined || raw.trim() === '')
    return DEFAULT_HEARTBEAT_INTERVAL_S * 1000;
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds < MIN_HEARTBEAT_INTERVAL_S) {
    logger.warn(
      `Invalid heartbeat interval "${raw}"; using the ${MIN_HEARTBEAT_INTERVAL_S}s minimum`,
    );
    return MIN_HEARTBEAT_INTERVAL_S * 1000;
  }
  if (seconds * 1000 > MAX_HEARTBEAT_INTERVAL_MS) {
    logger.warn(
      `Heartbeat interval "${raw}" exceeds the timer limit; using the ${MAX_HEARTBEAT_INTERVAL_MS} ms maximum`,
    );
    return MAX_HEARTBEAT_INTERVAL_MS;
  }
  return seconds * 1000;
}

/** Default cache dir following XDG conventions */
function defaultCacheDir(): string {
  const xdgCache = process.env.XDG_CACHE_HOME;
  const base = xdgCache || path.join(homedir(), '.cache');
  return path.join(base, 'walkeros');
}

/**
 * Refuse anything that is not a prebuilt artifact. Runs on EVERY resolved
 * bundle, keyed on the artifact's shape and on no env var: this runtime has no
 * bundler, so a flow config reaching it is refused rather than built.
 *
 * A `file` source that does not exist is refused too, with the hint for the
 * usual cause (a Dockerfile that forgot to copy the build output), instead of
 * dying later with module-not-found inside the bundle import.
 */
export function assertPrebuiltArtifact(resolved: ResolvedBundle): void {
  if (!isPrebuiltArtifact(resolved.path))
    throw new Error(
      `BUNDLE must be a prebuilt artifact (.mjs, .js, .cjs, .tar.gz, .tgz), got ${resolved.path}. ` +
        `Build it first with \`walkeros bundle\`; this runtime cannot bundle.`,
    );

  if (resolved.source === 'file' && !existsSync(resolved.path))
    throw new Error(
      `Flow artifact not found: ${path.resolve(resolved.path)}. ` +
        `In a container, did you COPY --from=builder /build/dist/ /app/flow/ ?`,
    );
}

/**
 * The rings the heartbeat reads. The heartbeat and the error sink run only
 * with a credential, so without one no ring is built: it would only hold
 * lines nobody reads.
 */
function heartbeatRings(connected: boolean): {
  errorRing?: ErrorRing;
  logRing?: LogRing;
} {
  if (!connected) return {};
  const errorRing = new ErrorRing(20);
  return { errorRing, logRing: new LogRing(100) };
}

/**
 * CLI command function for `runneros start`
 */
export async function runCommand(options: RunCommandOptions): Promise<void> {
  const timer = createTimer();
  timer.start();

  const { errorRing, logRing } = heartbeatRings(holdsCredential(process.env));

  // The runner's and the collector's lines are tapped here: every ERROR, WARN
  // and INFO line, and a DEBUG line only with --verbose or a flow at DEBUG.
  // Without rings no line is masked here.
  const onLine = ringTap({ errorRing, logRing });

  // One id for this process: the start line prints it, each beat carries it.
  const instanceId = newInstanceId();

  // The values the runner masks: the pipeline adds every fetched secret value
  // and the value of every name the artifact declares, before the flow
  // starts, with or without the app. Both loggers and the heartbeat read the
  // set when they mask, so every line read from then on masks them, in the
  // console and in both rings.
  const knownValues = createKnownValues();

  // The runner's logger and the config the deployed bundle's collector builds
  // its own logger from (`context.logger`), so its destination errors flow
  // through the SAME `onLine` ring tap as the runner's lines. Without it,
  // production (no --verbose) passes no `context.logger`, the collector's
  // createLogger has no handler, and destination "Push failed" errors never
  // reach the ErrorRing (the heartbeat would report "No errors reported"
  // despite failed deliveries). Both use the flow's own `logger.format` once
  // the bundle reports it.
  const logging = createRuntimeLogging(
    { ...options, onLine, knownSecrets: knownValues },
    RUNTIME_COLORS,
  );
  const { logger } = logging;

  try {
    // The credential names the app and the deployment. It is read first,
    // before any flow code loads, and removed from the environment; an
    // unreadable one throws its fact and exits 1 below. Without it the
    // runner runs open source and calls no app.
    const link = connectApp({
      env: process.env,
      logger: logger.scope('runner'),
      knownValues,
    });
    const app = link?.app;

    // Resolve port
    const port = options.port ?? 8080;
    if (options.port !== undefined) {
      validatePort(options.port);
    }

    let apiConfig: PipelineOptions['api'] | undefined;

    if (app) {
      apiConfig = {
        app,
        heartbeatIntervalMs: resolveHeartbeatIntervalMs(
          process.env.WALKEROS_HEARTBEAT_INTERVAL ??
            process.env.HEARTBEAT_INTERVAL,
          logger,
        ),
        cacheDir:
          process.env.WALKEROS_CACHE_DIR ??
          process.env.CACHE_DIR ??
          defaultCacheDir(),
      };

      // Durable error persistence: only when a cacheDir exists (managed/API
      // run). Read-and-ship any errors that a prior boot on this port
      // persisted before a crash, then persist each new one. Best-effort
      // throughout.
      if (errorRing) {
        wireErrorSink(errorRing, errorSinkPath(apiConfig.cacheDir, port));
      }
    }

    const bundlePath = await resolveBundlePath(options.config, logger, app);

    // Run pipeline
    logger.info('Starting flow...');
    await runPipeline({
      bundlePath,
      port,
      logger: logger.scope('runner'),
      loggerConfig: logging.collectorConfig,
      flowLogger: logging.flowLogger,
      format: logging.format,
      api: apiConfig,
      // A deployment's door signer, for its steps' ingest writes.
      ...(link?.steps ? { authorize: link.steps } : {}),
      errorRing,
      logRing,
      knownValues,
      instanceId,
    });
  } catch (error) {
    const duration = timer.getElapsed() / 1000;
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      // The text path scrubs inside the logger handler; the shared jsonHandler
      // prints data verbatim (the CLI's machine output relies on that), so
      // scrub here. A failed fetch message can carry a presigned URL.
      logger.json({
        success: false,
        error: scrubSecrets(errorMessage, { known: knownValues.compiled() }),
        duration,
      });
    } else {
      logger.error(`Error: ${errorMessage}`);
    }
    process.exit(1);
  }
}

/**
 * Resolve the artifact to a local file path, then refuse anything that is not
 * a prebuilt artifact. The input is the `[artifact]` argument (or the BUNDLE
 * env var the bin falls back to): a local file, an http(s) URL, a
 * `.tar.gz` archive, or stdin. With no input, `flow.mjs` in the working
 * directory is used.
 */
async function resolveBundlePath(
  artifactInput: string | undefined,
  logger: ReturnType<typeof createCLILogger>,
  app: AppAuth | undefined,
): Promise<string> {
  const resolved: ResolvedBundle = artifactInput
    ? await resolveBundle(artifactInput, { app })
    : { path: DEFAULT_ARTIFACT, source: 'file' };

  // A bundle in a private folder (outside the image) is this process's
  // alone: the folder goes when the process exits, a refusal included.
  const { folder } = resolved;
  if (folder) process.on('exit', () => removeInstanceFolder(folder));

  assertPrebuiltArtifact(resolved);

  if (resolved.source === 'stdin') {
    logger.info('Bundle: received via stdin');
  } else if (resolved.source === 'url') {
    logger.info('Bundle: fetched from URL');
  } else {
    logger.info(`Bundle: ${resolved.path}`);
  }

  return path.resolve(resolved.path);
}

export type { RunCommandOptions };
