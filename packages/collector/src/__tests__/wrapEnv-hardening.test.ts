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
});
