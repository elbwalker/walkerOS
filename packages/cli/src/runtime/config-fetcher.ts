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

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.token}`,
  };
  if (options.lastEtag) {
    headers['If-None-Match'] = options.lastEtag;
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(30_000),
  });

  if (response.status === 304) {
    return { changed: false };
  }

  if (!response.ok) {
    throw new Error(
      `Config fetch failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  const etag = response.headers.get('etag') || '';
  const version = etag.replace(/"/g, '');

  return {
    content: data.content,
    version,
    etag,
    changed: true,
  };
}
