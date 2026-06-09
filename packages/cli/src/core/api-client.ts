import createClient from 'openapi-fetch';
import type { paths } from '../types/api.gen.js';
import { getToken } from './auth.js';
import { resolveAppUrl } from '../lib/config-file.js';
import { clientContextHeaders } from './client-context.js';
import { bakedContractVersion } from './contract.js';

// One-shot guard: the drift warning is informational, so emit it at most once
// per process regardless of how many API calls run. A hard CLIENT_OUTDATED
// block still happens separately on the 426 path in api-error.ts.
let driftWarned = false;

/**
 * Inspect a response's contract-drift headers and emit a single de-duplicated
 * stderr warning when the server advertises a contract version that differs
 * from the one this client was built against. Reads:
 *   - `X-WalkerOS-Server-Version` (server's contract semver)
 *   - `X-WalkerOS-Min-Client`     (minimum client the server will accept)
 *
 * Exported for tests. Does not throw; never blocks the request.
 */
export function emitDriftWarning(responseHeaders: Headers): void {
  if (driftWarned) return;
  const serverVersion = responseHeaders.get('X-WalkerOS-Server-Version');
  if (!serverVersion) return;
  if (serverVersion === bakedContractVersion) return;

  driftWarned = true;
  const minClient = responseHeaders.get('X-WalkerOS-Min-Client');
  const minNote = minClient ? ` (min client ${minClient})` : '';
  process.stderr.write(
    `walkerOS: server contract version is ${serverVersion}${minNote}, ` +
      `this client was built against ${bakedContractVersion}. ` +
      `Run \`walkeros diagnostics\` or upgrade @walkeros/cli if commands misbehave.\n`,
  );
}

/** Test-only: reset the one-shot drift-warning guard between cases. */
export function resetDriftWarning(): void {
  driftWarned = false;
}

export function createApiClient() {
  const token = getToken();
  if (!token) throw new Error('WALKEROS_TOKEN not set.');

  // Note: openapi-fetch fixes headers at createClient time. The CLI entry
  // point (and MCP boot path) call setClientContext before any API client is
  // constructed, so the client-context headers captured here are stable.
  const client = createClient<paths>({
    baseUrl: resolveAppUrl(),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...clientContextHeaders(),
    },
  });

  // Surface contract drift once per process from any response's version
  // headers. openapi-fetch ^0.17 supports `use({ onResponse })`.
  client.use({
    onResponse({ response }) {
      emitDriftWarning(response.headers);
      return undefined;
    },
  });

  return client;
}
