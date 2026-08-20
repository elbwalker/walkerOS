import {
  normalizeBody,
  normalizeHeaders,
  normalizeQuery,
} from '@walkeros/core';
import type { Source } from '@walkeros/core';
import type { Request } from './types';

/**
 * Builds the normalized scope from a Functions Framework request.
 *
 * The body is parsed here, once, at the boundary. `navigator.sendBeacon`
 * forces `Content-Type: text/plain;charset=UTF-8` even for JSON payloads and
 * the Functions Framework hands those through as strings, so parsing at the
 * boundary is what keeps `ingest.body` and the event the pipeline receives
 * from disagreeing.
 *
 * Every read tolerates a partial request, so a missing optional yields the
 * contract's empty value rather than turning scope construction into a 500.
 *
 * @param req The Functions Framework request.
 * @returns The normalized scope.
 */
export function buildScope(req: Request): Source.Scope {
  const headers = normalizeHeaders(req.headers);
  const originalUrl = req.originalUrl || req.url || '';
  const separator = originalUrl.indexOf('?');
  const queryString = separator === -1 ? '' : originalUrl.slice(separator);
  const path =
    req.path ||
    (separator === -1 ? originalUrl : originalUrl.slice(0, separator));

  const host =
    (typeof req.get === 'function' ? req.get('host') : undefined) ||
    headers.host;
  const protocol = req.protocol || headers['x-forwarded-proto'] || 'https';

  const scope: Source.Scope = {
    method: (req.method || '').toUpperCase(),
    url: host ? `${protocol}://${host}${originalUrl}` : '',
    path,
    query: normalizeQuery(queryString),
    headers,
    body: normalizeBody(req.body),
    raw: req,
  };

  if (req.ip) scope.ip = req.ip;

  return scope;
}
