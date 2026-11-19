import { randomBytes } from 'crypto';
import { VERSION } from './version.js';
import { checkInUrl } from './api-paths.js';
import type { AppAuth } from './credentials.js';
import { stepId } from '@walkeros/core';
import { sendWithServiceAuth } from '@walkeros/server-core';
import type { Collector, Logger } from '@walkeros/core';
import type { KnownValues } from '@walkeros/core/node';
import type {
  DedupedError,
  RecentError,
  RecentLogEntry,
  RingEntry,
} from './log-ring.js';
import { redactErrors, redactLogs } from './redact.js';

/**
 * Per-destination heartbeat figures.
 *
 * `count`/`failed`/`duration`/`dropped` are deltas since the last reported
 * snapshot (monotonic counters). `dlqSize` is a point-in-time gauge (current
 * DLQ depth), reported as-is rather than delta'd so the operator sees the live
 * backlog, not how it changed between two heartbeats.
 */
export interface DestinationCounter {
  count: number;
  failed: number;
  duration: number;
  /** Current DLQ depth (gauge). */
  dlqSize: number;
  /** Events dropped from the destination's queue/DLQ buffers (delta). */
  dropped: number;
}

export interface CounterPayload {
  eventsIn: number;
  eventsOut: number;
  eventsFailed: number;
  destinations: Record<string, DestinationCounter>;
}

export interface CounterSnapshot {
  in: number;
  out: number;
  failed: number;
  destinations: Record<string, DestinationCounter>;
}

export function computeCounterDelta(
  current: CounterSnapshot,
  last: CounterSnapshot,
): CounterPayload {
  const destinations: CounterPayload['destinations'] = {};
  for (const [name, dest] of Object.entries(current.destinations)) {
    const prev = last.destinations[name] || {
      count: 0,
      failed: 0,
      duration: 0,
      dlqSize: 0,
      dropped: 0,
    };
    destinations[name] = {
      count: dest.count - prev.count,
      failed: dest.failed - prev.failed,
      duration: dest.duration - prev.duration,
      // dlqSize is a current-depth gauge, not a monotonic counter: report the
      // live value rather than the difference between two snapshots.
      dlqSize: dest.dlqSize,
      dropped: dest.dropped - prev.dropped,
    };
  }
  return {
    eventsIn: current.in - last.in,
    eventsOut: current.out - last.out,
    eventsFailed: current.failed - last.failed,
    destinations,
  };
}

/**
 * Build a per-destination snapshot from the collector status. Copies the
 * scalar counters (preventing shared references that would zero out deltas)
 * and folds in the destination's current DLQ depth (`dlqSize`) plus its total
 * dropped count (`status.dropped["destination.<id>"]`, summing queue + dlq).
 */
function snapshotDestinations(
  status: Collector.Status,
): Record<string, DestinationCounter> {
  const result: Record<string, DestinationCounter> = {};
  for (const [name, dest] of Object.entries(status.destinations)) {
    const drops = status.dropped[stepId('destination', name)];
    const dropped = (drops?.queue ?? 0) + (drops?.dlq ?? 0);
    result[name] = {
      count: dest.count,
      failed: dest.failed,
      duration: dest.duration,
      dlqSize: dest.dlqSize,
      dropped,
    };
  }
  return result;
}

/**
 * The collector's raw counters as one snapshot, with copies of the scalar
 * counters, so a later delta is not taken against the live status.
 */
export function counterSnapshot(status: Collector.Status): CounterSnapshot {
  return {
    in: status.in,
    out: status.out,
    failed: status.failed,
    destinations: snapshotDestinations(status),
  };
}

/**
 * A runner process's id: 16 lowercase hex characters, made once per process.
 * Its start line and every beat carry the same one, so a log line can be
 * matched to the instance the app shows.
 */
export function newInstanceId(): string {
  return randomBytes(8).toString('hex');
}

/** The longest release a beat carries; the app refuses a longer one. */
export const HEARTBEAT_RELEASE_MAX = 128;

/** The release a beat carries: 1 to {@link HEARTBEAT_RELEASE_MAX} characters. */
function sendableRelease(release: string | undefined): string | undefined {
  return release !== undefined &&
    release.length >= 1 &&
    release.length <= HEARTBEAT_RELEASE_MAX
    ? release
    : undefined;
}

export interface HeartbeatBodyInput {
  instanceId: string;
  /**
   * The release the loaded artifact baked onto its collector; sent only
   * with 1 to {@link HEARTBEAT_RELEASE_MAX} characters.
   */
  release?: string;
  intervalMs: number;
  uptimeS: number;
  counters?: CounterPayload;
  /** The errors and lines as they go on the wire, already masked and cut. */
  errors: RecentError[];
  logs: RecentLogEntry[];
}

/** The part of a beat's body every runner mode sends the same way. */
export function heartbeatBody(
  input: HeartbeatBodyInput,
): Record<string, unknown> {
  const release = sendableRelease(input.release);
  const { counters, errors, logs } = input;
  return {
    instanceId: input.instanceId,
    cliVersion: VERSION,
    ...(release !== undefined && { release }),
    // Advertise the configured heartbeat cadence (milliseconds) so the app
    // reads the real interval instead of hard-coding a default for staleness
    // detection.
    intervalMs: input.intervalMs,
    uptime: input.uptimeS,
    ...(counters && { counters }),
    // Always send recentErrors (even []) so a heartbeat that no longer
    // carries any errors clears a stale snapshot on the app side. logs have
    // no clear semantics, so they stay omit-when-empty.
    recentErrors: errors,
    ...(logs.length && { recentLogs: logs }),
  };
}

