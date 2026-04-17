import type { SendDataValue, SendResponse } from '@walkeros/core';
import type { SendServerOptions } from '@walkeros/server-core';
import type { Env } from '../types';

/**
 * Example environment configurations for X (Twitter) Conversions API destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring actual HTTP requests.
 */

type SendServerFn = (
  url: string,
  data?: SendDataValue,
  options?: SendServerOptions,
) => Promise<SendResponse>;

/**
 * Mock sendServer function that simulates successful HTTP responses
 */
const mockSendServer: SendServerFn = async () => {
  return {
    ok: true,
    data: { request_id: 'mock-request-id' },
  };
};

/**
 * Standard mock environment for push operations
 *
 * Use this for testing X Conversions API events without making
 * actual HTTP requests to X's servers.
 */
export const push: Env = {
  sendServer: mockSendServer,
};

export const simulation = ['sendServer'];
