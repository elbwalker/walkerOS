import type { SendDataValue, SendResponse } from '@walkeros/core';
import type { SendServerOptions } from '@walkeros/server-core';
import type { Env } from '../types';

/**
 * Example environment configurations for Reddit Conversions API destination
 *
 * These environments provide standardized mock structures for testing
 * and development without requiring actual HTTP requests.
 */

type MockSendServer = (
  url: string,
  data?: SendDataValue,
  options?: SendServerOptions,
) => Promise<SendResponse>;

/**
 * Mock sendServer function that simulates successful HTTP responses
 */
const mockSendServer: MockSendServer = async () => {
  // Simulate successful Reddit API response
  return {
    ok: true,
    data: {
      success: true,
    },
  };
};

/**
 * Standard mock environment for push operations
 *
 * Use this for testing Reddit Conversions API events without making
 * actual HTTP requests to Reddit's servers.
 */
export const push: Env = {
  sendServer: mockSendServer,
};

export const simulation = ['sendServer'];
