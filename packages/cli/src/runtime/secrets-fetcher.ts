export interface FetchSecretsOptions {
  appUrl: string;
  token: string;
  projectId: string;
  flowId: string;
}

export async function fetchSecrets(
  options: FetchSecretsOptions,
): Promise<Record<string, string>> {
  const { appUrl, token, projectId, flowId } = options;
  const url = `${appUrl}/api/projects/${encodeURIComponent(projectId)}/flows/${encodeURIComponent(flowId)}/secrets/values`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch secrets: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { values: Record<string, string> };
  return json.values;
}
