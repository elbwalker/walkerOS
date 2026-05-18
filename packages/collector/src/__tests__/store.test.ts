import type {
  Collector,
  Destination,
  Source,
  Store,
  Transformer,
} from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { initStores, resolveStoreReferences } from '../store';

/**
 * Build a complete `Collector.Instance` for store tests. All required fields
 * present so the assignment to `Collector.Instance` does not need an
 * intermediate `unknown` cast.
 */
function createMockCollector(): Collector.Instance {
  const noopPush: Collector.PushFn = async () => ({ ok: true });
  const noopCommand: Collector.CommandFn = async () => ({ ok: true });
  const instance: Collector.Instance = {
    push: noopPush,
    command: noopCommand,
    allowed: true,
    config: { globalsStatic: {}, sessionStatic: {} },
    consent: {},
    custom: {},
    sources: {},
    destinations: {},
    transformers: {},
    stores: {},
    globals: {},
    hooks: {},
    logger: createMockLogger(),
    on: {},
    queue: [],
    round: 0,
    session: undefined,
    status: {
      startedAt: 0,
      in: 0,
      out: 0,
      failed: 0,
      sources: {},
      destinations: {},
      dropped: {},
    },
    timing: 0,
    user: {},
    pending: { destinations: {} },
  };
  return instance;
}

describe('initStores', () => {
  it('should initialize stores from definitions', async () => {
    const collector = createMockCollector();

    const mockInit: Store.Init = (context) => ({
      type: 'test',
      config: context.config as Store.Config,
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    });

    const stores = await initStores(collector, {
      cache: { code: mockInit, config: { settings: { maxSize: 100 } } },
    });

    expect(stores.cache).toBeDefined();
    expect(stores.cache.type).toBe('test');
  });

  it('should return empty object for empty definitions', async () => {
    const collector = createMockCollector();
    const stores = await initStores(collector, {});
    expect(stores).toEqual({});
  });

  it('should pass config and env to store init', async () => {
    const collector = createMockCollector();
    let receivedContext: Store.Context | undefined;

    const mockInit: Store.Init = (context) => {
      receivedContext = context;
      return {
        type: 'test',
        config: context.config as Store.Config,
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      };
    };

    await initStores(collector, {
      myStore: {
        code: mockInit,
        config: { settings: { basePath: './data' } },
        env: { custom: 'value' },
      },
    });

    expect(receivedContext).toBeDefined();
    expect(receivedContext!.id).toBe('myStore');
    expect(receivedContext!.config.settings).toEqual({ basePath: './data' });
    expect(receivedContext!.env).toEqual({ custom: 'value' });
  });

  it('should handle async store init', async () => {
    const collector = createMockCollector();

    const asyncInit: Store.Init = async (context) => ({
      type: 'async',
      config: context.config as Store.Config,
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    });

    const stores = await initStores(collector, {
      async: { code: asyncInit },
    });

    expect(stores.async.type).toBe('async');
  });
});

