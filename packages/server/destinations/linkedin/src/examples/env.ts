import type { SendDataValue, SendResponse } from '@walkeros/core';
import type { SendServerOptions } from '@walkeros/server-core';
import type { Env } from '../types';

/**
 * Example environment configurations for LinkedIn Conversions API destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring actual HTTP requests.
 */

/**
 * Mock sendServer function that simulates successful HTTP responses
 */
async function mockSendServer(
  url: string,
  data?: SendDataValue,
  options?: SendServerOptions,
): Promise<SendResponse> {
  return {
    ok: true,
    data: {},
  };
}

/**
 * Standard mock environment for push operations
 *
 * Use this for testing LinkedIn Conversions API events without making
 * actual HTTP requests to LinkedIn's servers.
 */
export const push: Env = {
  sendServer: mockSendServer,
};

export const simulation = ['sendServer'];
