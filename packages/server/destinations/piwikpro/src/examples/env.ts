import type { SendResponse } from '@walkeros/core';
import type { Env } from '../types';

/**
 * Example environment for the Piwik PRO destination.
 *
 * The Tracking API answers a bulk request with 202 and an empty body, so the
 * mock resolves `{ data: '' }` without an HTTP request.
 */
async function mockSendServer(): Promise<SendResponse> {
  return { data: '' };
}

/** Standard mock environment for push and pushBatch. */
export const push: Env = {
  sendServer: mockSendServer,
};

export const simulation = ['sendServer'];
