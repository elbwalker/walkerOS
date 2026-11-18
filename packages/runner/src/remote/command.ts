/**
 * `runneros remote`: the supervisor's process. It reads its link to the
 * app, holds the port, checks in at boot, boots the best release it has,
 * then checks in on a schedule and works toward the release each answer
 * names. The flow runs in a child per release (`dist/remote-child.js`).
 *
 * This is the bin's, not the library's: the runner's index exports no
 * remote module.
 */

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { getErrorMessage, type Logger } from '@walkeros/core';
import { createKnownValues } from '@walkeros/core/node';
import {
  ChannelError,
  CHECK_IN_INTERVAL_MS,
  CHECK_IN_JITTER,
  createCheckInLoop,
  EARLY_CHECK_IN_GAP_MS,
  MAX_ANSWER_INTERVAL_MS,
  MAX_BACKOFF_MS,
  postJson,
  type CheckInLoop,
  type CheckInOutcome,
  type CheckInResult,
} from '@walkeros/server-core';
import { checkInUrl } from '../api-paths.js';
import { createHealthServer, type HealthServer } from '../health-server.js';
import { newInstanceId } from '../heartbeat.js';
import {
  createInstanceFolder,
  removeInstanceFolder,
} from '../instance-folder.js';
import { ErrorRing, LogRing, ringTap } from '../log-ring.js';
import { registerProcessGuards } from '../pipeline.js';
import { redactErrors, redactLogs } from '../redact.js';
import { createRuntimeLogging, RUNTIME_COLORS } from '../runtime-logging.js';
import { VERSION } from '../version.js';
import { appLinkFromEnvironment, type AppLink } from './app-link.js';
import { createReleaseCache, type ReleaseCache } from './cache.js';
import type { ChildStart } from './ipc.js';
import {
  checkInAnsweredLine,
  checkInFailedLine,
  checkInRefusedLine,
  heapLine,
  type HeapFacts,
} from './lines.js';
import { childHeapMb, grantedMemoryBytes } from './memory.js';
import type { RemoteOptions } from './options.js';
import { checkInBody, readCheckInAnswer } from './report.js';
import { spawnRemoteChild } from './spawn.js';
import { createSupervisor, type ChildHandle } from './supervisor.js';

/** The boot check-in's whole time, so a dead app never holds the boot. */
const BOOT_CHECK_IN_MS = 5000;
const CHECK_IN_ANSWER_MAX_BYTES = 16_384;
const CHECK_IN_TIMEOUT_MS = 10_000;

/** The supervisor's own rings: switches, refusals and crashes reach the check-in. */
const ERROR_RING_SIZE = 20;
const LOG_RING_SIZE = 100;
const LOGS_PER_CHECK_IN = 50;

/**
 * The port server: the runner's health server without a flow handler, so
 * `/health` answers 200 and every other path 503 while no child holds the
 * port. Opening an open one or closing a closed one does nothing.
 */
function createPortServer(port: number, logger: Logger.Instance) {
  let server: HealthServer | undefined;
  return {
    async open(): Promise<void> {
      if (!server) server = await createHealthServer(port, logger);
    },
    async close(): Promise<void> {
      const open = server;
      if (!open) return;
      server = undefined;
      // Its answers are short 503s: the next holder of the port needs it now.
      open.server.closeAllConnections();
      await open.close();
    },
  };
}

/** A failed check-in as its line names it: the HTTP status, else the failure. */
function failureOf(error: unknown): { refused?: number; reason: string } {
  if (!(error instanceof ChannelError))
    return { reason: getErrorMessage(error) };
  if (error.failure === 'refused' && error.status !== undefined)
    return { refused: error.status, reason: String(error.status) };
  return {
    reason: error.status === undefined ? error.failure : String(error.status),
  };
}

/** The check-in loop of `runneros remote`: the channel's schedule for a runner. */
export function remoteCheckInLoop(options: {
  checkIn: () => Promise<{ intervalMs?: number }>;
  onOutcome: (outcome: CheckInOutcome) => void;
  random?: () => number;
}): CheckInLoop {
  return createCheckInLoop({
    intervalMs: CHECK_IN_INTERVAL_MS,
    jitter: CHECK_IN_JITTER,
    maxBackoffMs: MAX_BACKOFF_MS,
    maxAnswerIntervalMs: MAX_ANSWER_INTERVAL_MS,
    minGapMs: EARLY_CHECK_IN_GAP_MS,
    ...options,
  });
}

/** The check-in's lines: one per change of state, refused, failed, answered again. */
export function checkInOutcomeLines(
  logger: Logger.Instance,
): (outcome: CheckInOutcome) => void {
  let failing: string | undefined;
  return (outcome) => {
    if (outcome.ok) {
      if (failing !== undefined) logger.info(checkInAnsweredLine());
      failing = undefined;
      return;
    }
    const { refused, reason } = failureOf(outcome.error);
    const state = refused === undefined ? reason : `refused ${refused}`;
    if (state === failing) return;
    failing = state;
    logger.error(
      refused === undefined
        ? checkInFailedLine(reason, outcome.nextDelayMs)
        : checkInRefusedLine(refused, outcome.nextDelayMs),
    );
  };
}

