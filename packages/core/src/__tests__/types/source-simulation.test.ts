import type { Source } from '../../index';

describe('Source simulation types', () => {
  it('SetupFn accepts void return', () => {
    const setup: Source.SetupFn = (_input, env) => {
      const win = env.window as Window & { dataLayer?: unknown[] };
      win.dataLayer = [];
    };
    expect(typeof setup).toBe('function');
  });

  it('SetupFn accepts trigger return', () => {
    const setup: Source.SetupFn = (input, env) => {
      return () => {
        env.window.dispatchEvent(new CustomEvent('test', { detail: input }));
      };
    };
    const trigger = setup(
      {},
      {
        window: globalThis as Window & typeof globalThis,
        document: globalThis.document,
        localStorage: globalThis.localStorage,
      },
    );
    expect(typeof trigger).toBe('function');
  });

  it('Renderer accepts both values', () => {
    const renderers: Source.Renderer[] = ['browser', 'codebox'];
    expect(renderers).toHaveLength(2);
  });

  it('SimulationEnv is extensible', () => {
    const env: Source.SimulationEnv = {
      window: globalThis as Window & typeof globalThis,
      document: globalThis.document,
      localStorage: globalThis.localStorage,
      customProp: 42,
    };
    expect(env.customProp).toBe(42);
  });
});
