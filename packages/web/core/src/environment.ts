import type { Environment } from './types/destination';

/**
 * Helper function to get environment globals with fallbacks
 *
 * Returns window and document by default, with optional environment overrides.
 *
 * @param env - Optional environment overrides
 * @returns Environment with window/document defaults and any provided overrides
 */
export function getEnvironment(env?: Environment) {
  return {
    window: typeof window !== 'undefined' ? window : globalThis.window,
    document: typeof document !== 'undefined' ? document : globalThis.document,
    ...env,
  };
}
