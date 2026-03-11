import {
  resolveToken,
  resolveAppUrl,
  resolveDeployToken,
} from '../lib/config-file.js';

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

/**
 * Fetch with deploy token priority for heartbeat calls.
 * Priority: WALKEROS_DEPLOY_TOKEN > WALKEROS_TOKEN > config file
 */
export async function deployAuthenticatedFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const deployToken = resolveDeployToken();
  const token = deployToken ?? getToken();

  if (!token)
    throw new Error(
      'No authentication token available. Set WALKEROS_DEPLOY_TOKEN or run walkeros auth login.',
    );

  const existingHeaders =
    init?.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : Array.isArray(init?.headers)
        ? Object.fromEntries(init.headers)
        : (init?.headers ?? {});

  return fetch(url, {
    ...init,
    headers: { ...existingHeaders, Authorization: `Bearer ${token}` },
  });
}

/**
 * Resolve token for runtime operations (run command, heartbeat, polling).
 * Priority: WALKEROS_DEPLOY_TOKEN > WALKEROS_TOKEN > config file
 */
export function resolveRunToken(): string | null {
  return resolveDeployToken() ?? resolveToken()?.token ?? null;
}

export function resolveBaseUrl(): string {
  return resolveAppUrl();
}

export function requireProjectId(): string {
  const projectId = process.env.WALKEROS_PROJECT_ID;
  if (!projectId) throw new Error('WALKEROS_PROJECT_ID not set.');
  return projectId;
}
