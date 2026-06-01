import type { Env, VendorSdk } from '../templates/simple/types';

/**
 * Mock environment for testing destinations.
 * Captures vendor SDK calls for verification.
 *
 * Test-only file - requires Jest.
 *
 * Create this file BEFORE implementation (Phase 2).
 *
 * Because the SDK is declared OPTIONAL (`vendorSdk?`), the mock env satisfies
 * `Env` directly - no `as unknown as Window` cast needed. The jest mock is
 * assigned through a typed binding so it stays assignable to `VendorSdk`.
 */
const vendorSdk: VendorSdk = jest.fn(); // Captures all calls for verification

export const env: { push: Env } = {
  push: {
    window: { vendorSdk },
  },
};
