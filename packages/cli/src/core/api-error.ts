export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  code?: string;
  details?: ApiErrorDetail[];

  constructor(
    message: string,
    options?: { code?: string; details?: ApiErrorDetail[] },
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = options?.code;
    this.details = options?.details;
  }
}

/**
 * Extract structured error from an openapi-fetch error response and throw.
 * The error shape is: { error: { code, message, details: { errors: [] } } }
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
    throw new ApiError(message, { code, details });
  }
  throw new ApiError(fallbackMessage);
}
