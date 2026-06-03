import type { Env } from './types/destination';

/**
 * Helper function to get environment globals with fallbacks
 *
 * Returns window and document by default, with optional environment overrides.
 * Generic over the caller's `Env` so a destination that narrows `window`/
 * `document` (and augments the DOM globals via `declare global`) gets those
 * narrowed types back without casting at the call site.
 *
 * @param env - Optional environment overrides
 * @returns Env with window/document defaults and any provided overrides
 */
export function getEnv<E extends Env = Env>(env?: E) {
  // The DOM globals (typed `Window`/`Document`) are merged with the caller's
  // narrowed `Env` overrides. This intersection is asserted once here, at the
  // single boundary where the loose `Record`-typed base meets the real DOM
  // globals, so no destination has to cast `window`/`document` per call.
  return {
    window: typeof window !== 'undefined' ? window : globalThis.window,
    document: typeof document !== 'undefined' ? document : globalThis.document,
    ...env,
  } as Omit<E, 'window' | 'document'> & {
    window: Window & NonNullable<E['window']>;
    document: Document & NonNullable<E['document']>;
  };
}
