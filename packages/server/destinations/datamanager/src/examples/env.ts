import type { AuthClient, Env } from '../types';

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
  return new Response(
    JSON.stringify({ requestId: 'mock-request-id', validationErrors: [] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

const mockAuthClient: AuthClient = {
  getAccessToken: async () => ({ token: 'ya29.c.test_token' }),
};

export const push: Env = {
  fetch: mockFetch,
  authClient: mockAuthClient,
};

export const simulation = ['fetch'];
