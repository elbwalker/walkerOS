/**
 * Batched NDJSON poster: rows of any shape, posted to one endpoint with a
 * Bearer token. `send` posts rows now and resolves with their outcome (a report
 * that reads its own result); `push` and `flush` collect rows into batches.
 *
 * It never throws and never rejects. A failed request, a request with no
 * answer within the timeout and a row that cannot serialize each end as a
 * result or a counted drop, so the runtime it reports on runs on unchanged.
 *
 * Uses the global `fetch`, so it works in Node 18+, browsers and edge
 * runtimes. Cookies never travel (`credentials: 'omit'`) and no referrer is
 * sent. Tests inject a stub through `options.fetch`.
 */
import { getErrorMessage } from './getErrorMessage';

/** The part of a fetch response the poster reads. */
export interface PosterResponse {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
}

/** The request the poster makes: a part of fetch's `RequestInit`. */
export interface PosterRequest {
  method: 'POST';
  headers: Record<string, string>;
  body: string;
  keepalive: boolean;
  credentials: 'omit';
  referrerPolicy: 'no-referrer';
  signal?: AbortSignal;
}

/**
 * The fetch the poster calls; the global `fetch` is one. Structural, so core
 * needs no DOM types and a test needs no `Response` global (jsdom has none).
 */
export type PosterFetch = (
  url: string,
  init: PosterRequest,
) => Promise<PosterResponse>;

/** The outcome of one request, or of the first failed one of several. */
export type PostResult =
  | { ok: true }
  | { ok: false; status?: number; code?: string; message: string };

export interface BatchedPosterOptions {
  /** Endpoint every request is posted to. */
  url: string;
  /** Sent as `Authorization: Bearer <token>`. */
  token: string;
  /** Longest a pushed row waits for its batch, in ms. Default 50. */
  batchMs?: number;
  /** Rows that send a batch at once. Default 50. */
  batchSize?: number;
  /**
   * Largest body in UTF-8 bytes; more rows go in further requests, in order.
   * Default 60,000, at most 262,144 (what walkerOS ingest accepts). A single
   * row above it is sent alone, for the endpoint to refuse visibly. A page
   * leave's one body stays within `KEEPALIVE_BODY_BYTES` whatever this says.
   */
  maxBodyBytes?: number;
  /** Rows that may wait; beyond it the oldest is dropped. Default 500. */
  maxBuffered?: number;
  /** Longest a request may take, in ms. Default 10,000. */
  timeoutMs?: number;
  /** Defaults to the global `fetch`. */
  fetch?: PosterFetch;
  /**
   * Extra headers on every request. `Authorization` and `Content-Type` are
   * the poster's own and win in any casing, since a header name is
   * case-insensitive on the wire.
   */
  headers?: Record<string, string>;
  /**
   * Called with every request's outcome, and whether it was a page leave's
   * `keepalive` post. Its errors are ignored.
   */
  onResult?: (result: PostResult, post: { keepalive: boolean }) => void;
}

export interface BatchedPoster<Row> {
  /** Adds a row to the next batch. */
  push(row: Row): void;
  /**
   * Sends every waiting row. `keepalive` (a page leave) sends at once, without
   * waiting for a request already running, and only the newest rows that fit
   * one body of at most `KEEPALIVE_BODY_BYTES`: the page is gone before a
   * first answer.
   */
  flush(keepalive?: boolean): Promise<void>;
  /**
   * Sends the rows now and resolves with the outcome. `timeoutMs` bounds each
   * request of this call, for a report that must end by a deadline.
   */
  send(rows: Row[], options?: { timeoutMs?: number }): Promise<PostResult>;
  /**
   * Rows dropped so far: unserializable, pushed out of a full buffer, left
   * unsent after a failure the next body would meet too, or older than a page
   * leave's one body.
   */
  dropped(): number;
}

/** What walkerOS ingest accepts as one body (`/usage` and `/preview`). */
const MAX_BODY_BYTES = 262_144;

