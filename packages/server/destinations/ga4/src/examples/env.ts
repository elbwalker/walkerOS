import type { SendDataValue, SendResponse } from '@walkeros/core';
import type { SendServerOptions } from '@walkeros/server-core';
import type { Env } from '../types';

/**
 * Example environment configurations for GA4 Measurement Protocol destination
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
  // GA4 answers 2xx with no body, even for an invalid payload
  return { data: {} };
};

/**
 * Standard mock environment for push operations
 *
 * Use this for testing GA4 events without making
 * actual HTTP requests to Google.
 */
export const push: Env = {
  sendServer: mockSendServer,
};

export const simulation = ['sendServer'];
