import type { ApiStoreEnv } from '../types';

/**
 * Mock env for the API store: an in-memory API behind `fetch`.
 *
 * It holds one customer record, `cust-42`. A request whose last path
 * segment or one of whose query values is a known id answers that record as
 * JSON; any other request answers 404, a miss. It never reaches the network.
 */

const records = new Map<string, unknown>([
  ['cust-42', { ltv: 420, segment: 'loyal' }],
]);

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** The in-memory API: a known id answers its record, anything else 404. */
export const apiFetch: typeof fetch = async (input) => {
  const url = new URL(requestUrl(input));
  const last = url.pathname.split('/').pop() ?? '';
  const ids = [decodeURIComponent(last), ...url.searchParams.values()];
  const id = ids.find((candidate) => records.has(candidate));
  if (id === undefined) return jsonResponse({ error: 'Not found' }, 404);
  return jsonResponse(records.get(id), 200);
};

export const push: ApiStoreEnv = { fetch: apiFetch };

/** Every request goes through `fetch`; `args[0]` is the URL. */
export const simulation = ['fetch'];
