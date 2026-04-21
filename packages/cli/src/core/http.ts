import {
  resolveAppUrl,
  resolveToken,
  resolveDeployToken,
} from '../lib/config-file.js';
import { clientContextHeaders } from './client-context.js';

/**
 * Normalize headers from any RequestInit format to a plain object.
 */
function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers as Record<string, string>;
}

/**
 * Merge a bearer token into a headers object.
 * Shared by apiFetch, deployFetch, and runtime callers that manage their own tokens.
 */
export function mergeAuthHeaders(
  token: string | null | undefined,
  headers?: HeadersInit,
): Record<string, string> {
  const normalized = normalizeHeaders(headers);
  if (token) normalized.Authorization = `Bearer ${token}`;
  return normalized;
}

/**
 * Build the final outbound header set by merging client-context headers
 * (User-Agent, X-WalkerOS-Client, X-WalkerOS-Client-Version) with auth.
 * Caller-provided headers win over client-context defaults.
 */
function buildHeaders(
  token: string | null | undefined,
  headers?: HeadersInit,
): Record<string, string> {
  return {
    ...clientContextHeaders(),
    ...mergeAuthHeaders(token, headers),
  };
}

/**
 * Authenticated fetch — resolves base URL + adds auth token.
 * Use for all API calls that require WALKEROS_TOKEN.
 */
export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const baseUrl = resolveAppUrl();
  const token = resolveToken()?.token;
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: buildHeaders(token, init?.headers),
  });
}

/**
 * Unauthenticated fetch — resolves base URL, no auth.
 * Use for public endpoints (login device flow, feedback).
 */
export async function publicFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const baseUrl = resolveAppUrl();
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...clientContextHeaders(),
      ...normalizeHeaders(init?.headers),
    },
  });
}

/**
 * Deploy-authenticated fetch — uses deploy token with fallback to user token.
 * Use for runtime operations (heartbeat, config polling, secrets).
 */
export async function deployFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const baseUrl = resolveAppUrl();
  const token = resolveDeployToken() ?? resolveToken()?.token;
  if (!token)
    throw new Error(
      'No authentication token available. Set WALKEROS_DEPLOY_TOKEN or run walkeros auth login.',
    );
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: buildHeaders(token, init?.headers),
  });
}
