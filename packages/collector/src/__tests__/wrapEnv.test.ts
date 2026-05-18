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
