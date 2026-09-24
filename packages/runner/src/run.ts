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
import chalk from 'chalk';
import { Level, createTimer, getErrorMessage } from '@walkeros/core';
import type { Logger } from '@walkeros/core';
import {
  createCLILogger,
  createCLILoggerConfig,
  scrubSecrets,
  type CLILoggerColors,
} from '@walkeros/core/node';
import {
  ensureSinkDir,
  errorSinkPath,
  seedErrorRingFromJsonl,
} from './error-sink.js';
import { ErrorRing, LogRing } from './log-ring.js';
import { resolveAppUrl, resolveRunToken } from './credentials.js';
import {
  isPrebuiltArtifact,
  resolveBundle,
  type ResolvedBundle,
} from './resolve-bundle.js';
import { validatePort } from './validators.js';
import { runPipeline, type PipelineOptions } from './pipeline.js';
import type { RunCommandOptions } from './types.js';

/** The runtime's terminal colours, injected into the shared logger factory. */
const RUNTIME_COLORS: CLILoggerColors = { error: chalk.red };

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
 * CLI command function for `runneros start`
 */
export async function runCommand(options: RunCommandOptions): Promise<void> {
  const timer = createTimer();
  timer.start();

  const errorRing = new ErrorRing(20);
  const logRing = new LogRing(100);

  const LEVEL_NAME = {
    [Level.ERROR]: 'error',
    [Level.WARN]: 'warn',
    [Level.INFO]: 'info',
    [Level.DEBUG]: 'debug',
  } as const;

  const onLine = (level: Level, message: string) => {
    if (level === Level.ERROR) errorRing.add(message);
    logRing.add({ time: Date.now(), level: LEVEL_NAME[level], message });
  };

  const logger = createCLILogger({ ...options, onLine }, RUNTIME_COLORS);

  // The deployed bundle's collector builds its own logger from this config
  // (`context.logger`), so its destination errors flow through the SAME
  // `onLine` ring tap as the runtime logger above. Without this, production
  // (no --verbose) passes no `context.logger`, the collector's createLogger has
  // no handler, and destination "Push failed" errors never reach the ErrorRing
  // (the heartbeat would report "No errors reported" despite failed deliveries).
  const collectorLoggerConfig = createCLILoggerConfig(
    { ...options, onLine },
    RUNTIME_COLORS,
  );

  try {
    // Resolve port
    const port = options.port ?? 8080;
    if (options.port !== undefined) {
      validatePort(options.port);
    }

    // Resolve API config
    const flowId = options.flowId;
    const projectId = options.project;
    const token = resolveRunToken();
    const appUrl = resolveAppUrl();

    let apiConfig: PipelineOptions['api'] | undefined;

    if (flowId) {
      if (!token) {
        logger.error(
          `Remote flow requires authentication.\n\n` +
            `  No token found. Set one in the environment:\n` +
            `    $ export WALKEROS_DEPLOY_TOKEN=<your-token>`,
        );
        process.exit(1);
      }
      if (!projectId) {
        logger.error(
          `--flow-id requires --project or WALKEROS_PROJECT_ID.\n\n` +
            `  Set the project:\n` +
            `    $ runneros start --flow-id ${flowId} --project <your-project-id>\n` +
            `    $ export WALKEROS_PROJECT_ID=<your-project-id>`,
        );
        process.exit(1);
      }

      apiConfig = {
        appUrl,
        token,
        projectId,
        flowId,
        deploymentId: options.deploymentId,
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
      // run). Wire the synchronous jsonl sink, then read-and-ship any errors
      // that a prior boot persisted before a crash (seed into the ring so the
      // first heartbeat re-reports them, then truncate). Best-effort throughout.
      //
      // Ensure the cache dir exists BEFORE wiring the sink, so the synchronous
      // jsonl append can succeed on a fresh container.
      ensureSinkDir(apiConfig.cacheDir);
      const sinkPath = errorSinkPath(apiConfig.cacheDir);
      seedErrorRingFromJsonl(errorRing, sinkPath);
      errorRing.setSink(sinkPath);
    }

    const bundlePath = await resolveBundlePath(options.config, logger);

    // Run pipeline
    logger.info('Starting flow...');
    await runPipeline({
      bundlePath,
      port,
      logger: logger.scope('runner'),
      loggerConfig: collectorLoggerConfig,
      api: apiConfig,
      errorRing,
      logRing,
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
        error: scrubSecrets(errorMessage),
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
): Promise<string> {
  const resolved: ResolvedBundle = artifactInput
    ? await resolveBundle(artifactInput)
    : { path: DEFAULT_ARTIFACT, source: 'file' };

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