export interface HeartbeatConfig {
  /**
   * The app and the runner credential's headers. The check-in goes to its
   * origin and carries no id: the credential names the deployment.
   */
  app: AppAuth;
  /** This runner process's id ({@link newInstanceId}). */
  instanceId: string;
  intervalMs: number;
  /**
   * Debounce window (ms) for {@link HeartbeatHandle.flushSoon}. A burst of new
   * errors inside the window coalesces into ONE extra out-of-band POST. Default
   * 1500ms.
   */
  flushDebounceMs?: number;
  getCounters?: () => Collector.Status | undefined;
  getErrors?: () => DedupedError[];
  getLogs?: () => RingEntry[];
  /** The values masked in the errors and lines this heartbeat sends. */
  knownValues?: KnownValues;
  /** The release the loaded artifact baked onto its collector. */
  release?: string;
}

export interface HeartbeatHandle {
  start(): void;
  stop(): void;
  sendOnce(): Promise<void>;
  /**
   * Schedule a single out-of-band `sendOnce()` on a short debounce. Coalesces a
   * burst of calls within the window into ONE POST. Does NOT touch the steady
   * interval timer (the regular cadence keeps running); this is an extra beat so
   * a fresh distinct error egresses well before the next interval.
   *
   * ACCEPTED overlap: the flushed `sendOnce` and a steady-interval `sendOnce`
   * can run concurrently and both read/advance the shared `lastReported`. This
   * is harmless: the heartbeat endpoint is idempotent and the worst case is one
   * re-sent counter delta. No locking is added for this rare window.
   */
  flushSoon(): void;
}

/** Default debounce window for {@link HeartbeatHandle.flushSoon}. */
export const DEFAULT_FLUSH_DEBOUNCE_MS = 1500;

export function createHeartbeat(
  config: HeartbeatConfig,
  logger: Logger.Instance,
): HeartbeatHandle {
  let timer: ReturnType<typeof setInterval> | null = null;
  const startTime = Date.now();

  let lastReported: CounterSnapshot = {
    in: 0,
    out: 0,
    failed: 0,
    destinations: {},
  };

  async function sendOnce(): Promise<void> {
    try {
      // Read current counters and compute delta
      let counters: CounterPayload | undefined;
      let current: CounterSnapshot | undefined;
      const status = config.getCounters?.();
      if (status) {
        current = counterSnapshot(status);
        counters = computeCounterDelta(current, lastReported);
      }

      const known = config.knownValues?.compiled();
      const errors = config.getErrors
        ? redactErrors(config.getErrors(), known)
        : [];
      const logs = config.getLogs
        ? redactLogs(config.getLogs().slice(-50))
        : [];

      const url = checkInUrl(config.app.origin);
      // The bytes sent are the bytes a signature's Content-Digest covers.
      const body = new TextEncoder().encode(
        JSON.stringify(
          heartbeatBody({
            instanceId: config.instanceId,
            release: config.release,
            intervalMs: config.intervalMs,
            uptimeS: Math.floor((Date.now() - startTime) / 1000),
            counters,
            errors,
            logs,
          }),
        ),
      );
      const response = await sendWithServiceAuth(
        config.app,
        { method: 'POST', url, body },
        (headers) =>
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body,
            // The family never redirects: a redirect is a rejected beat, not
            // followed, so no proof, signature or body leaves the app's origin.
            redirect: 'manual',
            signal: AbortSignal.timeout(10_000),
          }),
      );

      // Use the same snapshot we computed the delta from, not the live status
      // which may have changed during the HTTP POST
      if (response.ok && counters && current) {
        lastReported = current;
      }

      // A 401 or 403 is the credential's refusal: the client wrote its line
      // (replaced, revoked or ended) once, and the runner keeps serving.
      if (!response.ok && response.status !== 401 && response.status !== 403) {
        // Nothing is lost (the deltas carry over), but the app did not take
        // this beat, so the operator should know.
        logger.warn(
          `Heartbeat rejected (${response.status}); its counters carry over to the next beat.`,
        );
      }
    } catch (error) {
      // Deltas accumulate on failure, next successful send includes them
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Heartbeat failed: ${message}`);
    }
  }

  function start(): void {
    sendOnce();
    const jitter = config.intervalMs * 0.1 * (Math.random() * 2 - 1);
    timer = setInterval(() => sendOnce(), config.intervalMs + jitter);
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }

  // Out-of-band flush: a single pending debounce timer coalesces a burst of
  // flushSoon() calls into one POST. Independent of the steady interval timer.
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  const flushDebounceMs = config.flushDebounceMs ?? DEFAULT_FLUSH_DEBOUNCE_MS;

  function flushSoon(): void {
    if (flushTimer) return; // already scheduled; coalesce into the pending beat
    flushTimer = setTimeout(() => {
      flushTimer = null;
      sendOnce();
    }, flushDebounceMs);
  }

  return { start, stop, sendOnce, flushSoon };
}
