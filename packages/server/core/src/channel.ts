import type { Authorize } from '@walkeros/core';
import { networkErrorMessage } from '@walkeros/core';
import { fullJitterDelay, retryAfterMs } from './backoff';

/** Why a request to the app did not answer as asked. */
export type ChannelFailure =
  | 'transport'
  | 'timeout'
  | 'size'
  | 'redirect'
  | 'refused';

/** A request that failed: `failure` says how, `status` is the HTTP status when one came. */
export class ChannelError extends Error {
  readonly failure: ChannelFailure;
  readonly status?: number;
  /** The answer's `Retry-After`, in ms from when it came. */
  readonly retryAfterMs?: number;
  /** Which hop failed: the request's own URL, or the one redirect it followed. */
  readonly hop?: 'origin' | 'redirect';

  constructor(
    message: string,
    failure: ChannelFailure,
    options: {
      status?: number;
      retryAfterMs?: number;
      hop?: 'origin' | 'redirect';
      cause?: unknown;
    } = {},
  ) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = 'ChannelError';
    this.failure = failure;
    this.status = options.status;
    this.retryAfterMs = options.retryAfterMs;
    this.hop = options.hop;
  }
}

export interface ChannelRequest {
  url: string;
  /** Called once per request with its method, URL and body bytes, never for a redirect hop. */
  authorize: Authorize;
  /** One limit from the request's start, for the answer's headers and its whole body. */
  timeoutMs: number;
}

type Hop = NonNullable<ChannelError['hop']>;

/** What a hop of a request needs to name its failures. */
interface Attempt {
  signal: AbortSignal;
  timeoutMs: number;
  hop: Hop;
}

/**
 * A GET that sends `If-None-Match` when given an `etag`: answers the body of
 * a 200 (at most `maxBytes`) with its ETag, or a 304 or a 404; anything else
 * throws a `ChannelError`.
 */
export async function conditionalGet(
  request: ChannelRequest & { etag?: string; maxBytes: number },
): Promise<
  | { status: 200; etag?: string; body: Uint8Array }
  | { status: 304 }
  | { status: 404 }
> {
  const attempt = originAttempt(request);
  const headers: Record<string, string> =
    request.etag === undefined ? {} : { 'If-None-Match': request.etag };
  const response = await send(request, 'GET', attempt, { headers });
  if (response.status === 304 || response.status === 404) {
    discard(response);
    return response.status === 304 ? { status: 304 } : { status: 404 };
  }
  if (response.status !== 200) throw answerFailure(response, attempt.hop);
  const body = await readCapped(response, request.maxBytes, attempt);
  const etag = response.headers.get('etag');
  return etag === null ? { status: 200, body } : { status: 200, etag, body };
}

