/**
 * Bounded, classified retry around a single `fetch`.
 *
 * Cold-starting flow containers fetch their bundle/config/secrets over the
 * network before the health server is up. A brief control-plane blip used to
 * hard-fail the boot: one timed-out fetch and the container exited inside
 * Scaleway's health window. This helper retries only TRANSIENT failures
 * (timeouts, connection errors, 5xx, 429) a bounded number of times, while
 * leaving deterministic failures (4xx other than 429) and successful responses
 * for the caller to handle. The total time budget keeps retries inside the
 * ~100s health window (failureThreshold 10 × interval 10s) so there is room
 * left for archive extract, flow load, and health-server start.
 */

/** Per-attempt request timeout. */
const DEFAULT_PER_ATTEMPT_TIMEOUT_MS = 30_000;

/** Total wall-clock budget across all attempts (including backoff sleeps). */
const DEFAULT_MAX_TOTAL_MS = 60_000;

/** Number of attempts (the first try plus retries). */
const DEFAULT_ATTEMPTS = 3;

/**
 * Floor of remaining budget below which starting another attempt is pointless:
 * a sub-millisecond AbortSignal.timeout would abort before the socket connects.
 * Stopping at/below this keeps total wall-clock genuinely within maxTotalMs.
 */
const MIN_ATTEMPT_BUDGET_MS = 1_000;

/**
 * Base backoff before retry #2 and #3 respectively. With fewer base entries
 * than retries, the final entry is reused for any further attempts.
 */
const BASE_BACKOFF_MS: readonly number[] = [2_000, 5_000];

/** Jitter band applied to each backoff: ±20%. */
const JITTER = 0.2;

/** libuv-style network error codes worth retrying. */
const RETRYABLE_NETWORK_CODES: ReadonlySet<string> = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
]);

export interface FetchWithRetryOptions {
  /** Total attempts (first try + retries). Default 3. */
  attempts?: number;
  /** Per-attempt request timeout in ms. Default 30_000. */
  perAttemptTimeoutMs?: number;
  /** Total wall-clock budget across attempts in ms. Default 60_000. */
  maxTotalMs?: number;
  /** Extra fetch init merged into each attempt (signal is supplied here). */
  init?: RequestInit;
}

/** Read an optional string `code` off an unknown error without casting. */
function readErrorCode(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const code = Reflect.get(value, 'code');
  return typeof code === 'string' ? code : undefined;
}

/** Read the `name` of a thrown error/DOMException without casting. */
function readErrorName(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const name = Reflect.get(value, 'name');
  return typeof name === 'string' ? name : undefined;
}

/**
 * Classify a thrown fetch rejection as transient (worth retrying).
 *
 * - AbortSignal.timeout / abort surfaces as a TimeoutError/AbortError.
 * - undici connection failures reject with a TypeError whose cause carries a
 *   libuv code, or expose the code directly. Treat any of the known codes
 *   (on the error or its cause) as transient; a bare network TypeError is also
 *   transient since fetch only rejects on genuine network failures, never on
 *   HTTP status.
 */
function isTransientThrow(error: unknown): boolean {
  const name = readErrorName(error);
  if (name === 'TimeoutError' || name === 'AbortError') return true;

  const directCode = readErrorCode(error);
  if (directCode && RETRYABLE_NETWORK_CODES.has(directCode)) return true;

  if (typeof error === 'object' && error !== null) {
    const causeCode = readErrorCode(Reflect.get(error, 'cause'));
    if (causeCode && RETRYABLE_NETWORK_CODES.has(causeCode)) return true;
  }

  // fetch rejects only on network failures (never on HTTP status), so a plain
  // TypeError here is a transient connectivity problem.
  return error instanceof TypeError;
}

/** Classify an HTTP status as transient (worth retrying). */
function isTransientStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

/** Read an optional string `message` off an unknown value without casting. */
function readErrorMessage(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const message = Reflect.get(value, 'message');
  return typeof message === 'string' ? message : undefined;
}