/**
 * A page leave's one body, in UTF-8 bytes. A page may have 64 KiB of
 * keepalive bodies in flight, shared with every destination's own page-leave
 * request, and the browser refuses a request past that. A quarter leaves the
 * rest to the destinations; the older rows are dropped and counted, and their
 * `seq` gap shows the loss.
 */
export const KEEPALIVE_BODY_BYTES = 16_384;

/** A whole number of at least 1, or the default for anything else. */
function positiveInt(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : fallback;
}

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

const noop = (): void => {};

/** One request's body and the rows it carries. */
interface Body {
  text: string;
  rows: number;
}

/** A failure the next body to the same endpoint would meet too. */
function repeats(result: PostResult): boolean {
  if (result.ok) return false;
  return (
    result.status === undefined || result.status === 429 || result.status >= 500
  );
}

export function createBatchedPoster<Row>(
  options: BatchedPosterOptions,
): BatchedPoster<Row> {
  const batchMs = positiveInt(options.batchMs, 50);
  const batchSize = positiveInt(options.batchSize, 50);
  const maxBodyBytes = Math.min(
    positiveInt(options.maxBodyBytes, 60_000),
    MAX_BODY_BYTES,
  );
  // No option raises it: a larger keepalive body would take the page's
  // budget from the destinations, or be refused itself.
  const keepaliveBodyBytes = Math.min(maxBodyBytes, KEEPALIVE_BODY_BYTES);
  const maxBuffered = positiveInt(options.maxBuffered, 500);
  const timeoutMs = positiveInt(options.timeoutMs, 10_000);
  // Read the global only when a request goes out, so the poster loads where
  // no fetch exists.
  const fetchImpl: PosterFetch =
    options.fetch ?? ((url, init) => fetch(url, init));

  // A caller's Authorization or Content-Type in any casing would merge with
  // the fixed pair into one invalid value once fetch normalizes the names.
  const callerHeaders: Record<string, string> = {};
  for (const [name, value] of Object.entries(options.headers ?? {})) {
    const lower = name.toLowerCase();
    if (lower === 'authorization' || lower === 'content-type') continue;
    callerHeaders[name] = value;
  }
  const headers = {
    ...callerHeaders,
    'Content-Type': 'application/x-ndjson',
    Authorization: `Bearer ${options.token}`,
  };

  let buffer: Row[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | undefined;
  let waiting: Promise<void> | undefined;
  let droppedRows = 0;

  function settle(result: PostResult, keepalive: boolean): PostResult {
    try {
      options.onResult?.(result, { keepalive });
    } catch {
      // onResult only observes; its failure changes no outcome.
    }
    return result;
  }

  /** One NDJSON line per row; a row that cannot serialize is dropped. */
  function linesOf(rows: readonly Row[]): string[] {
    const lines: string[] = [];
    for (const row of rows) {
      try {
        const line = JSON.stringify(row);
        if (typeof line === 'string') lines.push(line);
        else droppedRows++;
      } catch {
        // A BigInt or a cycle: this row is lost, the rest still go.
        droppedRows++;
      }
    }
    return lines;
  }

  /** The lines as bodies of at most `maxBodyBytes`, in order. */
  function bodiesOf(lines: readonly string[]): Body[] {
    const bodies: Body[] = [];
    let chunk: string[] = [];
    let size = 0;
    for (const line of lines) {
      const bytes = utf8ByteLength(line);
      if (chunk.length > 0 && size + 1 + bytes > maxBodyBytes) {
        bodies.push({ text: chunk.join('\n'), rows: chunk.length });
        chunk = [];
        size = 0;
      }
      size += (chunk.length > 0 ? 1 : 0) + bytes;
      chunk.push(line);
    }
    if (chunk.length > 0)
      bodies.push({ text: chunk.join('\n'), rows: chunk.length });
    return bodies;
  }

  /**
   * The newest lines that fit one page-leave body; the rest are dropped and
   * counted. A line above the cap on its own never fits, so it is skipped and
   * the older lines still go.
   */
  function newestBody(lines: readonly string[]): Body[] {
    const kept: string[] = [];
    let size = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      const length = utf8ByteLength(lines[i]);
      if (length > keepaliveBodyBytes) continue;
      const bytes = length + (kept.length > 0 ? 1 : 0);
      if (size + bytes > keepaliveBodyBytes) break;
      kept.push(lines[i]);
      size += bytes;
    }
    droppedRows += lines.length - kept.length;
    kept.reverse();
    return kept.length > 0
      ? [{ text: kept.join('\n'), rows: kept.length }]
      : [];
  }

  async function request(
    body: string,
    keepalive: boolean,
    signal: AbortSignal | undefined,
  ): Promise<PostResult> {
    try {
      const response = await fetchImpl(options.url, {
        method: 'POST',
        headers,
        body,
        keepalive,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal,
      });
      if (response.ok) return { ok: true };
      const code = response.headers.get('X-ClickHouse-Exception-Code');
      return {
        ok: false,
        status: response.status,
        ...(code ? { code } : {}),
        message: `responded ${response.status}`,
      };
    } catch (error) {
      return { ok: false, message: getErrorMessage(error) };
    }
  }

  async function post(
    body: string,
    keepalive: boolean,
    timeout: number,
  ): Promise<PostResult> {
    const controller =
      typeof AbortController === 'function' ? new AbortController() : undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<PostResult>((resolve) => {
      timer = setTimeout(() => {
        controller?.abort();
        resolve({ ok: false, message: `no answer within ${timeout} ms` });
      }, timeout);
    });
    try {
      return settle(
        await Promise.race([
          request(body, keepalive, controller?.signal),
          expired,
        ]),
        keepalive,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Posts the bodies in order; the first failure is the outcome. After no
   * answer, a rate limit or a server error the next body would meet the same,
   * so the rest are not sent and their rows are counted as lost; a body too
   * large fails alone.
   */
  async function postAll(
    rows: readonly Row[],
    keepalive: boolean,
    timeout = timeoutMs,
  ): Promise<PostResult> {
    const lines = linesOf(rows);
    const bodies = keepalive ? newestBody(lines) : bodiesOf(lines);
    if (bodies.length === 0)
      return settle(
        {
          ok: false,
          message: !rows.length
            ? 'no row to send'
            : !lines.length
              ? 'no row could be serialized'
              : `no row fits a page-leave body of ${keepaliveBodyBytes} bytes`,
        },
        keepalive,
      );
    let outcome: PostResult = { ok: true };
    for (let i = 0; i < bodies.length; i++) {
      const result = await post(bodies[i].text, keepalive, timeout);
      if (result.ok) continue;
      if (outcome.ok) outcome = result;
      if (repeats(result)) {
        for (const body of bodies.slice(i + 1)) droppedRows += body.rows;
        break;
      }
    }
    return outcome;
  }

  function flush(keepalive = false): Promise<void> {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    // One request at a time; the rows pushed meanwhile go next, in one
    // waiting turn. A page leave cannot wait, so it sends at once.
    if (inFlight && !keepalive) {
      if (!waiting)
        waiting = inFlight.then(() => {
          waiting = undefined;
          return flush();
        });
      return waiting;
    }
    if (buffer.length === 0) return Promise.resolve();
    const rows = buffer;
    buffer = [];
    const run = postAll(rows, keepalive)
      .then(noop, noop)
      .then(() => {
        if (inFlight === run) inFlight = undefined;
      });
    inFlight = run;
    return run;
  }

  return {
    push(row) {
      buffer.push(row);
      if (buffer.length > maxBuffered) {
        droppedRows += buffer.length - maxBuffered;
        buffer = buffer.slice(buffer.length - maxBuffered);
      }
      if (buffer.length >= batchSize) {
        void flush();
        return;
      }
      if (timer === undefined)
        timer = setTimeout(() => {
          timer = undefined;
          void flush();
        }, batchMs);
    },

    flush,

    send(rows, sendOptions) {
      return postAll(
        rows,
        false,
        positiveInt(sendOptions?.timeoutMs, timeoutMs),
      ).catch((error: unknown) =>
        settle({ ok: false, message: getErrorMessage(error) }, false),
      );
    },

    dropped() {
      return droppedRows;
    },
  };
}
