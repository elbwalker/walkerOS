/**
 * Batched FlowState poster.
 *
 * Buffers FlowState records and flushes them to an HTTP endpoint either when
 * `batchMs` elapses since the first queued record, or when `batchSize` is
 * reached. Returns the emit callback that `createTelemetryObserver` consumes.
 *
 * Errors from the underlying fetch are swallowed (or routed through the
 * optional `onError` callback) so a transient observer outage cannot crash
 * the runtime.
 *
 * Uses the global `fetch` so the same primitive works in Node 18+, browsers,
 * and Edge runtimes. Tests may inject a stub via `opts.fetch`.
 */
import type { FlowState } from './types/telemetry';

/**
 * Minimum HTTP response surface the poster touches. Anything that exposes
 * `ok` and `status` works. Decoupling from the DOM `Response` type lets the
 * helper run in Edge, browser, and Node-only test environments without
 * requiring `lib: dom` or a polyfill.
 */
export interface PosterResponse {
  ok: boolean;
  status: number;
}

/**
 * Minimum fetch surface the poster needs. A subset of `typeof fetch` that
 * lets test harnesses pass a plain async function without dragging in the
 * Response/Request DOM types.
 */
export type PosterFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<PosterResponse>;

export interface BatchedPosterOptions {
  /** Absolute HTTP endpoint URL. POST with JSON array body. */
  url: string;
  /** Bearer token sent in the `Authorization` header. */
  token: string;
  /** Max time to wait before flushing the current batch. Default 50 ms. */
  batchMs?: number;
  /** Max records per batch. When reached, flushes immediately. Default 50. */
  batchSize?: number;
  /** Test seam. Defaults to the global `fetch`. */
  fetch?: PosterFetch;
  /** Called when the underlying POST rejects. Defaults to swallowing. */
  onError?: (err: unknown) => void;
}

/**
 * Build a batched emit callback. The returned function is synchronous, never
 * throws, and schedules an async flush in the background.
 *
 * Concurrency model: a single in-memory buffer plus a single pending timer.
 * When the timer fires (or `batchSize` is hit) the buffer is moved into a
 * local variable and reset, then POSTed. New records arriving during the in-
 * flight POST land in the next batch.
 */
export function createBatchedPoster(
  opts: BatchedPosterOptions,
): (state: FlowState) => void {
  const batchMs = opts.batchMs ?? 50;
  const batchSize = opts.batchSize ?? 50;
  // Lazy lookup of the global `fetch` so the helper imports cleanly even in
  // environments without one (it only fails when actually used). The cast
  // is to the narrowed PosterFetch surface, not to a broader type.
  const fetchImpl: PosterFetch =
    opts.fetch ?? ((url, init) => (globalThis.fetch as PosterFetch)(url, init));
  const onError =
    opts.onError ??
    (() => {
      // swallow
    });

  let buffer: FlowState[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush(): void {
    if (buffer.length === 0) return;
    const body = buffer;
    buffer = [];
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    // Fire-and-forget. We deliberately do not await; the emit caller is
    // synchronous and a slow observer must not block the pipeline.
    Promise.resolve()
      .then(() =>
        fetchImpl(opts.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${opts.token}`,
          },
          body: JSON.stringify(body),
        }),
      )
      .then((res) => {
        // 4xx/5xx is not an exception per fetch contract. Surface non-2xx
        // through onError so callers can record telemetry-of-telemetry,
        // but never throw out of this helper.
        if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
          onError(new Error(`Observer responded ${res.status}`));
        }
      })
      .catch((err) => {
        onError(err);
      });
  }

  return (state: FlowState): void => {
    buffer.push(state);
    if (buffer.length >= batchSize) {
      flush();
      return;
    }
    if (timer === null) {
      timer = setTimeout(flush, batchMs);
    }
  };
}
