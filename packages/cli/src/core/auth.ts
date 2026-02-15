import { resolveToken, resolveAppUrl } from '../lib/config-file.js';

export function getToken(): string | undefined {
  const result = resolveToken();
  return result?.token;
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

export function resolveBaseUrl(): string {
  return resolveAppUrl();
}

export function requireProjectId(): string {
  const projectId = process.env.WALKEROS_PROJECT_ID;
  if (!projectId) throw new Error('WALKEROS_PROJECT_ID not set.');
  return projectId;
}
