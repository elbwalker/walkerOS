export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiErrorOptions {
  code?: string;
  details?: ApiErrorDetail[];
  // HTTP status of the failed response, when known.
  status?: number;
  // True when the failure is worth retrying (e.g. 429 / 503 with Retry-After).
  retryable?: boolean;
  // Seconds to wait before retrying, parsed from the Retry-After header.
  retryAfterSeconds?: number;
  // Populated only for CLIENT_OUTDATED responses (HTTP 426).
  minVersion?: string;
  clientVersion?: string;
  client?: string;
  upgrade?: string;
  docs?: string;
}

// Exit code for a retryable failure (e.g. rate limited). Distinct from the
// generic failure (1) and upgrade-required (2) so CI can branch on it.
// Mirrors the BSD sysexits.h EX_TEMPFAIL convention.
export const EXIT_RETRYABLE = 75;

export class ApiError extends Error {
  code?: string;
  details?: ApiErrorDetail[];
  status?: number;
  retryable?: boolean;
  retryAfterSeconds?: number;
  // Populated only for CLIENT_OUTDATED responses (HTTP 426).
  minVersion?: string;
  clientVersion?: string;
  client?: string;
  upgrade?: string;
  docs?: string;

  constructor(message: string, options?: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.code = options?.code;
    this.details = options?.details;
    this.status = options?.status;
    this.retryable = options?.retryable;
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.minVersion = options?.minVersion;
    this.clientVersion = options?.clientVersion;
    this.client = options?.client;
    this.upgrade = options?.upgrade;
    this.docs = options?.docs;
  }
}

/**
 * Build ApiError options from an openapi-style error body.
 * The error shape is: { error: { code, message, details: { errors: [] } } }
 * Returns `null` when the body has no recognizable `error` object.
 */
function extractApiErrorOptions(
  error: unknown,
  fallbackMessage: string,
): { message: string; options: ApiErrorOptions } | null {
  if (
    !error ||
    typeof error !== 'object' ||
    !('error' in error) ||
    typeof (error as Record<string, unknown>).error !== 'object'
  ) {
    return null;
  }
  const inner = (error as { error: Record<string, unknown> }).error;
  const message = (inner.message as string) || fallbackMessage;
  const code = inner.code as string | undefined;
  const details = (inner.details as Record<string, unknown>)?.errors as
    | ApiErrorDetail[]
    | undefined;
  const options: ApiErrorOptions = { code, details };
  if (code === 'CLIENT_OUTDATED') {
    options.minVersion = inner.minVersion as string | undefined;
    options.clientVersion = inner.clientVersion as string | undefined;
    options.client = inner.client as string | undefined;
    options.upgrade = inner.upgrade as string | undefined;
    options.docs = inner.docs as string | undefined;
  }
  return { message, options };
}

/**
 * Extract structured error from an openapi-fetch error response and throw.
 *
 * For `code === 'CLIENT_OUTDATED'` (HTTP 426), also extracts the upgrade
 * metadata: `minVersion`, `clientVersion`, `client`, `upgrade`, `docs`.
 */
export function throwApiError(error: unknown, fallbackMessage: string): never {
  const extracted = extractApiErrorOptions(error, fallbackMessage);
  if (extracted) throw new ApiError(extracted.message, extracted.options);
  throw new ApiError(fallbackMessage);
}

/**
 * Parse a `Retry-After` header value into seconds. Accepts both the
 * delta-seconds form (`"30"`) and the HTTP-date form. Returns `undefined`
 * when the value is absent or unparseable.
 */
export function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  const when = Date.parse(trimmed);
  if (Number.isNaN(when)) return undefined;
  return Math.max(0, Math.round((when - Date.now()) / 1000));
}

/**
 * Like `throwApiError`, but classifies retryability from the HTTP response.
 * A 429 is always retryable; a 503 is retryable when it carries a
 * `Retry-After` hint. The parsed wait (seconds) is attached for `--wait`
 * callers to honor and for the machine-readable error line.
 */
export function throwApiResponseError(
  response: Pick<Response, 'status' | 'headers'>,
  body: unknown,
  fallbackMessage: string,
): never {
  const status = response.status;
  const retryAfterSeconds = parseRetryAfter(
    response.headers.get('retry-after'),
  );
  const retryable =
    status === 429 || (status === 503 && retryAfterSeconds !== undefined);

  const extracted = extractApiErrorOptions(body, fallbackMessage);
  const message = extracted?.message ?? fallbackMessage;
  const options: ApiErrorOptions = {
    ...(extracted?.options ?? {}),
    status,
    retryable,
    retryAfterSeconds,
  };
  throw new ApiError(message, options);
}

/**
 * Emit a stable, parseable machine-readable error line so CI can branch on
 * the failure without string-matching prose. Format:
 *
 *   error: code=<CODE> retryable=<bool>[ retryAfter=<seconds>] message=<text>
 *
 * `code` is `UNKNOWN` for non-ApiError failures. The line always starts with
 * `error: code=` and the human-readable message comes last.
 */
function machineReadableErrorLine(err: unknown): string {
  const code = err instanceof ApiError ? (err.code ?? 'UNKNOWN') : 'UNKNOWN';
  const retryable = err instanceof ApiError ? err.retryable === true : false;
  const retryAfter =
    err instanceof ApiError && err.retryAfterSeconds !== undefined
      ? ` retryAfter=${err.retryAfterSeconds}`
      : '';
  const message = err instanceof Error ? err.message : String(err);
  return `error: code=${code} retryable=${retryable}${retryAfter} message=${message}`;
}

/**
 * Pretty-print an error and exit. Always prints a machine-readable code line
 * first (see `machineReadableErrorLine`). Recognises `ApiError` with
 * `code === 'CLIENT_OUTDATED'` as a dedicated upgrade-required path
 * (exit code 2) and prints the upgrade and docs links. Retryable failures
 * (e.g. rate limited) exit with `EXIT_RETRYABLE` (75). Everything else
 * exits 1.
 *
 * Designed to be used as a top-level handler (`process.on('uncaughtException', ...)`,
 * `program.parseAsync().catch(...)`) and as a drop-in replacement for
 * per-command `logger.error(msg); process.exit(1)` patterns.
 */
export function handleCliError(err: unknown): never {
  /* eslint-disable no-console */
  console.error(machineReadableErrorLine(err));

  if (err instanceof ApiError && err.code === 'CLIENT_OUTDATED') {
    console.error(`\n${err.message}\n`);
    if (err.upgrade) console.error(`  Upgrade: ${err.upgrade}`);
    if (err.docs) console.error(`  Docs:    ${err.docs}\n`);
    process.exit(2);
  }

  if (err instanceof ApiError && err.retryable) {
    const hint =
      err.retryAfterSeconds !== undefined
        ? ` Retry after ${err.retryAfterSeconds}s.`
        : ' This is temporary, retry shortly.';
    console.error(`${err.message}${hint}`);
    process.exit(EXIT_RETRYABLE);
  }

  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
  /* eslint-enable no-console */
}
