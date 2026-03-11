import type { Simulation } from '@walkeros/core';

interface WrapResult {
  /** Env with tracked paths wrapped by recording functions */
  wrappedEnv: Record<string, unknown>;
  /** Mutable array — calls are pushed here during step execution */
  calls: Simulation.Call[];
}

function deepClone(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const clone: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    clone[key] = typeof value === 'function' ? value : deepClone(value);
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
  const { simulation, ...rest } = env;

  // Deep clone the env to avoid mutating the original (preserves functions)
  const wrappedEnv = deepClone(rest) as Record<string, unknown>;

  for (const rawPath of simulation) {
    // Strip optional "call:" prefix
    const path = rawPath.startsWith('call:') ? rawPath.slice(5) : rawPath;
    const segments = path.split('.');

    // Navigate to the parent
    let target: Record<string, unknown> = wrappedEnv;
    for (let i = 0; i < segments.length - 1; i++) {
      if (target[segments[i]] == null) break;
      target = target[segments[i]] as Record<string, unknown>;
    }

    const leaf = segments[segments.length - 1];
    if (target == null || !(leaf in target)) continue;

    const original = target[leaf];

    if (typeof original === 'function') {
      target[leaf] = function (this: unknown, ...args: unknown[]) {
        calls.push({ fn: path, args, ts: Date.now() });
        return original.apply(this, args);
      };
    }
  }

  return { wrappedEnv, calls };
}