export async function runRemote(options: RemoteOptions): Promise<void> {
  const startedAt = Date.now();
  const errorRing = new ErrorRing(ERROR_RING_SIZE);
  const logRing = new LogRing(LOG_RING_SIZE);
  // Every secret value the supervisor handles; its lines and the children's
  // are masked with them.
  const knownValues = createKnownValues();
  const logging = createRuntimeLogging(
    {
      verbose: options.verbose,
      silent: options.silent,
      json: options.json,
      onLine: ringTap({ errorRing, logRing }),
      knownSecrets: knownValues,
    },
    RUNTIME_COLORS,
  );
  const { logger } = logging;
  // A stray exception or rejection writes one ERROR line and serving goes on.
  registerProcessGuards(logger, undefined, logging.format);

  const fail = (message: string): never => {
    logger.error(message);
    return process.exit(1);
  };

  const instanceId = newInstanceId();
  logger.info(`runneros remote v${VERSION}`);
  // No colon after the label: the redactor would read the id as a value.
  logger.info(`Instance ${instanceId}`);

  const heapNow = (): HeapFacts =>
    childHeapMb({
      grantedBytes: grantedMemoryBytes(),
      supervisorRssBytes: process.memoryUsage.rss(),
      flagMb: options.heapMb,
    });
  let heap: HeapFacts;
  try {
    heap = heapNow();
  } catch (error) {
    return fail(getErrorMessage(error));
  }
  logger.info(heapLine(heap));

  // Read once and removed from the environment, so no child inherits it.
  let link: AppLink;
  try {
    link = appLinkFromEnvironment({ env: process.env, logger, knownValues });
  } catch (error) {
    return fail(getErrorMessage(error));
  }

  let folder: string;
  try {
    folder = await createInstanceFolder();
  } catch (error) {
    return fail(getErrorMessage(error));
  }
  process.on('exit', () => removeInstanceFolder(folder));

  let cache: ReleaseCache;
  try {
    cache = await createReleaseCache(options.cacheDir, logger);
  } catch (error) {
    return fail(getErrorMessage(error));
  }

  const portServer = createPortServer(options.port, logger);
  try {
    await portServer.open();
  } catch (error) {
    return fail(
      `Port ${options.port} cannot be held: ${getErrorMessage(error)}`,
    );
  }

  const childEntry = fileURLToPath(
    new URL('./remote-child.js', import.meta.url),
  );
  const spawnChild = (start: ChildStart, heapMb: number): ChildHandle => {
    const child = spawnRemoteChild(
      {
        ...start,
        verbose: options.verbose,
        silent: options.silent,
        json: options.json,
      },
      { childEntry, heapMb, cwd: dirname(start.flowFile), env: process.env },
    );
    child.onMessage((message) => {
      // The supervisor writes in the running flow's format.
      if (message.type === 'format')
        logging.flowLogger.onLogger({ format: message.format });
      // A new distinct error goes out early, at most once per gap.
      else if (message.type === 'report' && message.reason === 'new-error')
        loop.soon();
    });
    return child;
  };

  const supervisor = createSupervisor({
    link,
    cache,
    folder,
    instanceId,
    port: options.port,
    env: process.env,
    knownValues,
    logger,
    spawnChild,
    portServer,
    heapMb: () => heapNow().heapMb,
  });

  // The loop owns the schedule, the boot check-in's outcome included.
  const loop = remoteCheckInLoop({
    checkIn: async () => {
      const answer = await checkIn(CHECK_IN_TIMEOUT_MS);
      void supervisor.consider(answer.release);
      return answer.intervalMs === undefined
        ? {}
        : { intervalMs: answer.intervalMs };
    },
    onOutcome: checkInOutcomeLines(logger),
  });

  const checkIn = async (timeoutMs: number) => {
    const children = await supervisor.report();
    const known = knownValues.compiled();
    const body = checkInBody({
      instanceId,
      intervalMs: loop.intervalMs(),
      heartbeat: options.heartbeat,
      remote: supervisor.state(),
      uptimeS: Math.floor((Date.now() - startedAt) / 1000),
      release: children.release,
      counters: children.counters,
      errors: [
        ...children.errors,
        ...redactErrors(errorRing.snapshot(), known),
      ],
      logs: [
        ...children.logs,
        ...redactLogs(logRing.snapshot(LOGS_PER_CHECK_IN)),
      ],
    });
    const answer = readCheckInAnswer(
      await postJson({
        url: checkInUrl(link.origin),
        authorize: link.authorize,
        timeoutMs,
        maxBytes: CHECK_IN_ANSWER_MAX_BYTES,
        body,
      }),
    );
    children.taken();
    return answer;
  };

  let stopping = false;
  const onSignal = (signal: NodeJS.Signals): void => {
    if (stopping) {
      logger.info(`Received ${signal} during shutdown, the drain goes on`);
      return;
    }
    stopping = true;
    logger.info(`Received ${signal}, stopping the flow`);
    loop.stop();
    void supervisor.stop().then((code) => {
      link.close();
      removeInstanceFolder(folder);
      process.exit(code);
    });
  };
  process.on('SIGTERM', () => onSignal('SIGTERM'));
  process.on('SIGINT', () => onSignal('SIGINT'));

  // The boot check-in, before the boot: the loop takes its outcome as its
  // first check-in, so a refusal or a failure is held as any other is.
  let named: number | null | undefined;
  let bootResult: CheckInResult;
  try {
    const answer = await checkIn(BOOT_CHECK_IN_MS);
    named = answer.release;
    bootResult = {
      ok: true,
      answer:
        answer.intervalMs === undefined
          ? {}
          : { intervalMs: answer.intervalMs },
    };
  } catch (error) {
    bootResult = { ok: false, error };
  }
  // At once: its line is written now, even when the boot then exits 1, and
  // the schedule runs from the boot check-in. A loop check-in during a long
  // boot queues its consider behind the boot.
  if (!stopping) loop.startAfter(bootResult);

  const booted = await supervisor.boot(named);
  // The supervisor wrote the line that says why.
  if (booted === 'nothing') {
    loop.stop();
    await portServer.close();
    link.close();
    return process.exit(1);
  }
}
