import type { Store } from '../../types';

describe('Store types', () => {
  describe('Types bundle', () => {
    it('defaults are assignable', () => {
      const types: Store.Types = {
        settings: undefined,
        initSettings: undefined,
        env: {},
      };
      expect(types).toBeDefined();
    });

    it('accepts custom generics', () => {
      interface MySettings {
        host: string;
        port: number;
      }
      interface MyEnv extends Store.BaseEnv {
        redis: unknown;
      }
      interface MyInit {
        host?: string;
        port?: number;
      }

      const types: Store.Types<MySettings, MyEnv, MyInit> = {
        settings: { host: 'localhost', port: 6379 },
        initSettings: { host: 'localhost' },
        env: { redis: {} },
      };
      expect(types.settings.host).toBe('localhost');
    });
  });

  describe('Type extractors', () => {
    it('extracts Settings from Types', () => {
      type T = Store.Types<{ host: string }>;
      type S = Store.Settings<T>;
      const s: S = { host: 'localhost' };
      expect(s.host).toBe('localhost');
    });

    it('extracts Env from Types', () => {
      type T = Store.Types<unknown, { custom: boolean }>;
      type E = Store.Env<T>;
      const e: E = { custom: true };
      expect(e.custom).toBe(true);
    });
  });

  describe('Instance', () => {
    it('has get, set, delete (no push)', () => {
      const instance: Store.Instance = {
        type: 'memory',
        config: {},
        get: (key: string) => undefined,
        set: (key: string, value: unknown, ttl?: number) => {},
        delete: (key: string) => {},
      };
      expect(instance.type).toBe('memory');
      expect('push' in instance).toBe(false);
    });

    it('allows async get/set/delete', () => {
      const instance: Store.Instance = {
        type: 'redis',
        config: {},
        get: async (key: string) => undefined,
        set: async (key: string, value: unknown) => {},
        delete: async (key: string) => {},
      };
      expect(instance.type).toBe('redis');
    });

    it('allows optional destroy', () => {
      const instance: Store.Instance = {
        type: 'redis',
        config: {},
        get: (key: string) => undefined,
        set: (key: string, value: unknown) => {},
        delete: (key: string) => {},
        destroy: async ({ config }) => {},
      };
      expect(instance.destroy).toBeDefined();
    });
  });

  describe('GetFn / SetFn / DeleteFn', () => {
    it('GetFn supports sync and async return', () => {
      const syncGet: Store.GetFn<string> = (key) => 'value';
      const asyncGet: Store.GetFn<string> = async (key) => 'value';
      expect(typeof syncGet).toBe('function');
      expect(typeof asyncGet).toBe('function');
    });

    it('SetFn accepts ttl parameter', () => {
      const set: Store.SetFn<string> = (key, value, ttl) => {};
      expect(typeof set).toBe('function');
    });
  });

  describe('InitStores / Stores', () => {
    it('InitStores maps IDs to InitStore', () => {
      const stores: Store.InitStores = {
        cache: {
          code: async (context) => ({
            type: 'memory',
            config: {},
            get: (key) => undefined,
            set: (key, value) => {},
            delete: (key) => {},
          }),
        },
      };
      expect(stores['cache']).toBeDefined();
    });

    it('Stores maps IDs to Instance', () => {
      const stores: Store.Stores = {
        cache: {
          type: 'memory',
          config: {},
          get: (key) => undefined,
          set: (key, value) => {},
          delete: (key) => {},
        },
      };
      expect(stores['cache'].type).toBe('memory');
    });
  });
});
