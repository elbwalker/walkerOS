import type { Simulation } from '@walkeros/core';
import { recordEnv } from '@walkeros/core';

interface WrapResult {
  /** Env view whose tracked paths record each call */
  wrappedEnv: Record<string, unknown>;
  /** Mutable array — calls are pushed here during step execution */
  calls: Simulation.Call[];
}

/**
 * Structural-clone depth cap. Beyond this depth the ORIGINAL reference is
 * reused instead of cloned: the wrapped env is what the destination executes
 * against, so the fallback must stay functional (never a marker string).
 */
const CLONE_MAX_DEPTH = 8;

/** Plain objects and arrays are data to copy; anything else is kept as is. */
function isPlainData(value: object): boolean {
  if (Array.isArray(value)) return true;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Visit-once structural clone of plain objects and arrays, so writes a step
 * makes to its env stay in this push. The memo maps each source object to its
 * single clone, so cycles terminate and shared references stay shared.
 * Functions and class instances are kept by reference: an instance copied
 * into a plain object would lose its prototype and `#private` fields.
 */
function deepClone(
  obj: unknown,
  memo: WeakMap<object, unknown>,
  depth: number,
): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (depth >= CLONE_MAX_DEPTH || !isPlainData(obj)) return obj;
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
  for (const [key, value] of Object.entries(obj)) {
    clone[key] =
      typeof value === 'function' ? value : deepClone(value, memo, depth + 1);
  }
  return clone;
}

/**
 * Record calls on tracked paths of a destination env.
 *
 * The env object must include a `simulation: string[]` declaring which
 * dot-paths to intercept. Returns a view of a cloned env (without
 * `simulation`) where those paths record every call into the `calls` array.
 * Recording is the shared core recorder `recordEnv`, so constructors,
 * method results and Promises on a path are followed.
 */
export function wrapEnv(
  env: Record<string, unknown> & { simulation: string[] },
): WrapResult {
  const { simulation, ...rest } = env;
  const cloned: Record<string, unknown> = {};
  const memo = new WeakMap<object, unknown>();
  for (const [key, value] of Object.entries(rest)) {
    cloned[key] =
      typeof value === 'function' ? value : deepClone(value, memo, 1);
  }

  const recorded = recordEnv(cloned, simulation);
  return { wrappedEnv: recorded.env, calls: recorded.calls };
}
