import { normalizeHeaders, normalizeQuery } from '@walkeros/core';
import type { Source } from '@walkeros/core';

/**
 * Builds the normalized scope from a WHATWG Request.
 *
 * A `Request` and its `Headers` are class instances, so a mapping path can
 * never descend into them directly. Flattening them here is what makes
 * `config.ingest` resolve on this source at all.
 *
 * The body is read by the handler, which owns the size guards, and handed in,
 * so this stays synchronous and pure.
 *
 * @param request The incoming request.
 * @param body The already read and normalized body, or undefined.
 * @returns The normalized scope.
 */
export function buildScope(request: Request, body: unknown): Source.Scope {
  const url = new URL(request.url);

  return {
    method: request.method.toUpperCase(),
    url: request.url,
    path: url.pathname,
    query: normalizeQuery(url.search),
    headers: normalizeHeaders(request.headers),
    body,
    // No ip: a bare WHATWG Request reports none, and deriving one from
    // x-forwarded-for would be a platform guess. The header is in `headers`.
    raw: request,
  };
}
