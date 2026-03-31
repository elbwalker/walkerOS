import { startFlow } from '..';
import type { Hooks, Store } from '@walkeros/core';

describe('stores in startFlow', () => {
  it('should initialize stores and make them available on collector', async () => {
    const mockStore: Store.Init = (context) => ({
      type: 'mock',
      config: context.config as Store.Config,
      get: jest.fn().mockReturnValue(undefined),
      set: jest.fn(),
      delete: jest.fn(),
    });

    const { collector } = await startFlow({
      stores: {
        cache: { code: mockStore, config: { settings: { maxSize: 100 } } },
      },
    });

    expect(collector.stores.cache).toBeDefined();
    expect(collector.stores.cache.type).toBe('mock');
  });

  it('should destroy stores on shutdown (after transformers)', async () => {
    const destroyOrder: string[] = [];

    const mockStore: Store.Init = (context) => ({
      type: 'mock',
      config: context.config as Store.Config,
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      destroy: async () => {
        destroyOrder.push('store');
      },
    });

    const { collector } = await startFlow({
      stores: {
        cache: { code: mockStore },
      },
    });

    await collector.command('shutdown');
    expect(destroyOrder).toContain('store');
  });

  it('should resolve store references in transformer env for push context', async () => {
    let pushEnvStore: unknown;

    const mockStore: Store.Init = (context) => ({
      type: 'mock',
      config: context.config as Store.Config,
      get: jest.fn().mockReturnValue(undefined),
      set: jest.fn(),
      delete: jest.fn(),
    });

    const storeDef = { code: mockStore, config: {} };

    const mockTransformer = (context: any) => ({
      type: 'spy',
      config: context.config,
      push: async (_event: any, ctx: any) => {
        pushEnvStore = ctx.env.store;
      },
    });

    const { collector } = await startFlow({
      stores: { cache: storeDef },
      transformers: {
        spy: {
          code: mockTransformer as any,
          env: { store: storeDef }, // same reference — mimics bundler output
        },
      },
    });

    // Push an event through the transformer via preChain
    await collector.push({ name: 'test event' }, { preChain: ['spy'] });

    // The push context env.store should be the initialized Store.Instance
    expect(pushEnvStore).toBeDefined();
    expect(typeof (pushEnvStore as any).get).toBe('function');
    expect(typeof (pushEnvStore as any).set).toBe('function');
    expect(typeof (pushEnvStore as any).delete).toBe('function');
  });

  it('should fire store hooks when transformer accesses store via env', async () => {
    const hookCalls: string[] = [];

    const mockStore: Store.Init = (context) => ({
      type: 'mock',
      config: context.config as Store.Config,
      get: jest.fn().mockReturnValue('cached'),
      set: jest.fn(),
      delete: jest.fn(),
    });

    const storeDef = { code: mockStore, config: {} };

    const mockTransformer = (context: any) => ({
      type: 'spy',
      config: context.config,
      push: async (_event: any, ctx: any) => {
        ctx.env.store.get('test-key');
      },
    });

    const { collector } = await startFlow({
      stores: { cache: storeDef },
      transformers: {
        spy: {
          code: mockTransformer as any,
          env: { store: storeDef },
        },
      },
    });

    // Register a hook after init by mutating collector.hooks directly
    // useHooks reads from the hooks object at call time, so late registration works
    (collector.hooks as Hooks.Functions).preStoreGet = ((
      { fn }: { fn: (key: string) => unknown },
      key: string,
    ) => {
      hookCalls.push(`preStoreGet:${key}`);
      return fn(key);
    }) as Hooks.Functions[string];

    await collector.push({ name: 'test event' }, { preChain: ['spy'] });

    expect(hookCalls).toContain('preStoreGet:test-key');
  });
});
