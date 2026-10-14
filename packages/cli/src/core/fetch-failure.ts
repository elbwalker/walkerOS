function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Why a request did not reach its host: `timeout after <ms> ms`, or the
 * network error with its code, such as `fetch failed (ECONNREFUSED)`. Read by
 * shape, not instanceof: an abort's DOMException can come from another realm.
 */
export function fetchFailureReason(error: unknown, timeoutMs?: number): string {
  if (!isRecord(error)) return String(error);
  if (error.name === 'TimeoutError')
    return timeoutMs === undefined
      ? 'timeout'
      : `timeout after ${timeoutMs} ms`;
  const message =
    typeof error.message === 'string' ? error.message : String(error);
  const cause = error.cause;
  const code =
    isRecord(cause) && typeof cause.code === 'string' ? cause.code : undefined;
  return code ? `${message} (${code})` : message;
}