describe('resolveStoreReferences', () => {
  // A minimal Transformer.Init that satisfies the type signature. The body is
  // never invoked by resolveStoreReferences (which only walks .env), so the
  // returned shape is structural-only.
  const noopTransformerInit: Transformer.Init = () => ({
    type: 'noop',
    config: {},
    push: () => ({ event: {} }),
  });

  it('should replace env value matching a raw store def with initialized instance', () => {
    const storeDef: Store.InitStore = { code: jest.fn(), config: {} };
    const storeInstance: Store.Instance = {
      type: 'mock',
      config: {},
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    const transformerDef: Transformer.InitTransformer = {
      code: noopTransformerInit,
      env: { store: storeDef },
    };

    resolveStoreReferences(
      { cache: storeDef },
      { cache: storeInstance },
      { transformers: { myTransformer: transformerDef } },
    );

    expect(transformerDef.env!.store).toBe(storeInstance);
  });

  it('should not replace env values that do not match any store def', () => {
    const storeDef: Store.InitStore = { code: jest.fn(), config: {} };
    const storeInstance: Store.Instance = {
      type: 'mock',
      config: {},
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    const unrelatedValue = { something: 'else' };
    const transformerDef: Transformer.InitTransformer = {
      code: noopTransformerInit,
      env: { other: unrelatedValue },
    };

    resolveStoreReferences(
      { cache: storeDef },
      { cache: storeInstance },
      { transformers: { t: transformerDef } },
    );

    expect(transformerDef.env!.other).toBe(unrelatedValue);
  });

  it('should resolve store references in destinations and sources too', () => {
    const storeDef: Store.InitStore = { code: jest.fn(), config: {} };
    const storeInstance: Store.Instance = {
      type: 'mock',
      config: {},
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    const destDef: Destination.Init = {
      code: { type: 'noop', config: {}, push: jest.fn() },
      env: { store: storeDef },
    };
    const srcDef: Source.InitSource = {
      code: jest.fn(),
      env: { store: storeDef },
    };

    resolveStoreReferences(
      { cache: storeDef },
      { cache: storeInstance },
      { destinations: { d: destDef }, sources: { s: srcDef } },
    );

    expect(destDef.env!.store).toBe(storeInstance);
    expect(srcDef.env!.store).toBe(storeInstance);
  });

  it('should handle multiple stores resolving to different instances', () => {
    const defA: Store.InitStore = { code: jest.fn(), config: {} };
    const defB: Store.InitStore = { code: jest.fn(), config: {} };
    const instanceA: Store.Instance = {
      type: 'a',
      config: {},
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    const instanceB: Store.Instance = {
      type: 'b',
      config: {},
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    const transformerDef: Transformer.InitTransformer = {
      code: noopTransformerInit,
      env: { primary: defA, secondary: defB },
    };

    resolveStoreReferences(
      { a: defA, b: defB },
      { a: instanceA, b: instanceB },
      { transformers: { t: transformerDef } },
    );

    expect(transformerDef.env!.primary).toBe(instanceA);
    expect(transformerDef.env!.secondary).toBe(instanceB);
  });

  it('should skip if store failed to initialize (not in initializedStores)', () => {
    const storeDef: Store.InitStore = { code: jest.fn(), config: {} };
    const transformerDef: Transformer.InitTransformer = {
      code: noopTransformerInit,
      env: { store: storeDef },
    };

    resolveStoreReferences(
      { broken: storeDef },
      {}, // empty — store init failed
      { transformers: { t: transformerDef } },
    );

    expect(transformerDef.env!.store).toBe(storeDef); // unchanged
  });

  it('should be a no-op when rawStores is empty', () => {
    const env = { keep: 'this' };
    const transformerDef: Transformer.InitTransformer = {
      code: noopTransformerInit,
      env,
    };

    resolveStoreReferences({}, {}, { transformers: { t: transformerDef } });

    expect(env.keep).toBe('this');
  });

  it('should handle components with no env', () => {
    const storeDef: Store.InitStore = { code: jest.fn(), config: {} };
    const storeInstance: Store.Instance = {
      type: 'mock',
      config: {},
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    const transformerDef: Transformer.InitTransformer = {
      code: noopTransformerInit,
    }; // no env

    // Should not throw
    resolveStoreReferences(
      { cache: storeDef },
      { cache: storeInstance },
      { transformers: { t: transformerDef } },
    );
  });
});

describe('store hooks', () => {
  it('should call preStoreGet hook before store.get', async () => {
    const collector = createMockCollector();
    const preStoreGet = jest.fn(({ fn }, key) => fn(key));
    collector.hooks = { preStoreGet };

    const mockInit: Store.Init = (context) => ({
      type: 'test',
      config: context.config as Store.Config,
      get: jest.fn().mockReturnValue('value'),
      set: jest.fn(),
      delete: jest.fn(),
    });

    const stores = await initStores(collector, {
      cache: { code: mockInit },
    });

    const result = stores.cache.get('key');
    expect(preStoreGet).toHaveBeenCalledTimes(1);
    expect(result).toBe('value');
  });

  it('should call postStoreGet hook after store.get', async () => {
    const collector = createMockCollector();
    const postStoreGet = jest.fn(({ fn, result }, key) => result);
    collector.hooks = { postStoreGet };

    const mockInit: Store.Init = (context) => ({
      type: 'test',
      config: context.config as Store.Config,
      get: jest.fn().mockReturnValue('value'),
      set: jest.fn(),
      delete: jest.fn(),
    });

    const stores = await initStores(collector, {
      cache: { code: mockInit },
    });

    const result = stores.cache.get('key');
    expect(postStoreGet).toHaveBeenCalledTimes(1);
    expect(result).toBe('value');
  });

  it('should call preStoreSet hook before store.set', async () => {
    const collector = createMockCollector();
    const preStoreSet = jest.fn(({ fn }, key, value, ttl) =>
      fn(key, value, ttl),
    );
    collector.hooks = { preStoreSet };

    const setFn = jest.fn();
    const mockInit: Store.Init = (context) => ({
      type: 'test',
      config: context.config as Store.Config,
      get: jest.fn(),
      set: setFn,
      delete: jest.fn(),
    });

    const stores = await initStores(collector, {
      cache: { code: mockInit },
    });

    stores.cache.set('key', 'val', 1000);
    expect(preStoreSet).toHaveBeenCalledTimes(1);
    expect(setFn).toHaveBeenCalledWith('key', 'val', 1000);
  });

  it('should call preStoreDelete hook before store.delete', async () => {
    const collector = createMockCollector();
    const preStoreDelete = jest.fn(({ fn }, key) => fn(key));
    collector.hooks = { preStoreDelete };

    const deleteFn = jest.fn();
    const mockInit: Store.Init = (context) => ({
      type: 'test',
      config: context.config as Store.Config,
      get: jest.fn(),
      set: jest.fn(),
      delete: deleteFn,
    });

    const stores = await initStores(collector, {
      cache: { code: mockInit },
    });

    stores.cache.delete('key');
    expect(preStoreDelete).toHaveBeenCalledTimes(1);
    expect(deleteFn).toHaveBeenCalledWith('key');
  });

  it('should work without hooks defined (passthrough)', async () => {
    const collector = createMockCollector();
    collector.hooks = {};

    const getFn = jest.fn().mockReturnValue('val');
    const mockInit: Store.Init = (context) => ({
      type: 'test',
      config: context.config as Store.Config,
      get: getFn,
      set: jest.fn(),
      delete: jest.fn(),
    });

    const stores = await initStores(collector, {
      cache: { code: mockInit },
    });

    expect(stores.cache.get('k')).toBe('val');
    expect(getFn).toHaveBeenCalledWith('k');
  });

  it('should allow preStoreGet to modify the return value', async () => {
    const collector = createMockCollector();
    const preStoreGet = jest.fn(({ fn }, key) => 'intercepted');
    collector.hooks = { preStoreGet };

    const mockInit: Store.Init = (context) => ({
      type: 'test',
      config: context.config as Store.Config,
      get: jest.fn().mockReturnValue('original'),
      set: jest.fn(),
      delete: jest.fn(),
    });

    const stores = await initStores(collector, {
      cache: { code: mockInit },
    });

    expect(stores.cache.get('key')).toBe('intercepted');
  });
});
