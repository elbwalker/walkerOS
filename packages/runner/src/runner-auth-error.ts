/**
 * Classified runner-auth error. Thrown by runtime fetchers on 401/403, so a
 * refused credential fails the boot with the app's own message instead of a
 * retry.
 *
 * `reason`:
 * - `'unauthorised'`, the credential or its token refused: replaced, revoked
 *   or ended (401)
 * - `'scope'`, the credential lacks the required scope (403 FORBIDDEN_SCOPE)
 * - `'forbidden'`, any other 403, such as a credential of another kind
 */
export type RunnerAuthReason = 'unauthorised' | 'scope' | 'forbidden';

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
    typeof value.error === 'object'
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
    // Body not JSON, keep statusText as message.
  }

  const reason: RunnerAuthReason =
    res.status === 401
      ? 'unauthorised'
      : code === 'FORBIDDEN_SCOPE'
        ? 'scope'
        : 'forbidden';

  throw new RunnerAuthError(res.status, reason, code, message);
}
