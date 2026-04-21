import { mergeAuthHeaders } from '../core/http.js';
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

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(30_000),
  });

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
