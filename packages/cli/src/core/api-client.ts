import createClient from 'openapi-fetch';
import type { paths } from '../types/api.gen.js';
import { getToken } from './auth.js';
import { resolveAppUrl } from '../lib/config-file.js';
import { clientContextHeaders } from './client-context.js';

export function createApiClient() {
  const token = getToken();
  if (!token) throw new Error('WALKEROS_TOKEN not set.');

  // Note: openapi-fetch fixes headers at createClient time. The CLI entry
  // point (and MCP boot path) call setClientContext before any API client is
  // constructed, so the client-context headers captured here are stable.
  return createClient<paths>({
    baseUrl: resolveAppUrl(),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...clientContextHeaders(),
    },
  });
}
