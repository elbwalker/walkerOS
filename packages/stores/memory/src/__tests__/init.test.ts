import type { Collector } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { storeMemoryInit } from '../init';

describe('storeMemoryInit', () => {
  it('should follow Store.Init pattern', async () => {
    const context = {
      collector: {} as Collector.Instance,
      logger: createMockLogger(),
      id: 'cache',
      config: { settings: { maxSize: 1024, maxEntries: 10 } },
      env: {},
    };

    const store = await storeMemoryInit(context);
    expect(store.type).toBe('memory');
    expect(store.config).toBe(context.config);
    expect(store.get).toBeDefined();
    expect(store.set).toBeDefined();
    expect(store.delete).toBeDefined();
    expect(store.destroy).toBeDefined();
  });

  it('should use settings from context.config.settings', async () => {
    const context = {
      collector: {} as Collector.Instance,
      logger: createMockLogger(),
      id: 'test',
      config: { settings: { maxSize: 512 } },
      env: {},
    };

    const store = await storeMemoryInit(context);
    store.set('key', 'value');
    expect(await store.get('key')).toBe('value');
  });

  it('should work with default settings', async () => {
    const context = {
      collector: {} as Collector.Instance,
      logger: createMockLogger(),
      id: 'default',
      config: {},
      env: {},
    };

    const store = await storeMemoryInit(context);
    store.set('key', 'value');
    expect(await store.get('key')).toBe('value');
  });
});
