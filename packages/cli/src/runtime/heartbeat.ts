import { randomBytes } from 'crypto';
import { VERSION } from '../version.js';
import { mergeAuthHeaders } from '../core/http.js';
import { stepId } from '@walkeros/core';
import type { Collector, Logger } from '@walkeros/core';
import type { DedupedError, RingEntry } from './log-ring.js';
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

const instanceId = randomBytes(8).toString('hex');

export function getInstanceId(): string {
  return instanceId;
}

export interface HeartbeatConfig {
  appUrl: string;
  token: string;
  projectId: string;
  flowId?: string;
  deploymentId?: string;
  configVersion?: string;
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
  updateConfigVersion(version: string): void;
}

/** Default debounce window for {@link HeartbeatHandle.flushSoon}. */
const DEFAULT_FLUSH_DEBOUNCE_MS = 1500;

export function createHeartbeat(
  config: HeartbeatConfig,
  logger: Logger.Instance,
): HeartbeatHandle {
  let timer: ReturnType<typeof setInterval> | null = null;
  const startTime = Date.now();
  let configVersion = config.configVersion;

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
        current = {
          in: status.in,
          out: status.out,
          failed: status.failed,
          destinations: snapshotDestinations(status),
        };
        counters = computeCounterDelta(current, lastReported);
      }

      const errors = config.getErrors ? redactErrors(config.getErrors()) : [];
      const logs = config.getLogs
        ? redactLogs(config.getLogs().slice(-50))
        : [];

      const response = await fetch(
        `${config.appUrl}/api/projects/${config.projectId}/runners/heartbeat`,
        {
          method: 'POST',
          headers: mergeAuthHeaders(config.token, {
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            instanceId,
            flowId: config.flowId,
            ...(config.deploymentId && {
              deploymentId: config.deploymentId,
            }),
            configVersion,
            cliVersion: VERSION,
            // Advertise the configured heartbeat cadence (milliseconds) so the
            // app reads the real interval instead of hard-coding a default for
            // staleness detection.
            intervalMs: config.intervalMs,
            uptime: Math.floor((Date.now() - startTime) / 1000),
            ...(counters && { counters }),
            // Always send recentErrors (even []) so a heartbeat that no longer
            // carries any errors clears a stale snapshot on the app side. logs
            // have no clear semantics, so they stay omit-when-empty.
            recentErrors: errors,
            ...(logs.length && { recentLogs: logs }),
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );

      // Use the same snapshot we computed the delta from — not the live status
      // which may have changed during the HTTP POST
      if (response.ok && counters && current) {
        lastReported = current;
      }

      if (response.status === 401 || response.status === 403) {
        logger.error(
          `Heartbeat auth failed (${response.status}). Token may have expired — redeploy to rotate.`,
        );
      }
    } catch (error) {
      // Deltas accumulate on failure — next successful send includes them
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

  function updateConfigVersion(version: string): void {
    configVersion = version;
  }

  return { start, stop, sendOnce, flushSoon, updateConfigVersion };
}
