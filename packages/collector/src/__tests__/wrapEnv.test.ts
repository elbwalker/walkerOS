import { isObject } from '@walkeros/core';
import { wrapEnv } from '../wrapEnv';

/**
 * Narrow runtime shape of the `window` slot inside wrapEnv test fixtures.
 * `wrapEnv` returns `wrappedEnv: Record<string, unknown>`, so call sites
 * read `wrappedEnv.window` as `unknown`. Tests assert structurally via a
 * typed local instead of widening through `unknown`/`any`.
 */
interface TestWindow {
  gtag: (...args: unknown[]) => unknown;
  dataLayer?: { push: (...args: unknown[]) => unknown };
}

describe('wrapEnv', () => {
  it('records calls to tracked function paths', () => {
    const env = {
      window: { gtag: (..._args: unknown[]) => {} },
      simulation: ['window.gtag'],
    };

    const { wrappedEnv, calls } = wrapEnv(env);
    const win = wrappedEnv.window as TestWindow;
    win.gtag('event', 'purchase', { value: 42 });

    expect(calls).toHaveLength(1);
    expect(calls[0].fn).toBe('window.gtag');
    expect(calls[0].args).toEqual(['event', 'purchase', { value: 42 }]);
    expect(calls[0].ts).toBeGreaterThan(0);
  });

  it('records calls to nested paths like dataLayer.push', () => {
    const dataLayer: unknown[] = [];
    const env = {
      window: { dataLayer },
      simulation: ['window.dataLayer.push'],
    };

    const { wrappedEnv, calls } = wrapEnv(env);
    const win = wrappedEnv.window as {
      dataLayer: { push: (v: unknown) => void };
    };
    win.dataLayer.push({ event: 'test' });

    expect(calls).toHaveLength(1);
    expect(calls[0].fn).toBe('window.dataLayer.push');
    expect(calls[0].args).toEqual([{ event: 'test' }]);
  });

  it('still calls the original function', () => {
    let called = false;
    const env = {
      window: {
        gtag: () => {
          called = true;
        },
      },
      simulation: ['window.gtag'],
    };

    const { wrappedEnv } = wrapEnv(env);
    const win = wrappedEnv.window as TestWindow;
    win.gtag();

    expect(called).toBe(true);
  });

  it('strips simulation key from wrappedEnv', () => {
    const env = {
      window: { gtag: () => {} },
      simulation: ['window.gtag'],
    };

    const { wrappedEnv } = wrapEnv(env);
    expect(wrappedEnv).not.toHaveProperty('simulation');
    expect(wrappedEnv).toHaveProperty('window');
  });

  it('does not mutate the original env', () => {
    const original = () => {};
    const env = {
      window: { gtag: original },
      simulation: ['window.gtag'],
    };

    const { wrappedEnv } = wrapEnv(env);
    const win = wrappedEnv.window as TestWindow;
    expect(win.gtag).not.toBe(original);
    expect(env.window.gtag).toBe(original);
  });

  it('returns empty calls when simulation is empty', () => {
    const env = {
      window: { gtag: () => {} },
      simulation: [] as string[],
    };

    const { wrappedEnv, calls } = wrapEnv(env);
    const win = wrappedEnv.window as TestWindow;
    win.gtag();

    expect(calls).toHaveLength(0);
  });

  it('handles call: prefix in paths for backward compatibility', () => {
    const env = {
      window: { gtag: () => {} },
      simulation: ['call:window.gtag'],
    };

    const { wrappedEnv, calls } = wrapEnv(env);
    const win = wrappedEnv.window as TestWindow;
    win.gtag('test');

    expect(calls).toHaveLength(1);
    expect(calls[0].fn).toBe('window.gtag');
  });
});

/**
 * Call a possibly-wrapped leaf without a cast: narrow the parent slot via the
 * runtime `isObject` guard, then invoke only when the leaf is callable.
 */
function invoke(parent: unknown, leaf: string, ...args: unknown[]): void {
  const fn = isObject(parent) ? parent[leaf] : undefined;
  if (typeof fn === 'function') fn(...args);
}

describe('wrapEnv unresolved reporting', () => {
  it('reports an empty unresolved list when every path resolves', () => {
    const env = {
      window: { gtag: () => {} },
      simulation: ['window.gtag'],
    };

    const { unresolved } = wrapEnv(env);
    expect(unresolved).toEqual([]);
  });

  it('reports a path whose root is missing without a wrong-level wrap', () => {
    const env = { simulation: ['window.gtag'] };

    const { wrappedEnv, unresolved, calls } = wrapEnv(env);
    expect(unresolved).toEqual(['window.gtag']);
    expect(calls).toHaveLength(0);
    expect(wrappedEnv).not.toHaveProperty('window');
  });

  it('reports a path whose intermediate segment is missing', () => {
    const env = { a: {}, simulation: ['a.b.c'] };

    const { unresolved } = wrapEnv(env);
    expect(unresolved).toEqual(['a.b.c']);
  });

  it('reports a path whose leaf is absent', () => {
    const env = { window: {}, simulation: ['window.gtag'] };

    const { unresolved } = wrapEnv(env);
    expect(unresolved).toEqual(['window.gtag']);
  });

  it('reports a path whose leaf is not a function', () => {
    const env = { window: { gtag: 'nope' }, simulation: ['window.gtag'] };

    const { unresolved } = wrapEnv(env);
    expect(unresolved).toEqual(['window.gtag']);
  });

  it('skips malformed paths entirely: not wrapped, not unresolved', () => {
    // Malformed paths can never be resolved by the recorder fallback either
    // (shared parseCallPath grammar), so they must not ride into
    // EnvObserve.paths via the unresolved list.
    const env = { simulation: ['.a', 'a..b', ''] };

    const { unresolved, calls } = wrapEnv(env);
    expect(unresolved).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('keeps only well-formed paths in unresolved when mixed with malformed', () => {
    const env = { simulation: ['a..b', 'window.gtag'] };

    const { unresolved } = wrapEnv(env);
    expect(unresolved).toEqual(['window.gtag']);
  });

  it('does not collapse to a same-named leaf at the stop point', () => {
    // 'window.gtag' cannot resolve (no `window`), but a top-level `gtag`
    // exists. The old navigation would wrap that wrong-level leaf; it must
    // land in unresolved and leave the top-level leaf untouched.
    const original = (..._args: unknown[]) => {};
    const env = { gtag: original, simulation: ['window.gtag'] };

    const { wrappedEnv, unresolved, calls } = wrapEnv(env);
    expect(unresolved).toEqual(['window.gtag']);
    expect(wrappedEnv.gtag).toBe(original);
    invoke(wrappedEnv, 'gtag', 'x');
    expect(calls).toHaveLength(0);
  });

  it('separates resolved from unresolved paths in a mixed list', () => {
    const env = {
      window: { gtag: (..._args: unknown[]) => {} },
      simulation: ['window.gtag', 'window.missing'],
    };

    const { wrappedEnv, unresolved, calls } = wrapEnv(env);
    expect(unresolved).toEqual(['window.missing']);

    invoke(wrappedEnv.window, 'gtag', 'event');
    expect(calls).toHaveLength(1);
    expect(calls[0].fn).toBe('window.gtag');
  });
});
