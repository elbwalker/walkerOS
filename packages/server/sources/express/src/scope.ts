import { buildScopeFromNodeRequest, normalizeBody } from '@walkeros/core';
import type { Source } from '@walkeros/core';
import type { Request } from 'express';

/**
 * Builds the normalized scope from an Express request.
 *
 * An application/json body arrives already parsed. A text/plain body arrives
 * as a string and is resolved here, once, at the boundary: JSON (a
 * `navigator.sendBeacon` payload) becomes the parsed value, anything else
 * stays the raw string, so `ingest.body` and the event the pipeline receives
 * never disagree and a `source.before` decoder can read raw input.
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
