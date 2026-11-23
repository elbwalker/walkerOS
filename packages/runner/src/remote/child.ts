/**
 * The flow child of `runneros remote`: today's pipeline, run in a process of
 * its own per release, fed that release's secret values over the IPC channel
 * and reporting to its supervisor instead of the app. It holds no credential:
 * its steps' ingest writes are signed by the supervisor, asked over the same
 * channel.
 *
 * Everything this process sends its supervisor leaves the process, so it is
 * masked here first: every value the supervisor knows and every delivered
 * value is known before the first line is logged, the error ring keeps each
 * error as it was masked when stored, and a report masks again with every
 * value known by then.
 */

import { createCLILogger, createKnownValues } from '@walkeros/core/node';
import type { Authorize, Collector } from '@walkeros/core';
import type { KnownValues } from '@walkeros/core/node';
import { contentDigest } from '@walkeros/server-core';
import { runPipeline } from '../pipeline.js';
import { createRuntimeLogging, RUNTIME_COLORS } from '../runtime-logging.js';
import type { FlowLogger } from '../runtime-logging.js';
import {
  ErrorRing,
  LogRing,
  ringTap,
  type DedupedError,
  type RingEntry,
} from '../log-ring.js';
import { errorSinkPath, wireErrorSink } from '../error-sink.js';
import {
  counterSnapshot,
  DEFAULT_FLUSH_DEBOUNCE_MS,
  type HeartbeatHandle,
} from '../heartbeat.js';
import { redactErrors, redactLine, redactLogs } from '../redact.js';
import { SecretRefusalError } from '../secret-injection.js';
import {
  SIGN_REQUEST_BOUNDS,
  type ChildMessage,
  type ChildReport,
  type ChildStart,
  type SignAnswer,
  type SignRequest,
  type SupervisorMessage,
} from './ipc.js';

/** How long a child waits for its start message. */
export const START_TIMEOUT_MS = 10_000;

/** How long a step's sign waits for the supervisor's answer. */
export const SIGN_TIMEOUT_MS = 5000;

const SIGN_FIELDS: ReadonlyArray<keyof typeof SIGN_REQUEST_BOUNDS> = [
  'method',
  'url',
  'contentDigest',
];

interface WaitingSign {
  /** The Content-Digest the signature covers, answered beside it. */
  digest: string;
  timer: ReturnType<typeof setTimeout>;
  resolve(headers: Record<string, string>): void;
  reject(error: Error): void;
}

/**
 * The steps' signer in a remote child: each call sends the supervisor the
 * request's method, URL and the digest of its exact body, never the body,
 * and answers the two signature headers it gets back with that
 * `Content-Digest`. A request past the IPC bounds is refused here before it
 * is sent, since the supervisor would not act on it; a call waits at most
 * `timeoutMs`, and `close` rejects every waiting call and each later one.
 */
export function createIpcAuthorize(
  send: (message: SignRequest) => void,
  options: { timeoutMs?: number } = {},
): {
  authorize: Authorize;
  answer(message: SignAnswer): void;
  close(fact: string): void;
} {
  const timeoutMs = options.timeoutMs ?? SIGN_TIMEOUT_MS;
  const waiting = new Map<number, WaitingSign>();
  let nextId = 0;
  let closed: string | undefined;

  const authorize: Authorize = ({ method, url, body }) => {
    const request: SignRequest = {
      type: 'sign',
      id: nextId,
      method,
      url,
      contentDigest: contentDigest(body ?? new Uint8Array(0)),
    };
    for (const field of SIGN_FIELDS) {
      const max = SIGN_REQUEST_BOUNDS[field];
      if (request[field].length > max)
        return Promise.reject(
          new Error(
            `The request to sign is past the IPC bounds (${field}, ${max} characters)`,
          ),
        );
    }
    if (closed !== undefined) return Promise.reject(new Error(closed));
    nextId += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiting.delete(request.id);
        reject(
          new Error(`The supervisor did not sign within ${timeoutMs / 1000} s`),
        );
      }, timeoutMs);
      waiting.set(request.id, {
        digest: request.contentDigest,
        timer,
        resolve,
        reject,
      });
      send(request);
    });
  };

  return {
    authorize,
    answer(message) {
      const call = waiting.get(message.id);
      if (!call) return;
      waiting.delete(message.id);
      clearTimeout(call.timer);
      if (message.type === 'sign-refused') {
        call.reject(new Error(message.message));
        return;
      }
      call.resolve({
        'Signature-Input': message.headers['Signature-Input'],
        Signature: message.headers.Signature,
        'Content-Digest': call.digest,
      });
    },
    close(fact) {
      closed = fact;
      for (const call of waiting.values()) {
        clearTimeout(call.timer);
        call.reject(new Error(fact));
      }
      waiting.clear();
    },
  };
}

/** The child's end of the channel to its supervisor. */
export interface ParentLink {
  send(message: ChildMessage): void;
  onMessage(listener: (message: SupervisorMessage) => void): void;
  onDisconnect(listener: () => void): void;
}

export interface ChildDeps {
  runPipeline: typeof runPipeline;
  /** Ends the process: the entry exits once what was sent has left. */
  exit(code: number): void;
  /** Signals this process, so the pipeline's own handler drains it. */
  kill(signal: NodeJS.Signals): void;
}

/**
 * Run the flow child: wait for the start message, then run the pipeline with
 * the release's flow and values. Settles when the run ends on this side (no
 * start in time, or a start that failed); a running flow keeps it pending.
 */
