import { mergeAuthHeaders } from '../core/http.js';
import { fetchWithRetry } from './fetch-retry.js';
import { throwIfRunnerAuthFailure } from './runner-auth-error.js';

export interface FetchConfigResult {
  content: Record<string, unknown>;
  version: string;
  etag: string;
  changed: true;
}

export interface FetchConfigUnchanged {
  changed: false;
}

export type ConfigFetchResult = FetchConfigResult | FetchConfigUnchanged;

export interface FetchConfigOptions {
  appUrl: string;
  token: string;
  projectId: string;
  flowId: string;
  lastEtag?: string;
}

export async function fetchConfig(
  options: FetchConfigOptions,
): Promise<ConfigFetchResult> {
  const url = `${options.appUrl}/api/projects/${options.projectId}/flows/${options.flowId}`;

  const headers = mergeAuthHeaders(
    options.token,
    options.lastEtag ? { 'If-None-Match': options.lastEtag } : undefined,
  );

  // Retry transient failures (timeouts, 5xx, 429) within the boot health
  // window; 304, 401/403, and other 4xx are returned for the checks below.
  const response = await fetchWithRetry(url, { init: { headers } });

  if (response.status === 304) {
    return { changed: false };
  }

  // Classify 401/403 (RunnerAuthError with typed reason).
  await throwIfRunnerAuthFailure(response);

  if (!response.ok) {
    throw new Error(
      `Config fetch failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  const etag = response.headers.get('etag') || '';
  const version = etag.replace(/"/g, '');

  return {
    content: data.config,
    version,
    etag,
    changed: true,
  };
}
