import type { SendDataValue, SendResponse } from '@walkeros/core';
import type { SendServerOptions } from '@walkeros/server-core';
import type { Env } from '../types';

/**
 * Example environment configurations for OpenAI Ads Conversions API destination
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
  // Simulate a successful OpenAI Ads API response
  return {
    data: {
      success: true,
    },
  };
};

/**
 * Standard mock environment for push operations
 *
 * Use this for testing OpenAI Ads conversion events without making
 * actual HTTP requests to OpenAI.
 */
export const push: Env = {
  sendServer: mockSendServer,
};

export const simulation = ['sendServer'];
