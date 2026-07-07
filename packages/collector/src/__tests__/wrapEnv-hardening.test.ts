import { isObject } from '@walkeros/core';
import { wrapEnv } from '../wrapEnv';

/**
 * Narrow an unknown slot to a callable without casts. wrapEnv returns
 * `wrappedEnv: Record<string, unknown>`, so every access needs runtime
 * narrowing; a broken fixture fails loudly instead of widening types.
 */
function asRecord(value: unknown): Record<string, unknown> {
  if (!isObject(value)) throw new Error('expected a plain object slot');
  return value;
}

function call(value: unknown, ...args: unknown[]): void {
  if (typeof value !== 'function') throw new Error('expected a function slot');
  value(...args);
}

describe('wrapEnv hardening', () => {
  it('clones a cyclic env without throwing and still records + forwards', () => {
    const seen: unknown[][] = [];
    const api: Record<string, unknown> = {
      track: (...args: unknown[]): void => {
        seen.push(args);
      },
    };
    api.self = api;

    const { wrappedEnv, calls } = wrapEnv({
      api,
      simulation: ['call:api.track'],
    });

    const wrappedApi = asRecord(wrappedEnv.api);
    // The cycle is preserved as a cycle in the clone's own graph.
    expect(wrappedApi.self).toBe(wrappedApi);
    expect(wrappedApi).not.toBe(api);

    call(wrappedApi.track, 'a', 1);
    expect(calls).toHaveLength(1);
    expect(calls[0].fn).toBe('api.track');
    expect(calls[0].args).toEqual(['a', 1]);
    // The real fn was still invoked through the recorder.
    expect(seen).toEqual([['a', 1]]);
    // The original env is untouched.
    expect(api.self).toBe(api);
  });

  it('keeps shared sibling references shared in the clone', () => {
    const shared: Record<string, unknown> = { flag: true };
    const { wrappedEnv } = wrapEnv({
      a: { shared },
      b: { shared },
      simulation: [],
    });

    const a = asRecord(wrappedEnv.a);
    const b = asRecord(wrappedEnv.b);
    // One clone per source object: siblings still point at the same copy.
    expect(a.shared).toBe(b.shared);
    expect(a.shared).not.toBe(shared);
  });

  it('reuses the original reference beyond the depth cap and stays functional', () => {
    const deepFn = jest.fn();
    const leaf: Record<string, unknown> = { fn: deepFn };

    // Wrap the leaf in 7 shells so it sits at depth 8 (root children = 1).
    let node: Record<string, unknown> = leaf;
    for (let i = 0; i < 7; i++) node = { n: node };

    const { wrappedEnv } = wrapEnv({ l1: node, simulation: [] });

    // Shells above the cap are cloned...
    expect(wrappedEnv.l1).not.toBe(node);

    let cursor: unknown = wrappedEnv.l1;
    for (let i = 0; i < 7; i++) {
      cursor = asRecord(cursor).n;
    }
    // ...but at the cap the ORIGINAL reference is reused (functional
    // fallback, never a marker: destinations execute against this env).
    expect(cursor).toBe(leaf);

    call(asRecord(cursor).fn, 'x');
    expect(deepFn).toHaveBeenCalledWith('x');
  });

  it('routes paths whose parent lies beyond the clone cap to unresolved', () => {
    // A 9-segment path navigates 8 levels to its parent — exactly where the
    // clone cap reuses ORIGINAL references. Wrapping there would permanently
    // mutate the caller's env, so the path must go to unresolved instead.
    const original = (..._args: unknown[]): void => {};
    const leaf: Record<string, unknown> = { fn: original };
    let node: Record<string, unknown> = leaf;
    for (const key of ['h', 'g', 'f', 'e', 'd', 'c', 'b']) {
      node = { [key]: node };
    }
    const env: Record<string, unknown> = { a: node };

    const { wrappedEnv, unresolved, calls } = wrapEnv({
      ...env,
      simulation: ['a.b.c.d.e.f.g.h.fn'],
    });

    expect(unresolved).toEqual(['a.b.c.d.e.f.g.h.fn']);
    // The original env leaf keeps its identity: nothing was installed on it.
    expect(leaf.fn).toBe(original);

    // Navigating the wrapped env reaches the SAME original parent (clone-cap
    // reuse) — and its fn is still the untouched original.
    let cursor: unknown = wrappedEnv;
    for (const key of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      cursor = asRecord(cursor)[key];
    }
    expect(cursor).toBe(leaf);
    call(asRecord(cursor).fn, 'x');
    expect(calls).toHaveLength(0);
  });
});
