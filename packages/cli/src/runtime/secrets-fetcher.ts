import { mergeAuthHeaders } from '../core/http.js';
import { throwIfRunnerAuthFailure } from './runner-auth-error.js';

export interface FetchSecretsOptions {
  appUrl: string;
  token: string;
  projectId: string;
  flowId: string;
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
  const { appUrl, token, projectId, flowId } = options;
  const url = `${appUrl}/api/projects/${encodeURIComponent(projectId)}/flows/${encodeURIComponent(flowId)}/secrets/values`;

  const res = await fetch(url, {
    headers: mergeAuthHeaders(token, { 'Content-Type': 'application/json' }),
  });

  // Classify 401/403 with the app's error code (FORBIDDEN_FLOW, FORBIDDEN_SCOPE).
  await throwIfRunnerAuthFailure(res);

  if (!res.ok) {
    throw new SecretsHttpError(res.status, res.statusText);
  }

  const json = (await res.json()) as { values: Record<string, string> };
  return json.values;
}
