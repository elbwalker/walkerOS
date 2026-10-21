// What a Headers takes; the DOM lib's HeadersInit is not in a server program.
type HeadersInput = ConstructorParameters<typeof Headers>[0];

/**
 * Normalize headers from any RequestInit format to a plain object.
 */
function normalizeHeaders(headers?: HeadersInput): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  const normalized: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers))
    if (value !== undefined) normalized[name] = value;
  return normalized;
}

/**
 * Merge a bearer token into a headers object. The runtime manages its own
 * token (see `credentials.ts`), so it needs only this, not the CLI's OAuth
 * aware fetch helpers.
 */
export function mergeAuthHeaders(
  token: string | null | undefined,
  headers?: HeadersInput,
): Record<string, string> {
  const normalized = normalizeHeaders(headers);
  if (token) normalized.Authorization = `Bearer ${token}`;
  return normalized;
}
