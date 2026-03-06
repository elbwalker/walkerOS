import { startFlow } from '..';
import type { Store } from '@walkeros/core';

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
});
