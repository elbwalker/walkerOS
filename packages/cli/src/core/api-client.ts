import createClient from 'openapi-fetch';
import type { paths } from '../types/api.gen.js';
import { getToken } from './auth.js';
import { resolveAppUrl } from '../lib/config-file.js';

export function createApiClient() {
  const token = getToken();
  if (!token) throw new Error('WALKEROS_TOKEN not set.');

  return createClient<paths>({
    baseUrl: resolveAppUrl(),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}
