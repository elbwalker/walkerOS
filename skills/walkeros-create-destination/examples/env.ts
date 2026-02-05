import type { DestinationWeb } from '@walkeros/web-core';

/**
 * Mock environment for testing destinations.
 * Captures vendor SDK calls for verification.
 *
 * Test-only file - requires Jest.
 *
 * Create this file BEFORE implementation (Phase 2).
 */
export const env: { push: DestinationWeb.Env } = {
  push: {
    window: {
      vendorSdk: jest.fn(), // Captures all calls for verification
    } as unknown as Window,
    document: {} as Document,
  },
};
