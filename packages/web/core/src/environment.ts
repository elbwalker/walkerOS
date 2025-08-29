import type { Environment } from './types/destination';

/**
 * Helper function to get environment globals with fallbacks
 *
 * Provides a consistent way for web destinations to access browser APIs
 * (window, document) while supporting environment-based testing and simulation.
 *
 * @param environment - Optional environment override for testing/simulation
 * @returns Environment globals with fallback to real browser APIs
 *
 * @example
 * ```typescript
 * // Production usage (environment = undefined)
 * const { window, document } = getEnvironment();
 * // Uses real globalThis.window, globalThis.document
 *
 * // Testing usage
 * const testEnv = { window: { gtag: mockGtag } };
 * const { window, document } = getEnvironment(testEnv);
 * // Uses mock window.gtag, real document
 *
 * // Simulation usage
 * const simEnv = { window: { gtag: capturingFunction } };
 * const { window, document } = getEnvironment(simEnv);
 * // Uses capturing functions for simulation
 * ```
 */
export function getEnvironment<T extends Environment = Environment>(
  environment?: T,
): T extends undefined
  ? { window: Window; document: Document }
  : T & { window: Window; document: Document } {
  const defaults = {
    window: globalThis.window,
    document: globalThis.document,
  };

  if (!environment) {
    return defaults as unknown as T extends undefined
      ? { window: Window; document: Document }
      : T & { window: Window; document: Document };
  }

  // Merge environment with defaults, environment takes precedence
  return {
    ...defaults,
    ...environment,
  } as unknown as T extends undefined
    ? { window: Window; document: Document }
    : T & { window: Window; document: Document };
}
