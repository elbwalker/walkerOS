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

describe('wrapEnv with paths that do not resolve', () => {
  it('records nothing for a missing root and adds no wrong-level wrap', () => {
    const env = { simulation: ['window.gtag'] };

    const { wrappedEnv, calls } = wrapEnv(env);
    expect(calls).toHaveLength(0);
    expect(wrappedEnv).not.toHaveProperty('window');
  });

  it('skips malformed paths entirely', () => {
    const env = { simulation: ['.a', 'a..b', ''] };

    const { calls } = wrapEnv(env);
    expect(calls).toHaveLength(0);
  });

  it('does not collapse to a same-named leaf at the stop point', () => {
    // 'window.gtag' cannot resolve (no `window`), but a top-level `gtag`
    // exists: it must stay untouched and record nothing.
    const original = (..._args: unknown[]) => {};
    const env = { gtag: original, simulation: ['window.gtag'] };

    const { wrappedEnv, calls } = wrapEnv(env);
    expect(wrappedEnv.gtag).toBe(original);
    invoke(wrappedEnv, 'gtag', 'x');
    expect(calls).toHaveLength(0);
  });

  it('records the resolved path of a mixed list', () => {
    const env = {
      window: { gtag: (..._args: unknown[]) => {} },
      simulation: ['window.gtag', 'window.missing'],
    };

    const { wrappedEnv, calls } = wrapEnv(env);
    invoke(wrappedEnv.window, 'gtag', 'event');
    expect(calls).toHaveLength(1);
    expect(calls[0].fn).toBe('window.gtag');
  });
});
