import { buildScopeFromNodeRequest } from '@walkeros/core';
import type { Source } from '@walkeros/core';
import type { Request } from 'express';

/**
 * Builds the normalized scope from an Express request.
 *
 * The body is taken as-is: the route's JSON parser has already parsed it,
 * including `text/plain` beacons, so no second parse belongs here.
 *
 * @param req The Express request.
 * @returns The normalized scope.
 */
export function buildScope(req: Request): Source.Scope {
  return buildScopeFromNodeRequest(req, {
    body: req.body,
    defaultProtocol: 'http',
  });
}
