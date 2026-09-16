import { buildScopeFromNodeRequest, normalizeBody } from '@walkeros/core';
import type { Source } from '@walkeros/core';
import type { Request } from 'express';

/**
 * Builds the normalized scope from an Express request.
 *
 * The route parsers leave an application/json body parsed and a text/plain
 * body as a string. The string is resolved here, once: JSON when it parses
 * (sendBeacon payloads), otherwise kept raw for a `source.before` chain to
 * decode, as on the other server sources.
 *
 * @param req The Express request.
 * @returns The normalized scope.
 */
export function buildScope(req: Request): Source.Scope {
  return buildScopeFromNodeRequest(req, {
    body: normalizeBody(req.body),
    defaultProtocol: 'http',
  });
}
