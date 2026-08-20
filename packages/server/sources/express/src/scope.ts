import { normalizeHeaders, normalizeQuery } from '@walkeros/core';
import type { Source } from '@walkeros/core';
import type { Request } from 'express';

/**
 * Builds the normalized scope from an Express request.
 *
 * Every read tolerates a partial request: Express fills these fields itself,
 * but sub-app mounting changes which of `originalUrl` and `url` carries the
 * full path, and a scope that throws on a missing optional would turn scope
 * construction into a 500 for the whole request. A missing field yields the
 * contract's empty value.
 *
 * The body is taken as-is: the route's JSON parser has already parsed it,
 * including `text/plain` beacons, so no second parse belongs here.
 *
 * @param req The Express request.
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
  const protocol = req.protocol || headers['x-forwarded-proto'] || 'http';

  const scope: Source.Scope = {
    method: (req.method || '').toUpperCase(),
    // An absolute URL or nothing: a partial URL would be a third shape.
    url: host ? `${protocol}://${host}${originalUrl}` : '',
    path,
    query: normalizeQuery(queryString),
    headers,
    body: req.body,
    raw: req,
  };

  if (req.ip) scope.ip = req.ip;

  return scope;
}
