import type { Collector, Transformer, WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { transformerCode, TransformerCodeSettings } from '../transformer-code';
import { initTransformers } from '../transformer';

describe('transformerCode', () => {
  const createMockCollector = (): Collector.Instance =>
    ({
      consent: {},
      destinations: {},
      sources: {},
      transformers: {},
      transformerChain: { pre: [], post: {} },
      queue: [],
      hooks: {},
      on: {},
      globals: {},
      user: {},
      allowed: true,
      config: {},
      count: 0,
      logger: createMockLogger(),
      push: jest.fn(),
      command: jest.fn(),
    }) as unknown as Collector.Instance;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic properties', () => {
    it('should return transformer instance with correct type', async () => {
      const mockLogger = createMockLogger();
      const context: Transformer.Context = {
        collector: createMockCollector(),
        logger: mockLogger,
        id: 'test',
        config: {},
        env: {},
      };

      const instance = await transformerCode(context);

      expect(instance.type).toBe('code');
      expect(instance.push).toBeDefined();
    });
  });

  describe('init', () => {
    it('executes init code string', async () => {
      const mockLogger = createMockLogger();
      const context: Transformer.Context = {
        collector: createMockCollector(),
        logger: mockLogger,
        id: 'test',
        config: {
          settings: {
            init: "context.logger.info('transformer initialized')",
          } as TransformerCodeSettings,
        },
        env: {},
      };

      await transformerCode(context);

      expect(mockLogger.info).toHaveBeenCalledWith('transformer initialized');
    });

    it('handles missing init code gracefully', async () => {
      const context: Transformer.Context = {
        collector: createMockCollector(),
        logger: createMockLogger(),
        id: 'test',
        config: { settings: {} },
        env: {},
      };

      expect(async () => await transformerCode(context)).not.toThrow();
    });

    it('catches and logs errors in init code', async () => {
      const mockLogger = createMockLogger();
      const context: Transformer.Context = {
        collector: createMockCollector(),
        logger: mockLogger,
        id: 'test',
        config: {
          settings: {
            init: "throw new Error('init error')",
          } as TransformerCodeSettings,
        },
        env: {},
      };

      await transformerCode(context);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('push', () => {
    it('executes push code and returns modified event', async () => {
      const mockLogger = createMockLogger();
      const context: Transformer.Context = {
        collector: createMockCollector(),
        logger: mockLogger,
        id: 'test',
        config: {
          settings: {
            push: 'event.data = { ...event.data, enriched: true }; return event;',
          } as TransformerCodeSettings,
        },
        env: {},
      };

      const instance = await transformerCode(context);
      const event: WalkerOS.DeepPartialEvent = {
        name: 'page view',
        data: { original: true },
      };

      const result = instance.push(event, context);

      expect(result).toEqual({
        name: 'page view',
        data: { original: true, enriched: true },
      });
    });

    it('returns original event when no push code', async () => {
      const context: Transformer.Context = {
        collector: createMockCollector(),
        logger: createMockLogger(),
        id: 'test',
        config: { settings: {} },
        env: {},
      };

      const instance = await transformerCode(context);
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = instance.push(event, context);

      expect(result).toEqual(event);
    });

    it('returns false to drop event from chain', async () => {
      const context: Transformer.Context = {
        collector: createMockCollector(),
        logger: createMockLogger(),
        id: 'test',
        config: {
          settings: {
            push: 'return false;',
          } as TransformerCodeSettings,
        },
        env: {},
      };

      const instance = await transformerCode(context);
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = instance.push(event, context);

      expect(result).toBe(false);
    });

    it('can filter events based on conditions', async () => {
      const context: Transformer.Context = {
        collector: createMockCollector(),
        logger: createMockLogger(),
        id: 'test',
        config: {
          settings: {
            push: "if (event.name === 'internal') return false; return event;",
          } as TransformerCodeSettings,
        },
        env: {},
      };

      const instance = await transformerCode(context);

      // Internal event should be dropped
      const internalEvent: WalkerOS.DeepPartialEvent = { name: 'internal' };
      expect(instance.push(internalEvent, context)).toBe(false);

      // Other events should pass through
      const normalEvent: WalkerOS.DeepPartialEvent = { name: 'page view' };
      expect(instance.push(normalEvent, context)).toEqual(normalEvent);
    });

    it('catches and logs errors in push code', async () => {
      const mockLogger = createMockLogger();
      const context: Transformer.Context = {
        collector: createMockCollector(),
        logger: mockLogger,
        id: 'test',
        config: {
          settings: {
            push: "throw new Error('push error')",
          } as TransformerCodeSettings,
        },
        env: {},
      };

      const instance = await transformerCode(context);
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = instance.push(event, context);

      // Should return original event on error
      expect(result).toEqual(event);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('has access to context in push code', async () => {
      const mockLogger = createMockLogger();
      const context: Transformer.Context = {
        collector: createMockCollector(),
        logger: mockLogger,
        id: 'test-transformer',
        config: {
          settings: {
            push: "context.logger.info('Transformer:', context.id); return event;",
          } as TransformerCodeSettings,
        },
        env: {},
      };

      const instance = await transformerCode(context);
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      instance.push(event, context);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Transformer:',
        'test-transformer',
      );
    });
  });
});

describe('code: true initialization', () => {
  const createMockCollector = (): Collector.Instance =>
    ({
      consent: {},
      destinations: {},
      sources: {},
      transformers: {},
      transformerChain: { pre: [], post: {} },
      queue: [],
      hooks: {},
      on: {},
      globals: {},
      user: {},
      allowed: true,
      config: {},
      count: 0,
      logger: createMockLogger(),
      push: jest.fn(),
      command: jest.fn(),
    }) as unknown as Collector.Instance;

  it('uses built-in transformerCode when code is true', async () => {
    const collector = createMockCollector();

    const transformers = await initTransformers(collector, {
      myCodeTransformer: {
        code: true as unknown as Transformer.Init,
        config: {
          settings: {
            push: 'event.data.processed = true; return event;',
          },
        },
      },
    });

    expect(transformers.myCodeTransformer).toBeDefined();
    expect(transformers.myCodeTransformer.type).toBe('code');
    expect(transformers.myCodeTransformer.push).toBeDefined();
  });

  it('preserves provided config with code: true', async () => {
    const collector = createMockCollector();

    const transformers = await initTransformers(collector, {
      myCodeTransformer: {
        code: true as unknown as Transformer.Init,
        config: {
          settings: {
            init: "context.logger.info('custom init')",
            push: 'return event;',
          },
          next: 'anotherTransformer',
        },
      },
    });

    expect(transformers.myCodeTransformer.config.settings).toEqual({
      init: "context.logger.info('custom init')",
      push: 'return event;',
    });
  });

  it('executes inline code in initialized transformer', async () => {
    const collector = createMockCollector();

    const transformers = await initTransformers(collector, {
      enricher: {
        code: true as unknown as Transformer.Init,
        config: {
          settings: {
            push: 'event.data = { ...event.data, enrichedAt: Date.now() }; return event;',
          },
        },
      },
    });

    const event: WalkerOS.DeepPartialEvent = {
      name: 'page view',
      data: { original: true },
    };

    const context: Transformer.Context = {
      collector,
      logger: collector.logger,
      id: 'enricher',
      config: transformers.enricher.config,
      env: {},
    };

    const result = transformers.enricher.push(event, context);

    expect(result).toHaveProperty('data.original', true);
    expect(result).toHaveProperty('data.enrichedAt');
  });
});
