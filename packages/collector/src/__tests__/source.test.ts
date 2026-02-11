import type { Collector, Source, On, WalkerOS, Elb } from '@walkeros/core';
import { startFlow } from '../flow';
import { initSources } from '../source';

// Mock source implementation using new pattern
const mockSource: Source.Init = async (context) => {
  const { config, env } = context;
  const { push } = env;

  if (!push) {
    throw new Error('Mock source requires push function');
  }

  // Simulate some source activity
  setTimeout(() => {
    push({ name: 'mock event', data: { source: 'mock' } });
  }, 10);

  return {
    type: 'mock',
    config: {
      ...config,
      settings: config.settings || { test: true },
    } as Source.Config,
    push: push as Elb.Fn, // Required push method - forwards to collector
    destroy: async () => {
      // Cleanup
    },
  };
};

// Mock source that throws an error
const errorSource: Source.Init = async () => {
  throw new Error('Source initialization failed');
};

describe('Source', () => {
  let collector: Collector.Instance;

  beforeEach(async () => {
    const result = await startFlow();
    collector = result.collector;
  });

  describe('initSources', () => {
    it('should initialize sources with code/config/env pattern', async () => {
      const sources = {
        testSource: {
          code: mockSource,
          config: {
            type: 'mock',
            settings: { name: 'test' },
          } as Source.Config,
          env: {
            custom: 'value',
          },
        },
      };

      collector.sources = await initSources(collector, sources);

      expect(collector.sources).toHaveProperty('testSource');
      expect(collector.sources.testSource.type).toBe('mock');
      expect(collector.sources.testSource.config.settings).toEqual({
        name: 'test',
      });
    });

    it('should handle source initialization errors gracefully', async () => {
      const sources = {
        errorSource: {
          code: errorSource,
          config: {
            type: 'error',
            settings: {},
          } as Source.Config,
          env: {},
        },
      };

      // Should not throw an error
      collector.sources = await initSources(collector, sources);
      expect(collector.sources).not.toHaveProperty('errorSource');
    });

    it('should inject elb function into source environment', async () => {
      const captureEnv: Source.Init = async (context) => {
        const { config, env } = context;
        expect(env!.push).toBeDefined();
        expect(typeof env!.push).toBe('function');
        expect(env!.command).toBeDefined();
        expect(typeof env!.command).toBe('function');
        // The elb function should be a wrapper that calls collector.push
        // Don't test strict equality since it's wrapped

        return {
          type: 'capture',
          config: {
            ...config,
            settings: config.settings || {},
          } as Source.Config,
          push: env!.push as Elb.Fn, // Required push method
        };
      };

      const sources = {
        captureSource: {
          code: captureEnv,
          config: {
            type: 'capture',
            settings: {},
          } as Source.Config,
          env: {},
        },
      };

      collector.sources = await initSources(collector, sources);
      expect(collector.sources).toHaveProperty('captureSource');
    });

    it('should merge environment with custom properties', async () => {
      const captureEnv: Source.Init = async (context) => {
        const { config, env } = context;
        expect(env!.push).toBeDefined();
        expect(env!.command).toBeDefined();
        expect(env!.customProp).toBe('customValue');
        expect(env!.window).toBeDefined();

        return {
          type: 'env-test',
          config: {
            ...config,
            settings: config.settings || {},
          } as Source.Config,
          push: env!.push as Elb.Fn, // Required push method
        };
      };

      const sources = {
        envTestSource: {
          code: captureEnv,
          config: {
            type: 'env-test',
            settings: {},
          } as Source.Config,
          env: {
            customProp: 'customValue',
            window: { location: { href: 'https://test.com' } },
          },
        },
      };

      collector.sources = await initSources(collector, sources);
      expect(collector.sources).toHaveProperty('envTestSource');
    });

    it('should initialize multiple sources', async () => {
      const sources = {
        source1: {
          code: mockSource,
          config: {
            type: 'mock1',
            settings: { name: 'source1' },
          } as Source.Config,
          env: {},
        },
        source2: {
          code: mockSource,
          config: {
            type: 'mock2',
            settings: { name: 'source2' },
          } as Source.Config,
          env: {},
        },
      };

      collector.sources = await initSources(collector, sources);

      expect(collector.sources).toHaveProperty('source1');
      expect(collector.sources).toHaveProperty('source2');
      expect(collector.sources.source1.config.settings).toEqual({
        name: 'source1',
      });
      expect(collector.sources.source2.config.settings).toEqual({
        name: 'source2',
      });
    });
  });

  describe('startFlow with sources', () => {
    it('should initialize sources during collector creation', async () => {
      const { collector: testCollector } = await startFlow({
        sources: {
          testSource: {
            code: mockSource,
            config: {
              type: 'mock',
              settings: { test: true },
            } as Source.Config,
            env: {
              mockWindow: { location: 'test' },
            },
          },
        },
      });

      expect(testCollector.sources).toHaveProperty('testSource');
      expect(testCollector.sources.testSource.type).toBe('mock');
    });

    it('should work with empty sources configuration', async () => {
      const { collector: testCollector } = await startFlow({
        sources: {},
      });

      expect(testCollector.sources).toBeDefined();
      // ELB source is always present
      expect(Object.keys(testCollector.sources)).toHaveLength(1);
      expect(testCollector.sources.elb).toBeDefined();
    });
  });

  describe('source before deferral', () => {
    test('source with before is deferred, not initialized', async () => {
      const mockInit = jest.fn().mockResolvedValue({
        type: 'deferred',
        config: {},
        push: jest.fn(),
      });

      const { collector } = await startFlow({
        sources: {
          deferred: {
            code: mockInit,
            config: { before: ['consent'] },
          },
        },
      });

      expect(mockInit).not.toHaveBeenCalled();
      expect(collector.sources['deferred']).toBeUndefined();
      expect(collector.pendingSources).toHaveLength(1);
      expect(collector.pendingSources[0].id).toBe('deferred');
      expect(collector.pendingSources[0].conditions).toEqual([
        { type: 'consent', test: undefined },
      ]);
    });

    test('source with conditional before is deferred with test function', async () => {
      const mockInit = jest.fn().mockResolvedValue({
        type: 'conditional',
        config: {},
        push: jest.fn(),
      });

      const { collector } = await startFlow({
        sources: {
          conditional: {
            code: mockInit,
            config: {
              before: [{ consent: (data: any) => !!data.marketing }],
            },
          },
        },
      });

      expect(mockInit).not.toHaveBeenCalled();
      expect(collector.pendingSources).toHaveLength(1);
      expect(collector.pendingSources[0].conditions[0].type).toBe('consent');
      expect(collector.pendingSources[0].conditions[0].test).toBeDefined();
      expect(
        collector.pendingSources[0].conditions[0].test!({ marketing: true }),
      ).toBe(true);
    });

    test('source without before inits immediately (backward compat)', async () => {
      const mockInit = jest.fn().mockResolvedValue({
        type: 'immediate',
        config: {},
        push: jest.fn(),
      });

      const { collector } = await startFlow({
        sources: {
          immediate: { code: mockInit },
        },
      });

      expect(mockInit).toHaveBeenCalledTimes(1);
      expect(collector.sources['immediate']).toBeDefined();
      expect(collector.pendingSources).toHaveLength(0);
    });
  });

  describe('source push mechanism', () => {
    it('should push events to sources with on method', async () => {
      const onMock = jest.fn();

      // Mock source with on method
      const sourceWithOn: Source.Init = async (context) => {
        const { config, env } = context;
        return {
          type: 'reactive',
          config: {
            ...config,
            settings: config.settings || {},
          } as Source.Config,
          push: env!.push as Elb.Fn, // Required push method
          on: onMock,
        };
      };

      const sources = {
        reactiveSource: {
          code: sourceWithOn,
          config: {
            type: 'reactive',
            settings: { test: true },
          } as Source.Config,
          env: {},
        },
      };

      collector.sources = await initSources(collector, sources);

      // Trigger consent event
      await collector.command('consent', { marketing: true });

      // Verify the source's on method was called
      expect(onMock).toHaveBeenCalledWith('consent', { marketing: true });
    });

    it('should push session events to sources', async () => {
      const onMock = jest.fn();

      const sourceWithOn: Source.Init = async (context) => {
        const { config, env } = context;
        return {
          type: 'reactive',
          config: {
            ...config,
            settings: config.settings || {},
          } as Source.Config,
          push: env!.push as Elb.Fn, // Required push method
          on: onMock,
        };
      };

      collector.sources = await initSources(collector, {
        reactiveSource: {
          code: sourceWithOn,
          config: { type: 'reactive', settings: {} } as Source.Config,
          env: {},
        },
      });

      // Set session data and trigger session event
      collector.session = {
        id: 'test-session',
        isStart: true,
        storage: false,
        device: 'test',
      };
      await collector.command('session');

      // Verify the source's on method was called with session context
      expect(onMock).toHaveBeenCalledWith('session', collector.session);
    });

    it('should not fail if source does not have on method', async () => {
      const sourceWithoutOn: Source.Init = async (context) => {
        const { config, env } = context;
        return {
          type: 'passive',
          config: {
            ...config,
            settings: config.settings || {},
          } as Source.Config,
          push: env!.push as Elb.Fn, // Required push method
          // No on method
        };
      };

      collector.sources = await initSources(collector, {
        passiveSource: {
          code: sourceWithoutOn,
          config: { type: 'passive', settings: {} } as Source.Config,
          env: {},
        },
      });

      // Should not throw error even without on method
      expect(async () => {
        await collector.command('consent', { marketing: true });
      }).not.toThrow();
    });

    it('should push different event types correctly', async () => {
      const onMock = jest.fn();

      const sourceWithOn: Source.Init = async (context) => {
        const { config, env } = context;
        return {
          type: 'reactive',
          config: {
            ...config,
            settings: config.settings || {},
          } as Source.Config,
          push: env!.push as Elb.Fn, // Required push method
          on: onMock,
        };
      };

      collector.sources = await initSources(collector, {
        reactiveSource: {
          code: sourceWithOn,
          config: { type: 'reactive', settings: {} } as Source.Config,
          env: {},
        },
      });

      // Test different event types
      await collector.command('ready');
      await collector.command('run');

      expect(onMock).toHaveBeenCalledWith('ready', undefined);
      expect(onMock).toHaveBeenCalledWith('run', undefined);
      expect(onMock).toHaveBeenCalledTimes(2);
    });
  });
});