/** A POST of `body` as JSON: answers the body of a 2xx, at most `maxBytes`; anything else throws a `ChannelError`. */
export async function postJson(
  request: ChannelRequest & { body: unknown; maxBytes: number },
): Promise<Uint8Array> {
  const attempt = originAttempt(request);
  const body = new TextEncoder().encode(JSON.stringify(request.body));
  const response = await send(request, 'POST', attempt, {
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!response.ok) throw answerFailure(response, attempt.hop);
  return readCapped(response, request.maxBytes, attempt);
}

/**
 * A GET whose 2xx body is read chunk by chunk, by pull, so a slow consumer
 * holds the socket back instead of meeting a stream that was paused under it.
 * With `followRedirectWithoutCredentials` it follows one redirect, sent with
 * no `authorize` header, to an `https:` location or one of the request's own
 * scheme. The time limit runs on while the body is read.
 */
export async function openStream(
  request: ChannelRequest & { followRedirectWithoutCredentials?: boolean },
): Promise<AsyncIterable<Uint8Array>> {
  let attempt = originAttempt(request);
  let response = await send(request, 'GET', attempt);
  if (isRedirect(response.status) && request.followRedirectWithoutCredentials) {
    const target = redirectTarget(response, request.url);
    attempt = { ...attempt, hop: 'redirect' };
    response = await fetchOnce(
      target,
      { method: 'GET', redirect: 'manual', signal: attempt.signal },
      attempt,
    );
    if (isRedirect(response.status)) {
      discard(response);
      throw new ChannelError(
        `HTTP ${response.status} after a redirect`,
        'redirect',
        { status: response.status, hop: attempt.hop },
      );
    }
  }
  if (!response.ok) throw answerFailure(response, attempt.hop);
  return chunksOf(response, attempt);
}

/** Passes `chunks` on until their total passes `maxBytes`, then throws `size`. */
export function cappedChunks(
  chunks: AsyncIterable<Uint8Array>,
  maxBytes: number,
): AsyncIterable<Uint8Array> {
  return capped(chunks, maxBytes);
}

async function* capped(
  chunks: AsyncIterable<Uint8Array>,
  maxBytes: number,
  hop?: Hop,
): AsyncIterable<Uint8Array> {
  let total = 0;
  for await (const chunk of chunks) {
    total += chunk.byteLength;
    if (total > maxBytes)
      throw new ChannelError(`Answer larger than ${maxBytes} bytes`, 'size', {
        hop,
      });
    yield chunk;
  }
}

/** The request's own URL, under one time limit from now. */
function originAttempt(request: ChannelRequest): Attempt {
  return {
    signal: AbortSignal.timeout(request.timeoutMs),
    timeoutMs: request.timeoutMs,
    hop: 'origin',
  };
}

async function send(
  request: ChannelRequest,
  method: string,
  attempt: Attempt,
  extra: { headers?: Record<string, string>; body?: Uint8Array } = {},
): Promise<Response> {
  const { url } = request;
  const { body } = extra;
  const authorization = await authorizeWithin(
    request.authorize,
    body === undefined ? { method, url } : { method, url, body },
    attempt,
  );
  const headers = new Headers();
  for (const [name, value] of Object.entries(authorization))
    setHeader(headers, name, value, 'authorize answered', attempt.hop);
  for (const [name, value] of Object.entries(extra.headers || {}))
    setHeader(headers, name, value, 'the request has', attempt.hop);
  return fetchOnce(
    url,
    { method, headers, body, redirect: 'manual', signal: attempt.signal },
    attempt,
  );
}

/** RFC 9110 token: the characters a header name may hold. */
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

/**
 * Sets one header. A name or value HTTP cannot carry (CR, LF, NUL) fails
 * naming the header only: `Headers` quotes the value in its own error, and a
 * value can be a credential, so that error is dropped, not kept as a cause.
 */
function setHeader(
  headers: Headers,
  name: string,
  value: string,
  source: string,
  hop: Hop,
): void {
  if (!HEADER_NAME.test(name))
    throw new ChannelError(
      `${source} a header name HTTP cannot carry`,
      'transport',
      { hop },
    );
  try {
    headers.set(name, value);
  } catch {
    throw new ChannelError(
      `${source} a value for header ${name} that HTTP cannot carry`,
      'transport',
      { hop },
    );
  }
}

/**
 * The request's headers from `authorize`, waited for no longer than the
 * request's time limit: the channel cannot abort the call, so it stops
 * waiting, and a late answer is ignored and sends nothing.
 */
function authorizeWithin(
  authorize: Authorize,
  call: Parameters<Authorize>[0],
  attempt: Attempt,
): Promise<Record<string, string>> {
  const { signal } = attempt;
  return new Promise((resolve, reject) => {
    const onAbort = () =>
      reject(
        new ChannelError(
          `authorize did not answer within ${attempt.timeoutMs} ms`,
          'timeout',
          { hop: attempt.hop },
        ),
      );
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    const settled = () => signal.removeEventListener('abort', onAbort);
    // Through then, so a synchronous throw is a rejection like any other.
    Promise.resolve()
      .then(() => authorize(call))
      .then(
        (headers) => {
          settled();
          resolve(headers);
        },
        (error: unknown) => {
          settled();
          reject(error);
        },
      );
  });
}

async function fetchOnce(
  url: string,
  init: RequestInit,
  attempt: Attempt,
): Promise<Response> {
  try {
    // Read at call time, so a replaced global fetch is the one used.
    return await globalThis.fetch(url, init);
  } catch (error) {
    throw thrownFailure(error, attempt);
  }
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

/** The one redirect a stream may follow: a readable Location of an allowed scheme. */
function redirectTarget(response: Response, from: string): string {
  const { status } = response;
  const location = response.headers.get('location');
  discard(response);
  if (location === null || !URL.canParse(location, from))
    throw new ChannelError(
      `HTTP ${status} without a readable Location`,
      'redirect',
      { status, hop: 'origin' },
    );
  const target = new URL(location, from);
  if (
    target.protocol !== 'https:' &&
    target.protocol !== new URL(from).protocol
  )
    throw new ChannelError(
      `HTTP ${status} to a ${target.protocol} location`,
      'redirect',
      { status, hop: 'origin' },
    );
  return target.href;
}

/** The failure an answer that is not the one asked for stands for. */
function answerFailure(response: Response, hop: Hop): ChannelError {
  const { status } = response;
  const retryAfter = retryAfterMs(response.headers.get('retry-after'));
  discard(response);
  if (isRedirect(status))
    return new ChannelError(`HTTP ${status}`, 'redirect', { status, hop });
  const failure = status === 401 || status === 403 ? 'refused' : 'transport';
  return new ChannelError(`HTTP ${status}`, failure, {
    status,
    retryAfterMs: retryAfter,
    hop,
  });
}

/** A thrown error as a `ChannelError`: `timeout` once the request's limit has passed. */
function thrownFailure(error: unknown, attempt: Attempt): ChannelError {
  if (error instanceof ChannelError) return error;
  if (attempt.signal.aborted)
    return new ChannelError(
      `Request timed out after ${attempt.timeoutMs} ms`,
      'timeout',
      { hop: attempt.hop, cause: error },
    );
  return new ChannelError(networkErrorMessage(error), 'transport', {
    hop: attempt.hop,
    cause: error,
  });
}

/** Frees the connection of an answer whose body is never read. */
function discard(response: Response): void {
  // A body that cannot be cancelled has already ended or failed: nothing to free.
  response.body?.cancel().catch(() => undefined);
}

/**
 * The body by pull. Leaving early (a consumer that stops, a cap) cancels the
 * rest, which closes the connection.
 */
async function* chunksOf(
  response: Response,
  attempt: Attempt,
): AsyncIterable<Uint8Array> {
  if (!response.body) return;
  const reader = response.body.getReader();
  try {
    while (true) {
      const result = await reader.read().catch((error: unknown) => {
        throw thrownFailure(error, attempt);
      });
      if (result.done) return;
      yield result.value;
    }
  } finally {
    // On a body read to its end this does nothing.
    await reader.cancel().catch(() => undefined);
  }
}

async function readCapped(
  response: Response,
  maxBytes: number,
  attempt: Attempt,
): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of capped(
    chunksOf(response, attempt),
    maxBytes,
    attempt.hop,
  )) {
    parts.push(chunk);
    total += chunk.byteLength;
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    body.set(part, offset);
    offset += part.byteLength;
  }
  return body;
}

