import createClient from 'openapi-fetch';
import type { paths } from '../types/api.gen.js';
import { resolveAccessToken } from './auth.js';
import { resolveAppUrl } from '../lib/config-file.js';
import { requireSecureUrl } from '../lib/secure-url.js';
import { clientContextHeaders } from './client-context.js';

export function createApiClient() {
  // Note: openapi-fetch fixes headers at createClient time. The CLI entry
  // point (and MCP boot path) call setClientContext before any API client is
  // constructed, so the client-context headers captured here are stable.
  const client = createClient<paths>({
    baseUrl: resolveAppUrl(),
    headers: {
      'Content-Type': 'application/json',
      ...clientContextHeaders(),
    },
  });

  client.use({
    // Authorization is attached per request, not at construction: the stdio
    // MCP server builds one client and keeps it for hours, so a token captured
    // here would go stale and never pick up a refresh.
    async onRequest({ request }) {
      const token = await resolveAccessToken();
      if (!token)
        throw new Error('Not authenticated. Run `walkeros auth login` first.');
      // Checked against the outgoing URL rather than the base one, so a path
      // that resolved somewhere else still cannot take the bearer with it.
      requireSecureUrl(request.url);
      request.headers.set('Authorization', `Bearer ${token}`);
      return request;
    },
  });

  return client;
}
