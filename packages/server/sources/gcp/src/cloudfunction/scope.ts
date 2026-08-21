import { buildScopeFromNodeRequest, normalizeBody } from '@walkeros/core';
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
 * @param req The Functions Framework request.
 * @returns The normalized scope.
 */
export function buildScope(req: Request): Source.Scope {
  return buildScopeFromNodeRequest(req, {
    body: normalizeBody(req.body),
    defaultProtocol: 'https',
  });
}
