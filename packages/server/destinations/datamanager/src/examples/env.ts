import type { SendResponse } from '@walkeros/core';
import type { AuthClient, Env } from '../types';

/**
 * Example environment configurations for Google Data Manager destination.
 *
 * The destination calls `env.sendServer(url, body, { headers, timeout })`
 * once per push, with the headers `env.authClient.getRequestHeaders()`
 * returns (an `authorization` header with the access token).
 *
 * For tests we use a stub `authClient` with a fixed token and a mock
 * `sendServer` returning a successful ingest answer.
 */

async function mockSendServer(): Promise<SendResponse> {
  return { data: { requestId: 'mock-request-id' } };
}

const mockAuthClient: AuthClient = {
  getRequestHeaders: async () =>
    new Headers({ authorization: 'Bearer ya29.c.test_token' }),
};

export const push: Env = {
  sendServer: mockSendServer,
  authClient: mockAuthClient,
};

export const simulation = ['sendServer'];
