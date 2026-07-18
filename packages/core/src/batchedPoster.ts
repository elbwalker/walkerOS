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

/**
 * UTF-8 byte length of a string. `String.length` counts UTF-16 code units,
 * which under-measures multi-byte content (CJK, emoji) against byte-based
 * body caps. Counted arithmetically rather than via TextEncoder because
 * jsdom-style sandboxes lack a TextEncoder global; the arithmetic matches
 * `TextEncoder().encode(str).length` exactly (unpaired surrogates count as
 * the 3-byte U+FFFD replacement, per WHATWG encoding).
 */
function utf8ByteLength(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        // Valid surrogate pair: one astral code point, 4 UTF-8 bytes.
        bytes += 4;
        i++;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

/**
 * Versioned ingest wire format. Every POST body is one envelope; a batch
 * split into multiple chunks posts one complete envelope per chunk. The
 * version field lets the observer evolve its parse without sniffing shapes:
 * runtimes pinned to this poster keep emitting `v: 1` and the server keeps
 * accepting it.
 */
export interface IngestEnvelope {
  /** Wire format version. */
  v: 1;
  /** FlowState records in arrival order, each stamped with a seq. */
  records: FlowState[];
}

export interface BatchedPosterOptions {
  /** Absolute HTTP endpoint URL. POST with a versioned envelope JSON body. */
  url: string;
  /** Bearer token sent in the `Authorization` header. */
  token: string;
  /** Max time to wait before flushing the current batch. Default 50 ms. */
  batchMs?: number;
  /** Max records per batch. When reached, flushes immediately. Default 50. */
  batchSize?: number;
  /**
   * Max serialized body size in UTF-8 bytes (the wire size body caps are
   * enforced in). A batch whose JSON exceeds this is split in half
   * recursively until each chunk fits. Default 60000.
   */
  maxBodyBytes?: number;
  /** Test seam. Defaults to the global `fetch`. */
  fetch?: PosterFetch;
  /** Called when the underlying POST rejects. Defaults to swallowing. */
  onError?: (err: unknown) => void;
  /**
   * Extra headers merged into every request (e.g. `X-Walkeros-Binding`).
   * The fixed `Content-Type` and `Authorization` headers win on collision.
   */
  headers?: Record<string, string>;
  /**
   * Called with the HTTP status of every response, before any non-2xx
   * error handling. Lets callers react to a 401/404 (stop posting,
   * self-heal) without parsing error strings. Not called when the fetch
   * rejects, since no response exists.
   */
  onStatus?: (status: number) => void;
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
  // Narrow before use: nullish coalescing alone lets NaN, Infinity, 0, and
  // negatives through, all of which break setTimeout or starve the flush.
  // A garbage value falls back to the documented default rather than
  // clamping to the smallest legal step.
  const rawBatchMs = opts.batchMs;
  const batchMs =
    typeof rawBatchMs === 'number' &&
    Number.isFinite(rawBatchMs) &&
    rawBatchMs > 0
      ? Math.floor(rawBatchMs)
      : 50;

  const rawBatchSize = opts.batchSize;
  const batchSize =
    typeof rawBatchSize === 'number' &&
    Number.isFinite(rawBatchSize) &&
    rawBatchSize >= 1
      ? Math.floor(rawBatchSize)
      : 50;

  const rawMaxBodyBytes = opts.maxBodyBytes;
  const maxBodyBytes =
    typeof rawMaxBodyBytes === 'number' &&
    Number.isFinite(rawMaxBodyBytes) &&
    rawMaxBodyBytes >= 1
      ? Math.floor(rawMaxBodyBytes)
      : 60000;
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
  let seq = 0;

  /**
   * Serialize a batch into byte-bounded JSON bodies, preserving order. Each
   * body is a complete versioned envelope, and the byte limit is enforced
   * on that full wrapped serialization (the wire size). Each posted body is
   * serialized exactly once: a batch that fits (or a single-record leaf)
   * returns its own probe serialization; only oversized parents discard
   * theirs before recursing into halves. A single record that alone exceeds
   * the limit is emitted as its own body anyway: the server rejects it
   * (413) and the resulting seq gap makes the loss visible, which is
   * preferable to silently dropping it here.
   */
  function splitToBodies(batch: FlowState[]): string[] {
    const envelope: IngestEnvelope = { v: 1, records: batch };
    const body = JSON.stringify(envelope);
    if (batch.length <= 1) return [body];
    if (utf8ByteLength(body) <= maxBodyBytes) return [body];
    const mid = Math.floor(batch.length / 2);
    return [
      ...splitToBodies(batch.slice(0, mid)),
      ...splitToBodies(batch.slice(mid)),
    ];
  }

  /**
   * POST one pre-serialized chunk body. Always resolves: non-2xx and
   * rejections are routed to onError so the sequential flush loop can
   * proceed to the next chunk.
   */
  function postChunk(body: string): Promise<void> {
    return Promise.resolve()
      .then(() =>
        fetchImpl(opts.url, {
          method: 'POST',
          headers: {
            // Caller headers first so the fixed pair wins on collision.
            ...opts.headers,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${opts.token}`,
          },
          body,
        }),
      )
      .then((res) => {
        // Surface the raw status first so callers can react to 401/404
        // (stop posting, self-heal) without parsing error strings. Only
        // when a response actually exists; rejections carry no status.
        if (res && typeof res === 'object' && typeof res.status === 'number') {
          opts.onStatus?.(res.status);
        }
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

  function flush(): void {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const bodies = splitToBodies(batch);
    // Fire-and-forget. We deliberately do not await; the emit caller is
    // synchronous and a slow observer must not block the pipeline. Chunks
    // are POSTed sequentially (await previous before next) to preserve
    // arrival order at the observer.
    void (async () => {
      for (const body of bodies) {
        await postChunk(body);
      }
    })();
  }

  return (state: FlowState): void => {
    // Stamp a monotonic seq for gap detection. Spread-copy rather than mutate:
    // the emit callback is public and a caller may hand over a shared object.
    // Failed POSTs are never re-sequenced, so a lost record leaves a seq gap.
    buffer.push({ ...state, seq: ++seq });
    if (buffer.length >= batchSize) {
      flush();
      return;
    }
    if (timer === null) {
      timer = setTimeout(flush, batchMs);
    }
  };
}