/** The runner's check-in schedule: the values its check-in loop takes. */
export const CHECK_IN_INTERVAL_MS = 30_000;
/** ±10 % around an interval, and around the refused hold. */
export const CHECK_IN_JITTER = 0.1;
/** The back-off's cap, and the hold after a refused check-in. */
export const MAX_BACKOFF_MS = 300_000;
/** The longest interval an answer may ask for. */
export const MAX_ANSWER_INTERVAL_MS = 3_600_000;
/** The least time between the starts of an early check-in and the one before. */
export const EARLY_CHECK_IN_GAP_MS = 10_000;

/** What `onOutcome` hears after each check-in: a failure with the delay it set. */
export type CheckInOutcome =
  | { ok: true }
  | { ok: false; error: unknown; nextDelayMs: number };

/** What one check-in gave: its answer, or what it threw. */
export type CheckInResult =
  | { ok: true; answer: { intervalMs?: number } }
  | { ok: false; error: unknown };

export interface CheckInLoop {
  /** Schedules the first check-in `firstDelayMs` from now. */
  start(firstDelayMs: number): void;
  /**
   * Starts after a check-in the caller made before the loop: its result is
   * taken as one of the loop's own, started now, so a failure counts as the
   * first in a row and the first delay and `onOutcome` follow the same rules.
   */
  startAfter(result: CheckInResult): void;
  /** Ends the schedule: a check-in still running schedules nothing after it. */
  stop(): void;
  /**
   * Asks for a check-in now: at most one per `minGapMs` from the last start,
   * never beside a running one (that one is followed by it), and never inside
   * the wait after a failure, so the back-off and `Retry-After` hold.
   */
  soon(): void;
  /** The interval the last answer set (see createCheckInLoop), else `intervalMs`. */
  intervalMs(): number;
}

