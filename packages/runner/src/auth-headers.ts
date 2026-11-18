import type { AppAuth } from './credentials.js';

/** One app request as the credential's headers cover it: the exact body bytes are signed. */
export interface AppRequest {
  method: string;
  url: string;
  body?: Uint8Array;
}

/**
 * The headers of each attempt `fetchWithRetry` makes inside one send of
 * `sendWithServiceAuth`: the ones it gave for the first attempt, fresh ones
 * from `authorize` for each retry, since a DPoP proof or a signature is good
 * for one request only.
 */
export function attemptHeaders(
  app: AppAuth,
  request: AppRequest,
  first: Record<string, string>,
): () => Promise<Record<string, string>> {
  let given = false;
  return async () => {
    if (given) return app.authorize(request);
    given = true;
    return first;
  };
}
