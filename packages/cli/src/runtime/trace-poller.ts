import { setTraceUntil } from '@walkeros/core';
import { mergeAuthHeaders } from '../core/http.js';
import type { Logger } from '@walkeros/core';

/**
 * Minimum fetch surface the trace-poller needs. A subset of `typeof fetch`
 * that lets test harnesses pass a plain async function without dragging in
 * the Response/Request DOM types.
 */
export type TracePollerFetch = (
  url: string,
  init: { method: string; headers: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface TracePollerConfig {
  /** Absolute trace endpoint, e.g. `${base}/trace/${deploymentId}`. */
  url: string;
  /** Bearer token sent in the `Authorization` header. */
  token: string;
  /** Base poll interval in ms (±15% jitter applied per start). */
  intervalMs: number;
  /** Test seam. Defaults to the global `fetch`. */
  fetch?: TracePollerFetch;
}

export interface TracePollerHandle {
  start(): void;
  stop(): void;
  pollOnce(): Promise<void>;
}

/**
 * Polls the observer's `GET /trace/:deploymentId` and feeds the deployment's
 * `traceUntil` value into the shared `@walkeros/core` holder. The per-emit
 * telemetry supplier reads that holder, so trace flips on and off at runtime
 * without a redeploy.
 *
 * Only a 200 with a parseable body mutates the holder: a network error, a
 * non-200, or an unparseable body leaves the active trace window untouched
 * (no destructive default on a transient failure). A literal `null` clears
 * the holder so the resolver falls back to the flow's `observe` block.
 */
export function createTracePoller(
  config: TracePollerConfig,
  logger: Logger.Instance,
): TracePollerHandle {
  let timer: ReturnType<typeof setInterval> | null = null;
  let inFlight = false;
  const doFetch = config.fetch ?? defaultFetch;

  async function pollOnce(): Promise<void> {
    // Guard against overlapping polls: a slow request must not let a later poll
    // settle first and roll traceUntil back to stale data.
    if (inFlight) return;
    inFlight = true;
    try {
      let response: Awaited<ReturnType<TracePollerFetch>>;
      try {
        response = await doFetch(config.url, {
          method: 'GET',
          headers: mergeAuthHeaders(config.token),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.debug(`Trace poll error: ${message}`);
        return;
      }

      if (!response.ok) {
        logger.debug(`Trace poll non-200 (${response.status})`);
        return;
      }

      let parsed: unknown;
      try {
        parsed = await response.json();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.debug(`Trace poll response parse failed: ${message}`);
        return;
      }

      if (typeof parsed !== 'object' || parsed === null) return;
      if (!('traceUntil' in parsed)) return;

      const value = parsed.traceUntil;
      if (typeof value === 'string' && value.length > 0) {
        setTraceUntil(value);
      } else if (value === null) {
        setTraceUntil(null);
      }
    } finally {
      inFlight = false;
    }
  }

  function start(): void {
    // Idempotent: a second start() must not orphan the existing interval.
    if (timer) return;
    pollOnce();
    const jitter = config.intervalMs * 0.15 * (Math.random() * 2 - 1);
    timer = setInterval(() => pollOnce(), config.intervalMs + jitter);
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return { start, stop, pollOnce };
}

const defaultFetch: TracePollerFetch = (url, init) => fetch(url, init);