/**
 * Runs `checkIn` on a schedule: `intervalMs` ±`jitter` after a success (an
 * answer's own `intervalMs` when it is an integer from `intervalMs` to
 * `maxAnswerIntervalMs`); after the n-th failure in a row `fullJitterDelay`
 * up to `maxBackoffMs`, raised to a `Retry-After` up to `maxBackoffMs`; after
 * a `refused` failure `maxBackoffMs` ±`jitter`.
 */
export function createCheckInLoop(options: {
  intervalMs: number;
  jitter: number;
  maxBackoffMs: number;
  maxAnswerIntervalMs: number;
  minGapMs: number;
  checkIn: () => Promise<{ intervalMs?: number }>;
  onOutcome?: (outcome: CheckInOutcome) => void;
  random?: () => number;
}): CheckInLoop {
  const random = options.random || Math.random;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dueAt = Infinity;
  let started = false;
  let stopped = false;
  let running = false;
  let askedWhileRunning = false;
  let failures = 0;
  let lastStartAt = -Infinity;
  let takenIntervalMs = options.intervalMs;

  const jittered = (ms: number) =>
    Math.round(ms * (1 + options.jitter * (2 * random() - 1)));

  const gapLeft = () =>
    Math.max(0, lastStartAt + options.minGapMs - Date.now());

  function schedule(delayMs: number): void {
    clearTimeout(timer);
    dueAt = Date.now() + delayMs;
    timer = setTimeout(run, delayMs);
  }

  function afterSuccess(answer: { intervalMs?: number }): number {
    const { intervalMs } = answer;
    takenIntervalMs =
      intervalMs !== undefined &&
      Number.isInteger(intervalMs) &&
      intervalMs >= options.intervalMs &&
      intervalMs <= options.maxAnswerIntervalMs
        ? intervalMs
        : options.intervalMs;
    return jittered(takenIntervalMs);
  }

  function afterFailure(error: unknown): number {
    if (error instanceof ChannelError && error.failure === 'refused')
      return jittered(options.maxBackoffMs);
    const delay = fullJitterDelay(failures, {
      baseMs: options.intervalMs,
      capMs: options.maxBackoffMs,
      random,
    });
    const asked =
      error instanceof ChannelError ? error.retryAfterMs : undefined;
    return asked === undefined
      ? delay
      : Math.max(delay, Math.min(asked, options.maxBackoffMs));
  }

  /** Schedules the next check-in from one result and reports it. */
  function settle(result: CheckInResult): void {
    let delay: number;
    let outcome: CheckInOutcome;
    if (result.ok) {
      failures = 0;
      delay = afterSuccess(result.answer);
      outcome = { ok: true };
    } else {
      failures += 1;
      delay = afterFailure(result.error);
      outcome = { ok: false, error: result.error, nextDelayMs: delay };
    }
    schedule(
      askedWhileRunning && failures === 0 ? Math.min(delay, gapLeft()) : delay,
    );
    if (options.onOutcome) options.onOutcome(outcome);
  }

  async function run(): Promise<void> {
    timer = undefined;
    dueAt = Infinity;
    running = true;
    askedWhileRunning = false;
    lastStartAt = Date.now();
    let result: CheckInResult;
    try {
      result = { ok: true, answer: await options.checkIn() };
    } catch (error) {
      result = { ok: false, error };
    }
    running = false;
    // After stop() nothing follows, so no outcome names a next check-in.
    if (stopped) return;
    settle(result);
  }

  return {
    start(firstDelayMs) {
      if (started || stopped) return;
      started = true;
      schedule(firstDelayMs);
    },
    startAfter(result) {
      if (started || stopped) return;
      started = true;
      lastStartAt = Date.now();
      settle(result);
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      timer = undefined;
    },
    soon() {
      if (!started || stopped || failures > 0) return;
      if (running) {
        askedWhileRunning = true;
        return;
      }
      const wait = gapLeft();
      if (Date.now() + wait < dueAt) schedule(wait);
    },
    intervalMs() {
      return takenIntervalMs;
    },
  };
}
