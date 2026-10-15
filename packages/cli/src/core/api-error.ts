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
