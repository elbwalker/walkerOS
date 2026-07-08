import type { Simulation } from '@walkeros/core';
import { parseCallPath } from '@walkeros/core';

/**
 * True for any non-null object, arrays included, narrowing to an index-readable
 * record. Arrays must count: `window.dataLayer.push` navigates through an array
 * to reach its method. (`isObject` from core rejects arrays, so it can't gate
 * intermediate navigation here.)
 */
function isNavigable(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface WrapResult {
  /** Env with tracked paths wrapped by recording functions */
  wrappedEnv: Record<string, unknown>;
  /** Mutable array — calls are pushed here during step execution */
  calls: Simulation.Call[];
  /**
   * Well-formed declared paths this env could not wrap: a missing or
   * non-object root/intermediate, an absent/non-function leaf, or a parent
   * beyond the clone cap (wrapping there would mutate the caller's env). Each
   * entry is the post-`call:` stripped dot-path (what the recorder records as
   * `fn`) — this list feeds `EnvObserve.paths` directly, so malformed paths
   * (`parseCallPath` returned `[]`) are skipped entirely: the shared grammar
   * makes them unresolvable for the fallback wrapper too. A path that
   * navigates part-way then stops belongs here, never wrapped at a wrong level.
   */
  unresolved: string[];
}

/**
 * Structural-clone depth cap. Beyond this depth the ORIGINAL reference is
 * reused instead of cloned: the wrapped env is what the destination executes
 * against, so the fallback must stay functional (never a marker string).
 * Tracked simulation dot-paths must resolve within this depth so recorders
 * are installed on cloned parents and never mutate the caller's env.
 */
const CLONE_MAX_DEPTH = 8;

/**
 * Visit-once structural clone. The memo maps each source object to its single
 * clone, so cycles terminate and shared references stay shared (the clone
 * preserves the object graph's shape). Functions are kept by reference.
 */
function deepClone(
  obj: unknown,
  memo: WeakMap<object, unknown>,
  depth: number,
): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (depth >= CLONE_MAX_DEPTH) return obj;
  const existing = memo.get(obj);
  if (existing !== undefined) return existing;
  if (Array.isArray(obj)) {
    const cloneArr: unknown[] = [];
    memo.set(obj, cloneArr);
    for (const item of obj) {
      cloneArr.push(deepClone(item, memo, depth + 1));
    }
    return cloneArr;
  }
  const clone: Record<string, unknown> = {};
  memo.set(obj, clone);
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    clone[key] =
      typeof value === 'function' ? value : deepClone(value, memo, depth + 1);
  }
  return clone;
}

/**
 * Wrap tracked paths in a destination env with recording wrappers.
 *
 * The env object must include a `simulation: string[]` declaring which
 * dot-paths to intercept. Returns a cloned env (without `simulation`)
 * where those paths record every call into the `calls` array.
 */
export function wrapEnv(
  env: Record<string, unknown> & { simulation: string[] },
): WrapResult {
  const calls: Simulation.Call[] = [];
  const unresolved: string[] = [];
  const { simulation, ...rest } = env;

  // Deep clone the env to avoid mutating the original (preserves functions)
  const wrappedEnv = deepClone(
    rest,
    new WeakMap<object, unknown>(),
    0,
  ) as Record<string, unknown>;

  for (const rawPath of simulation) {
    // `parseCallPath` owns the split grammar (shared with getEnv): strips a
    // single `call:` prefix, splits on `.`, rejects empty segments as `[]`.
    const segments = parseCallPath(rawPath);
    if (segments.length === 0) {
      // Malformed: the fallback wrapper shares this grammar, so the path can
      // never resolve anywhere — skip it, keeping `unresolved` well-formed.
      continue;
    }

    // Post-`call:` display form derived from the shared segments, so no local
    // strip literal can drift from `parseCallPath`.
    const path = segments.join('.');

    // A parent at or beyond the clone cap is an ORIGINAL reference (see
    // deepClone); installing a wrapper there would permanently mutate the
    // caller's env. The recorder fallback handles such paths instead.
    if (segments.length - 1 >= CLONE_MAX_DEPTH) {
      unresolved.push(path);
      continue;
    }

    // Navigate to the parent. Every intermediate must resolve to an object;
    // stopping short sends the whole path to `unresolved` rather than wrapping
    // a same-named leaf at the wrong level.
    let target: Record<string, unknown> = wrappedEnv;
    let resolved = true;
    for (let i = 0; i < segments.length - 1; i++) {
      const next = target[segments[i]];
      if (!isNavigable(next)) {
        resolved = false;
        break;
      }
      target = next;
    }

    const leaf = segments[segments.length - 1];
    if (!resolved || !(leaf in target)) {
      unresolved.push(path);
      continue;
    }

    const original = target[leaf];
    if (typeof original !== 'function') {
      unresolved.push(path);
      continue;
    }

    target[leaf] = function (this: unknown, ...args: unknown[]) {
      calls.push({ fn: path, args, ts: Date.now() });
      return original.apply(this, args);
    };
  }

  return { wrappedEnv, calls, unresolved };
}
