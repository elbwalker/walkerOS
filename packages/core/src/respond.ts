/**
 * Options for responding to an HTTP request.
 * Same interface for web and server — sources implement the handler.
 */
export interface RespondOptions {
  /** Response body. Objects are JSON-serialized by source. */
  body?: unknown;
  /** HTTP status code (default: 200). Server-only, ignored by web sources. */
  status?: number;
  /** HTTP response headers. Server-only, ignored by web sources. */
  headers?: Record<string, string>;
}

/**
 * Standardized response function available on env for every step.
 * Idempotent: first call wins, subsequent calls are no-ops.
 * Created by sources via createRespond(), consumed by any step.
 */
export type RespondFn = (options?: RespondOptions) => void;

/**
 * Creates an idempotent respond function.
 * The sender callback is source-specific (Express wraps res, Fetch wraps Response, etc.).
 *
 * @param sender - Platform-specific function that actually sends the response
 * @returns Idempotent respond function (first call wins)
 */
export function createRespond(
  sender: (options: RespondOptions) => void,
): RespondFn {
  let called = false;
  return (options: RespondOptions = {}) => {
    if (called) return;
    called = true;
    sender(options);
  };
}
