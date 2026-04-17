import type { SendDataValue, SendResponse } from '@walkeros/core';
import type { SendServerOptions } from '@walkeros/server-core';
import type { Env } from '../types';

/**
 * Example environment configurations for Criteo Events API destination.
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
  data: 'OK',
});

/**
 * Standard mock environment for push operations.
 *
 * Use this for testing Criteo Events API pushes without making
 * actual HTTP requests to Criteo's servers.
 */
export const push: Env = {
  sendServer: mockSendServer,
};

export const simulation = ['sendServer'];
