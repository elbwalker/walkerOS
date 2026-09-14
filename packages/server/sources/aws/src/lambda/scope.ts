import { normalizeBody, normalizeQuery } from '@walkeros/core';
import type { Source } from '@walkeros/core';
import type { LambdaEvent } from './types';
import { getPath, isAPIGatewayV2, parseEvent } from './utils';

/**
 * Builds the normalized scope from a Lambda event.
 *
 * API Gateway v1 and v2 describe the same request with different envelopes.
 * Both converge here, so a mapping written once resolves identically on
 * either. The v1 and v2 specific fields stay reachable through `raw`.
 *
 * @param event The Lambda event.
 * @returns The normalized scope.
 */
export function buildScope(event: LambdaEvent): Source.Scope {
  const parsed = parseEvent(event);
  const path = getPath(event);
  const queryString = parsed.queryString || '';

  // Lambda events carry no scheme. x-forwarded-proto when the proxy sets it,
  // otherwise https: API Gateway terminates TLS in every real deployment.
  const protocol = parsed.headers['x-forwarded-proto'] || 'https';
  const host = parsed.headers.host;
  const suffix = queryString ? `?${queryString}` : '';

  const scope: Source.Scope = {
    method: (parsed.method || '').toUpperCase(),
    url: host ? `${protocol}://${host}${path}${suffix}` : '',
    path,
    query: normalizeQuery(queryString),
    headers: parsed.headers,
    body: normalizeBody(parsed.body, parsed.isBase64Encoded),
    raw: event,
  };

  const ip = isAPIGatewayV2(event)
    ? event.requestContext?.http?.sourceIp
    : event.requestContext?.identity?.sourceIp;
  if (ip) scope.ip = ip;

  return scope;
}
