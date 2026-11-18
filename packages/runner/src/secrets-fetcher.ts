import { sendWithServiceAuth } from '@walkeros/server-core';
import { secretsUrl } from './api-paths.js';
import { attemptHeaders } from './auth-headers.js';
import type { AppAuth } from './credentials.js';
import { fetchWithRetry } from './fetch-retry.js';
import { throwIfRunnerAuthFailure } from './runner-auth-error.js';

export interface FetchSecretsOptions {
  /** The app and the runner credential's headers. */
  app: AppAuth;
}

/**
 * Custom error with HTTP status for callers to distinguish recoverable
 * failures (404 = no secrets configured) from fatal ones (500, etc.).
 * Auth failures (401/403) are thrown as RunnerAuthError instead.
 */
export class SecretsHttpError extends Error {
  constructor(
    public readonly status: number,
    statusText: string,
  ) {
    super(`Failed to fetch secrets: ${status} ${statusText}`);
    this.name = 'SecretsHttpError';
  }
}

export async function fetchSecrets(
  options: FetchSecretsOptions,
): Promise<Record<string, string>> {
  const { app } = options;
  const url = secretsUrl(app.origin);

  // Runs sequentially after the bundle fetch within Scaleway's ~100s container
  // health window, so keep the total budget small. Retries transient failures
  // (timeouts, 5xx, 429); 401/403, 404, and other 4xx are returned for the
  // classification/checks below.
  const request = { method: 'GET', url };
  const res = await sendWithServiceAuth(app, request, (headers) =>
    fetchWithRetry(url, {
      maxTotalMs: 20_000,
      headers: attemptHeaders(app, request, headers),
    }),
  );

  // Classify 401/403 with the app's error code (FORBIDDEN_KIND, FORBIDDEN_SCOPE).
  await throwIfRunnerAuthFailure(res);

  if (!res.ok) {
    throw new SecretsHttpError(res.status, res.statusText);
  }

  const json: unknown = await res.json();
  return readSecretValues(json);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Read `{ values: { NAME: 'value' } }`, keeping string values only. A body of
 * any other shape yields no secrets rather than garbage in `process.env`.
 */
function readSecretValues(body: unknown): Record<string, string> {
  const values: Record<string, string> = {};
  if (!isRecord(body) || !isRecord(body.values)) return values;
  for (const [name, value] of Object.entries(body.values)) {
    if (typeof value === 'string') values[name] = value;
  }
  return values;
}
