import type { SendDataValue, SendResponse } from '@walkeros/core';
import type { SendServerOptions } from '@walkeros/server-core';
import type { Env, ResponseBody } from '../types';

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

/** Gravity's live answer: the event is accepted and processed later. */
const accepted: ResponseBody = {
  events_received: 1,
  events_errored: 0,
  results: [{ status: 'accepted', attributed: false }],
  test_mode: false,
};

/**
 * Mock sendServer function that simulates successful HTTP responses
 */
const mockSendServer: MockSendServer = async () => {
  return { data: accepted };
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
