/**
 * Normalize headers from any RequestInit format to a plain object.
 */
function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers;
}

/**
 * Merge a bearer token into a headers object. The runtime manages its own
 * token (see `credentials.ts`), so it needs only this, not the CLI's OAuth
 * aware fetch helpers.
 */
export function mergeAuthHeaders(
  token: string | null | undefined,
  headers?: HeadersInit,
): Record<string, string> {
  const normalized = normalizeHeaders(headers);
  if (token) normalized.Authorization = `Bearer ${token}`;
  return normalized;
}
