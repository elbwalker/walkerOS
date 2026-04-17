import type { SendDataValue, SendResponse } from '@walkeros/core';
import type { SendServerOptions } from '@walkeros/server-core';
import type { Env } from '../types';

/**
 * Example environment configurations for mParticle Events API destination.
 *
 * Provides a standardized mock `sendServer` so tests and simulations can
 * run without making real HTTP calls to mParticle.
 */

type MockSendServer = (
  url: string,
  data?: SendDataValue,
  options?: SendServerOptions,
) => Promise<SendResponse>;

const mockSendServer: MockSendServer = async () => {
  // Simulates mParticle's typical 202 Accepted response for the Events API.
  return {
    ok: true,
    data: {},
  };
};

/**
 * Standard mock environment for push operations.
 */
export const push: Env = {
  sendServer: mockSendServer,
};

export const simulation = ['sendServer'];
