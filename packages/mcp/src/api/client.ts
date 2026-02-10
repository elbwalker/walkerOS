export interface ApiConfig {
  token: string;
  projectId?: string;
  baseUrl: string;
}

export function getApiConfig(): ApiConfig {
  const token = process.env.WALKEROS_TOKEN;
  if (!token)
    throw new Error(
      'WALKEROS_TOKEN not set. Create a token at https://app.walkeros.io/settings/tokens',
    );
  return {
    token,
    projectId: process.env.WALKEROS_PROJECT_ID || undefined,
    baseUrl: process.env.WALKEROS_APP_URL || 'https://app.walkeros.io',
  };
}

export function requireProjectId(): string {
  const { projectId } = getApiConfig();
  if (!projectId)
    throw new Error(
      'WALKEROS_PROJECT_ID not set. Use the whoami or list-projects tool to find your project ID, then set the env var.',
    );
  return projectId;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export async function apiRequest(
  path: string,
  options?: RequestInit,
  timeout: number = DEFAULT_TIMEOUT_MS,
): Promise<unknown> {
  const { token, baseUrl } = getApiConfig();

  const signal = AbortSignal.timeout(timeout);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal,
      headers: {
        ...(options?.headers as Record<string, string>),
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error(`Request timed out after ${timeout / 1000}s`);
    }
    throw err;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const msg =
      (body as { error?: { message?: string } })?.error?.message ||
      `HTTP ${response.status}`;
    throw new Error(msg);
  }

  if (response.status === 204) return { success: true };
  return response.json();
}
