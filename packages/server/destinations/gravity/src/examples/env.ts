import type { SendDataValue, SendResponse } from '@walkeros/core';
import type { SendServerOptions } from '@walkeros/server-core';
import type { Env } from '../types';

/**
 * Example environment configurations for Gravity Conversions API destination
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
  // Gravity answers 200 with a status per event
  return { data: { results: [{ status: 'success' }] } };
};

/**
 * Standard mock environment for push operations
 *
 * Use this for testing Gravity conversion events without making
 * actual HTTP requests to Gravity.
 */
export const push: Env = {
  sendServer: mockSendServer,
};

export const simulation = ['sendServer'];
