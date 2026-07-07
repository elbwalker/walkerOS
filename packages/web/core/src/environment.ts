import type { Env } from './types/destination';
import type { Destination } from '@walkeros/core';
import { OBSERVE_ENV_KEY, isEnvObserve, parseCallPath } from '@walkeros/core';

/**
 * Transparent recording Proxy over a resolved env root (`window`, `document`,
 * or an env override). `subPaths` are the tracked dot-path segments AFTER the
 * root, so a leaf is a length-1 remainder and a longer remainder is an
 * intermediate to recurse into.
 *
 * Only a get-trap: writes fall through to the real target so patterns like
 * gtm's `window[dataLayerName] = ...` mutate the actual global. `Reflect.get`
 * uses `t` (never the proxy) as receiver so native accessors keep their brand
 * checks (`window.document`, `window.location`). Wrappers and child proxies are
 * memoized per proxy so repeated reads return the same reference and untracked
 * globals are never bound.
 */
function wrapRoot(
  target: object,
  subPaths: string[][],
  record: Destination.EnvObserve['record'],
  prefix: string,
): object {
  const memo = new Map<string, unknown>();

  return new Proxy(target, {
    get(t, prop) {
      if (typeof prop !== 'string') return Reflect.get(t, prop, t);

      const cached = memo.get(prop);
      if (cached !== undefined) return cached;

      // Leaf: this prop is the final tracked segment — record its calls.
      if (subPaths.some((sp) => sp.length === 1 && sp[0] === prop)) {
        const original: unknown = Reflect.get(t, prop, t);
        if (typeof original !== 'function') return original;

        const fullPath = `${prefix}.${prop}`;
        const wrapper = (...args: unknown[]): unknown => {
          record(fullPath, args);
          return original.apply(t, args);
        };
        memo.set(prop, wrapper);
        return wrapper;
      }

      // Intermediate: navigate deeper, keeping the same recorder.
      const interRests = subPaths
        .filter((sp) => sp.length > 1 && sp[0] === prop)
        .map((sp) => sp.slice(1));
      if (interRests.length > 0) {
        const child: unknown = Reflect.get(t, prop, t);
        if (child === null || typeof child !== 'object') return child;

        const childProxy = wrapRoot(
          child,
          interRests,
          record,
          `${prefix}.${prop}`,
        );
        memo.set(prop, childProxy);
        return childProxy;
      }

      return Reflect.get(t, prop, t);
    },
  });
}

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

    // Group tracked paths by root segment through the shared grammar so the
    // fallback wrapper and wrapEnv cannot drift.
    const subPathsByRoot = new Map<string, string[][]>();
    for (const raw of observe.paths) {
      const segments = parseCallPath(raw);
      const root = segments[0];
      // W5 filters malformed paths already; guard against an empty parse.
      if (root === undefined) continue;
      const group = subPathsByRoot.get(root) ?? [];
      group.push(segments.slice(1));
      subPathsByRoot.set(root, group);
    }

    // Wrap each present, navigable root; a missing or non-object root is left
    // as-is (its leaf stays unresolvable, matching wrapEnv).
    for (const [root, subPaths] of subPathsByRoot) {
      const target = merged[root];
      if (target !== null && typeof target === 'object') {
        merged[root] = wrapRoot(target, subPaths, observe.record, root);
      }
    }
  }

  return merged as Omit<E, 'window' | 'document'> & {
    window: Window & NonNullable<E['window']>;
    document: Document & NonNullable<E['document']>;
  };
}
