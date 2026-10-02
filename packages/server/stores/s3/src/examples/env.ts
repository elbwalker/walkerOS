import type { Env } from '../types';

/**
 * Mock env for the S3 store: an in-memory bucket behind `fetch`.
 *
 * The store's S3 client (s3mini) signs each request and sends it through the
 * injected `fetch`. This mock answers the bucket existence check at start
 * and object get, put and delete. Objects live in a `Map` keyed by the
 * request path, so a `get` after a `set` returns what was written. Any
 * bucket exists; no credentials are checked.
 */

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

/** Create a fresh in-memory S3 backend. */
export function createS3Fetch(): typeof fetch {
  const objects = new Map<string, Uint8Array<ArrayBuffer>>();

  return async (input, init) => {
    const { pathname } = new URL(requestUrl(input));
    const method = init?.method ?? 'GET';
    // Path style: /<bucket> for the bucket, /<bucket>/<key> for an object.
    const isBucket = pathname.replace(/\/+$/, '').split('/').length <= 2;

    if (isBucket) return new Response(null, { status: 200 });

    if (method === 'PUT') {
      objects.set(pathname, bodyBytes(init?.body));
      return new Response(null, { status: 200, headers: { etag: '"mock"' } });
    }
    if (method === 'DELETE') {
      objects.delete(pathname);
      return new Response(null, { status: 204 });
    }

    const bytes = objects.get(pathname);
    if (!bytes) return new Response(null, { status: 404 });
    return new Response(bytes, { status: 200 });
  };
}

/** Each read of `fetch` is a fresh backend, so runs never share writes. */
export const push: Env = {
  get fetch() {
    return createS3Fetch();
  },
};

/** Every request goes through `fetch`; `args[0]` is the signed URL. */
export const simulation = ['fetch'];
