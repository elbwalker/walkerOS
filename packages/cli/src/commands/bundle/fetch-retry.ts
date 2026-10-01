/**
 * One retry policy for every network call of a manifest build: the manifest
 * download, a skeleton download and each PUT. A transient failure (the fetch
 * rejects, times out, or answers 5xx or 429) is retried; any other status
 * fails at once, since an expired or wrong presign never heals.
 *
 * Messages never carry the URL, its query or a header value: presigned
 * credentials live there.
 */

/** Waits before attempt 2 and 3. Their count sets the attempt limit. */
const BACKOFF_MS = [1000, 3000] as const;

export interface FetchRetryOptions {
  /** Names the call in warnings and errors, e.g. `Manifest download`. */
  label: string;
  /** Per-attempt timeout; each attempt gets a fresh signal. */
  timeoutMs: number;
  /** Called once per retry with a ready-to-print line. */
  warn?: (message: string) => void;
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

function causeDetail(error: object): string | undefined {
  if (!('cause' in error)) return undefined;
  const cause = error.cause;
  if (typeof cause !== 'object' || cause === null) return undefined;
  if ('code' in cause && typeof cause.code === 'string') return cause.code;
  // A plain `Error` name says nothing (undici's `bad port`, for one).
  if (
    'name' in cause &&
    typeof cause.name === 'string' &&
    cause.name !== 'Error'
  ) {
    return cause.name;
  }
  return undefined;
}

/**
 * A short, safe reason for a failed fetch: `fetch failed (ECONNRESET)`,
 * `timed out after 30s` or `HTTP 503`. Read from the error's name, its
 * `cause.code` or `cause.name`, or the response status. Never from an error
 * message, which may repeat the URL.
 */
export function describeFetchError(
  failure: unknown,
  timeoutMs?: number,
): string {
  if (failure instanceof Response) return `HTTP ${failure.status}`;
  // Structural, not `instanceof Error`: a DOMException or an undici error may
  // come from another realm.
  if (typeof failure !== 'object' || failure === null) return 'fetch failed';
  if ('name' in failure && failure.name === 'TimeoutError') {
    return timeoutMs === undefined
      ? 'timed out'
      : `timed out after ${timeoutMs / 1000}s`;
  }
  const detail = causeDetail(failure);
  if (detail) return `fetch failed (${detail})`;
  return 'fetch failed';
}

/**
 * `fetch` with the build retry policy. Resolves with an ok response, or
 * throws an Error whose message names the label, the attempt count and the
 * reason, e.g. `Manifest download failed after 3 attempts: HTTP 503`.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchRetryOptions,
): Promise<Response> {
  const { label, timeoutMs, warn, sleep = defaultSleep } = options;
  const maxAttempts = BACKOFF_MS.length + 1;

  for (let attempt = 1; ; attempt++) {
    let failure: unknown;
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) return response;
      failure = response;
    } catch (error) {
      failure = error;
    }

    const reason = describeFetchError(failure, timeoutMs);
    if (failure instanceof Response && !isTransientStatus(failure.status)) {
      throw new Error(`${label} failed: ${reason}`);
    }

    const delay = BACKOFF_MS[attempt - 1];
    if (delay === undefined) {
      throw new Error(
        `${label} failed after ${maxAttempts} attempts: ${reason}`,
      );
    }
    warn?.(
      `${label} attempt ${attempt}/${maxAttempts} failed: ${reason}, retrying in ${delay / 1000}s`,
    );
    await sleep(delay);
  }
}