/** Short human description of the cause, for the exhaustion error message. */
function describeReason(reason: TransientReason): string {
  if (reason.kind === 'status') return `HTTP ${reason.status}`;
  const name = readErrorName(reason.error);
  const message =
    reason.error instanceof Error ? reason.error.message : String(reason.error);

  // A bare network TypeError reads as "TypeError: fetch failed"; surface the
  // underlying cause's code/message so the exhaustion error is actionable.
  let detail = name ? `${name}: ${message}` : message;
  if (typeof reason.error === 'object' && reason.error !== null) {
    const cause = Reflect.get(reason.error, 'cause');
    const causeCode = readErrorCode(cause);
    const causeMessage = readErrorMessage(cause);
    const causeDetail = causeCode ?? causeMessage;
    if (causeDetail) detail = `${detail} (${causeDetail})`;
  }
  return detail;
}

type TransientReason =
  | { kind: 'throw'; error: unknown }
  | { kind: 'status'; status: number };

/** Backoff delay (with jitter) before the retry following attempt index `i`. */
function backoffForAttempt(index: number): number {
  const base =
    BASE_BACKOFF_MS[Math.min(index, BASE_BACKOFF_MS.length - 1)] ?? 0;
  const spread = base * JITTER;
  return base + (Math.random() * 2 - 1) * spread;
}

/** Promise-based sleep that fake timers can drive in tests. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * fetch with bounded, classified retry. Returns the Response on success OR on a
 * non-retryable status (including 4xx other than 429) so the caller decides.
 * Throws the last transient cause once attempts or the time budget are spent.
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const perAttemptTimeoutMs =
    options.perAttemptTimeoutMs ?? DEFAULT_PER_ATTEMPT_TIMEOUT_MS;
  const maxTotalMs = options.maxTotalMs ?? DEFAULT_MAX_TOTAL_MS;
  const init = options.init;

  const start = Date.now();
  let lastReason: TransientReason | undefined;
  let made = 0;

  for (let attempt = 0; attempt < attempts; attempt++) {
    // Clamp each attempt's timeout to the budget that remains, so the total
    // wall-clock is genuinely bounded by maxTotalMs (a full per-attempt timeout
    // can no longer overrun the budget). If too little budget remains to make a
    // meaningful attempt, stop before starting one.
    const remaining = maxTotalMs - (Date.now() - start);
    if (remaining <= MIN_ATTEMPT_BUDGET_MS) break;
    const attemptTimeoutMs = Math.min(perAttemptTimeoutMs, remaining);

    made = attempt + 1;
    let reason: TransientReason;

    try {
      // Bound only the request phase. Clear the per-attempt timer the moment
      // fetch resolves (headers received) or throws, so the timeout can never
      // abort downstream body consumption (response.text() / stream piping),
      // which runs outside this retry loop and would otherwise fail unretried.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), attemptTimeoutMs);
      let response: Response;
      try {
        response = await fetch(url, {
          ...init,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      // Non-retryable status (success or deterministic 4xx) → hand back.
      if (!isTransientStatus(response.status)) return response;

      // Discarded retryable response: release the socket undici holds until GC.
      await response.body?.cancel();
      reason = { kind: 'status', status: response.status };
    } catch (error) {
      if (!isTransientThrow(error)) throw error;
      reason = { kind: 'throw', error };
    }

    lastReason = reason;

    // Stop if attempts are spent or the time budget is exhausted; otherwise
    // wait out the backoff before the next try.
    const isLastAttempt = attempt === attempts - 1;
    const budgetSpent = Date.now() - start >= maxTotalMs;
    if (isLastAttempt || budgetSpent) break;

    // Clamp the sleep to the budget that remains so total wall-clock stays
    // literally within maxTotalMs; if no budget is left, stop instead of
    // sleeping into an overrun.
    const sleepMs = Math.min(
      backoffForAttempt(attempt),
      maxTotalMs - (Date.now() - start),
    );
    if (sleepMs <= 0) break;
    await delay(sleepMs);
  }

  const cause = lastReason ? describeReason(lastReason) : 'no attempts made';
  throw new Error(`Fetch failed after ${made} attempts: ${cause}`);
}
