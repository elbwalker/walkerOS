import type { OAuth2Client } from 'google-auth-library';
import type { Env } from '../types';

/**
 * Example environment configurations for Google Data Manager destination.
 *
 * The destination invokes `env.fetch(url, { method, headers, body })` once
 * per push, with `Authorization: Bearer <accessToken>` obtained from
 * `env.authClient` via `getAccessToken`.
 *
 * For tests we use a stub `authClient` (jest mocks the `getAccessToken`
 * helper at module level) and a mock `fetch` returning a successful ingest
 * response.
 */

async function mockFetch(): Promise<Response> {
  return {
    ok: true,
    status: 200,
    json: async () => ({ requestId: 'mock-request-id', validationErrors: [] }),
    text: async () => '',
  } as unknown as Response;
}

const mockAuthClient = {
  getAccessToken: async () => ({ token: 'ya29.c.test_token' }),
} as unknown as OAuth2Client;

export const push: Env = {
  fetch: mockFetch,
  authClient: mockAuthClient,
};

export const simulation = ['fetch'];