export function runChild(
  parent: ParentLink,
  deps: Partial<ChildDeps> = {},
): Promise<void> {
  const run = deps.runPipeline ?? runPipeline;
  const exit = deps.exit ?? ((code: number) => process.exit(code));
  const kill =
    deps.kill ??
    ((signal: NodeJS.Signals) => process.kill(process.pid, signal));

  let logger = createCLILogger({}, RUNTIME_COLORS);
  let reporter: HeartbeatHandle | undefined;
  let started = false;
  let ready = false;
  const signer = createIpcAuthorize((message) => parent.send(message));

  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      logger.error(
        `No start message from the supervisor within ${START_TIMEOUT_MS / 1000} s`,
      );
      exit(1);
      resolve();
    }, START_TIMEOUT_MS);

    parent.onDisconnect(() => {
      clearTimeout(timer);
      signer.close('The supervisor disconnected');
      if (ready) {
        logger.error('The supervisor disconnected; the flow drains');
        kill('SIGTERM');
      } else {
        logger.error('The supervisor disconnected before the flow was ready');
        exit(1);
        resolve();
      }
    });

    parent.onMessage((message) => {
      if (message.type === 'report') {
        void reporter?.sendOnce();
        return;
      }
      if (message.type === 'signed' || message.type === 'sign-refused') {
        signer.answer(message);
        return;
      }
      // One release per child: a later start is not acted on.
      if (started) return;
      started = true;
      clearTimeout(timer);
      void begin(message).then(resolve);
    });

    async function begin(start: ChildStart): Promise<void> {
      // Known before any line of this release is logged.
      const knownValues = createKnownValues([
        ...start.known,
        ...Object.values(start.values),
      ]);
      const errorRing = new ErrorRing(20);
      const logRing = new LogRing(100);
      wireErrorSink(errorRing, errorSinkPath(start.folder));

      const logging = createRuntimeLogging(
        {
          verbose: start.verbose,
          silent: start.silent,
          json: start.json,
          onLine: ringTap({ errorRing, logRing }),
          knownSecrets: knownValues,
        },
        RUNTIME_COLORS,
      );
      logger = logging.logger;

      const rings = {
        send: (report: ChildReport) => parent.send(report),
        getErrors: () => errorRing.snapshot(),
        getLogs: () => logRing.snapshot(),
        knownValues,
      };
      // Until the flow is ready there are no counters to report.
      reporter = createChildReporter({
        ...rings,
        getCounters: () => undefined,
      });

      let formatSent = false;
      const flowLogger: FlowLogger = {
        ...logging.flowLogger,
        onLogger: (settings) => {
          logging.flowLogger.onLogger(settings);
          if (formatSent || !settings.format) return;
          formatSent = true;
          parent.send({ type: 'format', format: settings.format });
        },
      };

      try {
        await run({
          bundlePath: start.flowFile,
          port: start.port,
          logger: logging.logger.scope('runner'),
          loggerConfig: logging.collectorConfig,
          flowLogger,
          format: logging.format,
          errorRing,
          logRing,
          knownValues,
          instanceId: start.instanceId,
          delivered: start.values,
          authorize: signer.authorize,
          report: (collector) => {
            reporter?.stop();
            reporter = createChildReporter({
              ...rings,
              getCounters: () => collector.status,
              release: collector.release,
            });
            return reporter;
          },
          onReady: () => {
            ready = true;
            parent.send({ type: 'ready' });
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logging.logger.error(`Error: ${message}`);
        parent.send({
          type: 'failed',
          message: redactLine(message, { known: knownValues.compiled() }),
          ...(error instanceof SecretRefusalError && {
            refused: error.refused,
          }),
        });
        exit(1);
      }
    }
  });
}

/**
 * The child's report to its supervisor, in the heartbeat's place. It runs no
 * timer: the supervisor asks at each check-in (`sendOnce`, which the drain
 * also calls once), and a new distinct error sends one unasked report after
 * the debounce, so an error storm sends no message per line. Counters are the
 * raw cumulative snapshot; errors and lines are masked and cut for the wire.
 */
export function createChildReporter(config: {
  send(report: ChildReport): void;
  getCounters(): Collector.Status | undefined;
  getErrors(): DedupedError[];
  getLogs(): RingEntry[];
  knownValues: KnownValues;
  release?: string;
  flushDebounceMs?: number;
}): HeartbeatHandle {
  const flushDebounceMs = config.flushDebounceMs ?? DEFAULT_FLUSH_DEBOUNCE_MS;
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  function report(reason: ChildReport['reason']): ChildReport {
    const status = config.getCounters();
    return {
      type: 'report',
      reason,
      ...(status && { counters: counterSnapshot(status) }),
      ...(config.release !== undefined && { release: config.release }),
      errors: redactErrors(config.getErrors(), config.knownValues.compiled()),
      logs: redactLogs(config.getLogs().slice(-50)),
    };
  }

  return {
    start() {},
    stop() {
      stopped = true;
      clearTimeout(flushTimer);
      flushTimer = undefined;
    },
    sendOnce() {
      config.send(report('asked'));
      return Promise.resolve();
    },
    flushSoon() {
      if (stopped || flushTimer) return;
      flushTimer = setTimeout(() => {
        flushTimer = undefined;
        config.send(report('new-error'));
      }, flushDebounceMs);
    },
  };
}
