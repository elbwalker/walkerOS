import type { Env } from './types/destination';

/**
 * Helper function to get environment globals with fallbacks
 *
 * Returns window and document by default, with optional environment overrides.
 *
 * @param env - Optional environment overrides
 * @returns Env with window/document defaults and any provided overrides
 */
export function getEnv(env?: Env) {
  return {
    window: typeof window !== 'undefined' ? window : globalThis.window,
    document: typeof document !== 'undefined' ? document : globalThis.document,
    ...env,
  };
}
