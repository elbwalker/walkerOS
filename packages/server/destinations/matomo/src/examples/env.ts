import type { SendDataValue, SendResponse } from '@walkeros/core';
import type { Env } from '../types';
import { isObject } from '@walkeros/core';

/**
 * Example environment for the Matomo destination.
 *
 * Matomo answers a bulk request with its counts, so the mock answers every
 * request of the body as tracked, without an HTTP request.
 */
async function mockSendServer(
  _url: string,
  data?: SendDataValue,
): Promise<SendResponse> {
  const body: unknown = typeof data === 'string' ? JSON.parse(data) : data;
  const tracked =
    isObject(body) && Array.isArray(body.requests) ? body.requests.length : 0;
  return { data: { status: 'success', tracked, invalid: 0 } };
}

/** Standard mock environment for push. */
export const push: Env = {
  sendServer: mockSendServer,
};

export const simulation = ['sendServer'];
