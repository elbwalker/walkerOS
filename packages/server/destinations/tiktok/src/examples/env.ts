import type { SendDataValue, SendResponse } from '@walkeros/core';
import type { SendServerOptions } from '@walkeros/server-core';
import type { Env } from '../types';

/**
 * Example environment configurations for TikTok Events API destination
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
  // Simulate successful TikTok API response
  return {
    ok: true,
    data: {
      code: 0,
      message: 'OK',
    },
  };
}

/**
 * Standard mock environment for push operations
 *
 * Use this for testing TikTok Events API events without making
 * actual HTTP requests to TikTok's servers.
 */
export const push: Env = {
  sendServer: mockSendServer,
};

export const simulation = ['sendServer'];
