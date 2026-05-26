import { randomBytes } from 'crypto';
import { VERSION } from '../version.js';
import { mergeAuthHeaders } from '../core/http.js';
import type { Collector, Logger } from '@walkeros/core';

export interface CounterPayload {
  eventsIn: number;
  eventsOut: number;
  eventsFailed: number;
  destinations: Record<
    string,
    { count: number; failed: number; duration: number }
  >;
}

export interface CounterSnapshot {
  in: number;
  out: number;
  failed: number;
  destinations: Record<
    string,
    { count: number; failed: number; duration: number }
  >;
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
    };
    destinations[name] = {
      count: dest.count - prev.count,
      failed: dest.failed - prev.failed,
      duration: dest.duration - prev.duration,
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
 * Deep-copy destination status values to prevent shared references
 * between snapshots from causing delta computation to always return 0.
 */
function snapshotDestinations(
  destinations: Record<
    string,
    { count: number; failed: number; duration: number }
  >,
): Record<string, { count: number; failed: number; duration: number }> {
  const result: Record<
    string,
    { count: number; failed: number; duration: number }
  > = {};
  for (const [name, dest] of Object.entries(destinations)) {
    result[name] = {
      count: dest.count,
      failed: dest.failed,
      duration: dest.duration,
    };
  }
  return result;
}

const instanceId = randomBytes(8).toString('hex');

export function getInstanceId(): string {
  return instanceId;
}

/**
 * Best-effort: pull `traceUntil` out of the heartbeat response and mirror
 * it into `process.env.WALKEROS_TRACE_UNTIL`. The resolver reads the env
 * on every call, so the next telemetry tick reflects the new state.
 *
 * A literal `null` clears the env var so the resolver falls back to the
 * flow's `observe` block. A malformed body or missing field leaves the env
 * var alone (no destructive default on a parse error).
 */
async function applyTraceUntilFromResponse(
  response: Response,
  logger: Logger.Instance,
): Promise<void> {
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.debug(`Heartbeat response parse failed: ${message}`);
    return;
  }

  if (typeof parsed !== 'object' || parsed === null) return;
  if (!('traceUntil' in parsed)) return;

  const value = parsed.traceUntil;
  if (typeof value === 'string' && value.length > 0) {
    process.env.WALKEROS_TRACE_UNTIL = value;
  } else if (value === null) {
    delete process.env.WALKEROS_TRACE_UNTIL;
  }
}

export interface HeartbeatConfig {
  appUrl: string;
  token: string;
  projectId: string;
  flowId?: string;
  deploymentId?: string;
  configVersion?: string;
  intervalMs: number;
  getCounters?: () => Collector.Status | undefined;
}

export interface HeartbeatHandle {
  start(): void;
  stop(): void;
  sendOnce(): Promise<void>;
  updateConfigVersion(version: string): void;
}

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
          destinations: snapshotDestinations(status.destinations),
        };
        counters = computeCounterDelta(current, lastReported);
      }

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
            uptime: Math.floor((Date.now() - startTime) / 1000),
            ...(counters && { counters }),
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );

      // Use the same snapshot we computed the delta from — not the live status
      // which may have changed during the HTTP POST
      if (response.ok && counters && current) {
        lastReported = current;
      }

      // Propagate the operator-controlled trace flag from the response into
      // the env so the next `resolveTelemetryOptions` tick picks it up
      // without a redeploy. Only act on a successful response: a failed
      // heartbeat leaves any active trace window in place.
      if (response.ok) {
        await applyTraceUntilFromResponse(response, logger);
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
  }

  function updateConfigVersion(version: string): void {
    configVersion = version;
  }

  return { start, stop, sendOnce, updateConfigVersion };
}
