import type { Collector, Store } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { initStores } from '../store';

function createMockCollector(): Collector.Instance {
  return {
    logger: createMockLogger(),
    stores: {},
    // Minimal shape — other fields not needed by initStores
  } as unknown as Collector.Instance;
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
