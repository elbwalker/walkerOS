export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiErrorOptions {
  code?: string;
  details?: ApiErrorDetail[];
  // Populated only for CLIENT_OUTDATED responses (HTTP 426).
  minVersion?: string;
  clientVersion?: string;
  client?: string;
  upgrade?: string;
  docs?: string;
}

export class ApiError extends Error {
  code?: string;
  details?: ApiErrorDetail[];
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
    this.minVersion = options?.minVersion;
    this.clientVersion = options?.clientVersion;
    this.client = options?.client;
    this.upgrade = options?.upgrade;
    this.docs = options?.docs;
  }
}

/**
 * Extract structured error from an openapi-fetch error response and throw.
 * The error shape is: { error: { code, message, details: { errors: [] } } }
 *
 * For `code === 'CLIENT_OUTDATED'` (HTTP 426), also extracts the upgrade
 * metadata: `minVersion`, `clientVersion`, `client`, `upgrade`, `docs`.
 */
export function throwApiError(error: unknown, fallbackMessage: string): never {
  if (
    error &&
    typeof error === 'object' &&
    'error' in error &&
    typeof (error as Record<string, unknown>).error === 'object'
  ) {
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
    throw new ApiError(message, options);
  }
  throw new ApiError(fallbackMessage);
}

/**
 * Pretty-print an error and exit. Recognises `ApiError` with
 * `code === 'CLIENT_OUTDATED'` as a dedicated upgrade-required path
 * (exit code 2), prints the upgrade and docs links, and otherwise
 * falls back to a generic error print with exit code 1.
 *
 * Designed to be used as a top-level handler (`process.on('uncaughtException', ...)`,
 * `program.parseAsync().catch(...)`) and as a drop-in replacement for
 * per-command `logger.error(msg); process.exit(1)` patterns.
 */
export function handleCliError(err: unknown): never {
  /* eslint-disable no-console */
  if (err instanceof ApiError && err.code === 'CLIENT_OUTDATED') {
    console.error(`\n${err.message}\n`);
    if (err.upgrade) console.error(`  Upgrade: ${err.upgrade}`);
    if (err.docs) console.error(`  Docs:    ${err.docs}\n`);
    process.exit(2);
  }
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
  /* eslint-enable no-console */
}
