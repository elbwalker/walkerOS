import type { SendDataValue, SendResponse } from '@walkeros/core';
import type { SendServerOptions } from '@walkeros/server-core';
import type { Env } from '../types';

/**
 * Example environment configurations for the Bing UET CAPI destination.
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring actual HTTP requests.
 */

type MockSendServer = (
  url: string,
  data?: SendDataValue,
  options?: SendServerOptions,
) => Promise<SendResponse>;

const mockSendServer: MockSendServer = async () => ({
  ok: true,
  data: {
    status: 'OK',
    requestId: 'mock-123',
  },
});

/**
 * Standard mock environment for push operations.
 *
 * Use this for testing Bing UET CAPI events without making actual HTTP
 * requests to Microsoft's servers.
 */
export const push: Env = {
  sendServer: mockSendServer,
};

export const simulation = ['sendServer'];
