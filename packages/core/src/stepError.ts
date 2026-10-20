/**
 * Options of a {@link StepError}: the failure code, and what decides whether
 * a retry can help (`status`, an explicit `retryable`).
 */
export interface StepErrorOptions {
  code: string;
  status?: number;
  retryable?: boolean;
  /** The response body: kept on the error, never in its message or a log line. */
  body?: unknown;
  cause?: unknown;
}

/** Why a push failed, as a push result and the logs carry it. Never a body. */
export type FailureReason = {
  code: string;
  message: string;
  retryable: boolean;
  status?: number;
};

/** Why an event waits instead of being delivered now. */
export type QueueReason = 'consent' | 'batch' | 'held';

export type QueuedReason = { code: QueueReason; message: string };

/** Codes a retry can help with, unless a status or an option says otherwise. */
const RETRYABLE_CODES = [
  'transport',
  'timeout',
  'breaker-open',
  'blocked',
  'queue-full',
  'vendor-not-ready',
  'vendor-timeout',
];

/** Longest message a reason or a log line carries. */
const MAX_MESSAGE_LENGTH = 300;

/**
 * Precedence: an explicit `retryable`, then the HTTP status (429 and 5xx
 * retryable, other 4xx not), then the code's default. A code outside the
 * retryable list is not retryable.
 */
function resolveRetryable(options: StepErrorOptions): boolean {
  if (options.retryable !== undefined) return options.retryable;
  const { status } = options;
  if (status !== undefined) {
    if (status === 429 || (status >= 500 && status < 600)) return true;
    if (status >= 400 && status < 500) return false;
  }
  return RETRYABLE_CODES.includes(options.code);
}

/**
 * The error a step throws when it cannot do its work: a missing setting
 * (`config`), a refused request (`transport` with its `status`), a vendor
 * that is not there. The collector reads `code` and `retryable` instead of
 * the message.
 */
export class StepError extends Error {
  code: string;
  status?: number;
  retryable: boolean;
  body?: unknown;

  constructor(message: string, options: StepErrorOptions) {
    super(
      message,
      options.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = 'StepError';
    this.code = options.code;
    if (options.status !== undefined) this.status = options.status;
    this.retryable = resolveRetryable(options);
    if (options.body !== undefined) this.body = options.body;

    // Preserve the prototype chain where the class is downleveled.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** A message capped to what a reason or a log line may carry. */
export function capMessage(message: string): string {
  return message.length > MAX_MESSAGE_LENGTH
    ? message.slice(0, MAX_MESSAGE_LENGTH)
    : message;
}

/**
 * The reason of any thrown value: a `StepError` keeps its code, status and
 * `retryable`; anything else is a `transport` failure. The message is capped
 * at 300 characters; the body never leaves the error.
 */
export function toFailureReason(err: unknown): FailureReason {
  if (err instanceof StepError) {
    const reason: FailureReason = {
      code: err.code,
      message: capMessage(err.message),
      retryable: err.retryable,
    };
    if (err.status !== undefined) reason.status = err.status;
    return reason;
  }
  return {
    code: 'transport',
    message: capMessage(err instanceof Error ? err.message : String(err)),
    retryable: true,
  };
}
