import type { Env } from './types/destination';
import {
  OBSERVE_ENV_KEY,
  isEnvObserve,
  observeEnv,
  parseCallPath,
} from '@walkeros/core';

/**
 * Helper function to get environment globals with fallbacks
 *
 * Returns window and document by default, with optional environment overrides.
 * Generic over the caller's `Env` so a destination that narrows `window`/
 * `document` (and augments the DOM globals via `declare global`) gets those
 * narrowed types back without casting at the call site.
 *
 * When the collector injects an observe recorder under `OBSERVE_ENV_KEY` (trace
 * level, live-web paths wrapEnv could not resolve), the resolved roots are
 * wrapped in a transparent recording Proxy and the key is stripped before the
 * env reaches the destination. Outside trace the key is absent, so the guard is
 * a single property read with no wrapping cost.
 *
 * @param env - Optional environment overrides
 * @returns Env with window/document defaults and any provided overrides
 */
export function getEnv<E extends Env = Env>(env?: E) {
  // The DOM globals (typed `Window`/`Document`) are merged with the caller's
  // narrowed `Env` overrides. This intersection is asserted once here, at the
  // single boundary where the loose `Record`-typed base meets the real DOM
  // globals, so no destination has to cast `window`/`document` per call.
  const merged: Record<string, unknown> = {
    window: typeof window !== 'undefined' ? window : globalThis.window,
    document: typeof document !== 'undefined' ? document : globalThis.document,
    ...env,
  };

  const observe = env && env[OBSERVE_ENV_KEY];
  if (isEnvObserve(observe)) {
    // Strip the recorder so it never reaches the destination (mirrors wrapEnv
    // stripping `simulation`).
    delete merged[OBSERVE_ENV_KEY];

    // The shared core recorder (the same one wrapEnv uses) returns a Proxy
    // view; only the tracked roots are swapped in, so untracked globals are
    // never touched. Writes fall through to the real target, so patterns like
    // gtm's `window[dataLayerName] = ...` mutate the actual global. A missing
    // or non-object root is left as-is (its leaf stays unresolvable).
    const view = observeEnv(merged, observe.paths, observe.record).env;
    const roots = new Set<string>();
    for (const path of observe.paths) {
      const root = parseCallPath(path)[0];
      if (root === undefined) continue;
      const target = merged[root];
      if (target !== null && typeof target === 'object') roots.add(root);
    }
    // Read every root view before swapping any in, so no view wraps another.
    const wrapped = Array.from(roots, (root) => [root, view[root]] as const);
    for (const [root, value] of wrapped) merged[root] = value;
  }

  return merged as Omit<E, 'window' | 'document'> & {
    window: Window & NonNullable<E['window']>;
    document: Document & NonNullable<E['document']>;
  };
}
