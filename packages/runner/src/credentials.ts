/**
 * Runtime credentials, read from the environment only.
 *
 * Deliberately static and blind to any CLI session or config file: a runtime
 * is a long-lived container handed a token, with no refresh token and no
 * config file to write a rotation back to. Its whole input surface is an
 * artifact, a port, and values passed in the environment.
 */

/**
 * Deploy token first, then a plain token. Null when neither is set. An empty
 * variable counts as unset, so `WALKEROS_DEPLOY_TOKEN=` cannot shadow a real
 * `WALKEROS_TOKEN`.
 */
export function resolveRunToken(): string | null {
  return (
    process.env.WALKEROS_DEPLOY_TOKEN || process.env.WALKEROS_TOKEN || null
  );
}

/** App base URL, defaulting to the hosted app. An empty variable counts as unset. */
export function resolveAppUrl(): string {
  return process.env.WALKEROS_APP_URL || 'https://app.walkeros.io';
}
