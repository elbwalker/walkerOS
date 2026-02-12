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

export interface ApiRequestOptions extends RequestInit {
  responseFormat?: 'json' | 'raw';
  timeout?: number;
}

export async function apiRequest(
  path: string,
  options?: ApiRequestOptions,
): Promise<unknown> {
  const token = getToken();
  if (!token) throw new Error('WALKEROS_TOKEN not set.');

  const baseUrl = resolveBaseUrl();
  const { responseFormat, timeout = 30000, ...fetchOptions } = options || {};

  const response = await fetch(`${baseUrl}${path}`, {
    ...fetchOptions,
    signal: AbortSignal.timeout(timeout),
    headers: {
      ...(fetchOptions?.headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (responseFormat === 'raw') {
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        (body as Record<string, Record<string, string>>)?.error?.message ||
          `HTTP ${response.status}`,
      );
    }
    return response;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as Record<string, Record<string, string>>)?.error?.message ||
        `HTTP ${response.status}`,
    );
  }

  if (response.status === 204) return { success: true };
  return response.json();
}
