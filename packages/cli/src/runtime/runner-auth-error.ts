/**
 * Classified runner-auth error. Thrown by runtime fetchers on 401/403 so
 * the runner can log `runner_auth_forbidden scope=... flow=... deployment=...`
 * in a structured way and, where appropriate, exit cleanly rather than retry.
 *
 * `reason`:
 * - `'unauthorised'` — token missing, expired, or revoked (401)
 * - `'flow'` — token is not bound to this flow (403 FORBIDDEN_FLOW)
 * - `'scope'` — token lacks the required scope (403 FORBIDDEN_SCOPE)
 * - `'forbidden'` — 403 with no recognised error code
 */
export type RunnerAuthReason = 'unauthorised' | 'flow' | 'scope' | 'forbidden';

export class RunnerAuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly reason: RunnerAuthReason,
    public readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'RunnerAuthError';
  }
}

interface AppErrorBody {
  error?: { code?: unknown; message?: unknown };
}

function isAppErrorBody(value: unknown): value is AppErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as { error: unknown }).error === 'object'
  );
}

/**
 * If the response is a 401 or 403 from the app, parse `{error: {code, message}}`
 * and throw a typed RunnerAuthError. For any other non-ok status the caller
 * handles errors as before.
 */
export async function throwIfRunnerAuthFailure(res: Response): Promise<void> {
  if (res.status !== 401 && res.status !== 403) return;

  let code: string | null = null;
  let message: string = res.statusText;

  try {
    const body: unknown = await res.clone().json();
    if (isAppErrorBody(body) && body.error) {
      if (typeof body.error.code === 'string') code = body.error.code;
      if (typeof body.error.message === 'string') message = body.error.message;
    }
  } catch {
    // Body not JSON — keep statusText as message.
  }

  const reason: RunnerAuthReason =
    res.status === 401
      ? 'unauthorised'
      : code === 'FORBIDDEN_FLOW'
        ? 'flow'
        : code === 'FORBIDDEN_SCOPE'
          ? 'scope'
          : 'forbidden';

  throw new RunnerAuthError(res.status, reason, code, message);
}
