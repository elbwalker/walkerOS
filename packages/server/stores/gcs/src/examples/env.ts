import type { Env } from '../types';

/**
 * Mock env for the GCS store: an in-memory bucket behind `fetch`.
 *
 * It answers every request the store makes: the token exchange (service
 * account) or metadata token (ADC), the bucket existence check, and object
 * download, upload and delete. Objects live in a `Map` keyed by object name,
 * so a `get` after a `set` returns what was written. Any bucket exists.
 */

const TOKEN_BODY = { access_token: 'mock-access-token', expires_in: 3600 };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function bodyBytes(body: RequestInit['body']): Uint8Array<ArrayBuffer> {
  if (typeof body === 'string') return new TextEncoder().encode(body);
  if (body instanceof Uint8Array) return new Uint8Array(body);
  return new Uint8Array();
}

/** Create a fresh in-memory GCS backend. */
export function createGcsFetch(): typeof fetch {
  const objects = new Map<string, Uint8Array<ArrayBuffer>>();

  return async (input, init) => {
    const url = new URL(requestUrl(input));
    const method = init?.method ?? 'GET';

    if (url.origin === 'https://oauth2.googleapis.com')
      return jsonResponse(TOKEN_BODY);
    if (url.hostname === 'metadata.google.internal')
      return jsonResponse(TOKEN_BODY);

    // Upload: POST /upload/storage/v1/b/<bucket>/o?uploadType=media&name=<key>
    if (url.pathname.startsWith('/upload/') && method === 'POST') {
      const name = url.searchParams.get('name') ?? '';
      objects.set(name, bodyBytes(init?.body));
      return jsonResponse({ name });
    }

    // Download: GET /download/storage/v1/b/<bucket>/o/<key>?alt=media
    const download = /^\/download\/storage\/v1\/b\/[^/]+\/o\/(.+)$/.exec(
      url.pathname,
    );
    if (download) {
      const bytes = objects.get(decodeURIComponent(download[1]));
      if (!bytes) return jsonResponse({ error: { code: 404 } }, 404);
      return new Response(bytes, { status: 200 });
    }

    // Delete: DELETE /storage/v1/b/<bucket>/o/<key>
    const object = /^\/storage\/v1\/b\/[^/]+\/o\/(.+)$/.exec(url.pathname);
    if (object && method === 'DELETE') {
      objects.delete(decodeURIComponent(object[1]));
      return new Response(null, { status: 204 });
    }

    // Bucket existence: HEAD /storage/v1/b/<bucket>
    if (/^\/storage\/v1\/b\/[^/]+$/.test(url.pathname))
      return new Response(null, { status: 200 });

    return jsonResponse({ error: { code: 400 } }, 400);
  };
}

/** Each read of `fetch` is a fresh backend, so runs never share writes. */
export const push: Env = {
  get fetch() {
    return createGcsFetch();
  },
};

/** Every request goes through `fetch`; `args[0]` is the URL. */
export const simulation = ['fetch'];
