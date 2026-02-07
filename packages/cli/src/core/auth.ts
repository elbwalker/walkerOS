const ENV_VAR = 'WALKEROS_TOKEN';

export function getToken(): string | undefined {
  const token = process.env[ENV_VAR];
  return token || undefined;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function authenticatedFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const authHeaders = getAuthHeaders();
  const existingHeaders =
    init?.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : Array.isArray(init?.headers)
        ? Object.fromEntries(init.headers)
        : (init?.headers ?? {});

  return fetch(url, {
    ...init,
    headers: { ...existingHeaders, ...authHeaders },
  });
}
