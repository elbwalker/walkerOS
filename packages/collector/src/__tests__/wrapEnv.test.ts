import { wrapEnv } from '../wrapEnv';

describe('wrapEnv', () => {
  it('records calls to tracked function paths', () => {
    const env = {
      window: { gtag: (..._args: unknown[]) => {} },
      simulation: ['window.gtag'],
    };

    const { wrappedEnv, calls } = wrapEnv(env);
    (wrappedEnv.window as any).gtag('event', 'purchase', { value: 42 });

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
    (wrappedEnv.window as any).dataLayer.push({ event: 'test' });

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
    (wrappedEnv.window as any).gtag();

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
    expect((wrappedEnv.window as any).gtag).not.toBe(original);
    expect(env.window.gtag).toBe(original);
  });

  it('returns empty calls when simulation is empty', () => {
    const env = {
      window: { gtag: () => {} },
      simulation: [] as string[],
    };

    const { wrappedEnv, calls } = wrapEnv(env);
    (wrappedEnv.window as any).gtag();

    expect(calls).toHaveLength(0);
  });

  it('handles call: prefix in paths for backward compatibility', () => {
    const env = {
      window: { gtag: () => {} },
      simulation: ['call:window.gtag'],
    };

    const { wrappedEnv, calls } = wrapEnv(env);
    (wrappedEnv.window as any).gtag('test');

    expect(calls).toHaveLength(1);
    expect(calls[0].fn).toBe('window.gtag');
  });
});
