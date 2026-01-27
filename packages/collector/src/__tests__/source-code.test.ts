import type { Collector, Source } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceCode, SourceCodeSettings } from '../source-code';
import { initSources } from '../source';
import { startFlow } from '../flow';

describe('sourceCode', () => {
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
    it('should return source instance with correct type', async () => {
      const mockLogger = createMockLogger();
      const mockPush = jest.fn();
      const context: Source.Context = {
        collector: createMockCollector(),
        logger: mockLogger,
        id: 'test',
        config: {},
        env: {
          push: mockPush,
          logger: mockLogger,
        } as unknown as Source.Env,
        setIngest: jest.fn(),
      };

      const instance = await sourceCode(context);

      expect(instance.type).toBe('code');
      expect(instance.push).toBeDefined();
    });
  });

  describe('init', () => {
    it('executes init code string', async () => {
      const mockLogger = createMockLogger();
      const mockPush = jest.fn();
      const context: Source.Context = {
        collector: createMockCollector(),
        logger: mockLogger,
        id: 'test',
        config: {
          settings: {
            init: "context.logger.info('source initialized')",
          } as SourceCodeSettings,
        },
        env: {
          push: mockPush,
          logger: mockLogger,
        } as unknown as Source.Env,
        setIngest: jest.fn(),
      };

      await sourceCode(context);

      expect(mockLogger.info).toHaveBeenCalledWith('source initialized');
    });

    it('handles missing init code gracefully', async () => {
      const mockLogger = createMockLogger();
      const mockPush = jest.fn();
      const context: Source.Context = {
        collector: createMockCollector(),
        logger: mockLogger,
        id: 'test',
        config: { settings: {} },
        env: {
          push: mockPush,
          logger: mockLogger,
        } as unknown as Source.Env,
        setIngest: jest.fn(),
      };

      await expect(sourceCode(context)).resolves.not.toThrow();
    });

    it('catches and logs errors in init code', async () => {
      const mockLogger = createMockLogger();
      const mockPush = jest.fn();
      const context: Source.Context = {
        collector: createMockCollector(),
        logger: mockLogger,
        id: 'test',
        config: {
          settings: {
            init: "throw new Error('init error')",
          } as SourceCodeSettings,
        },
        env: {
          push: mockPush,
          logger: mockLogger,
        } as unknown as Source.Env,
        setIngest: jest.fn(),
      };

      await sourceCode(context);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('push', () => {
    it('executes push code with input and env', async () => {
      const mockLogger = createMockLogger();
      const mockPush = jest.fn();
      const context: Source.Context = {
        collector: createMockCollector(),
        logger: mockLogger,
        id: 'test',
        config: {
          settings: {
            push: "env.logger.info('Input received:', input)",
          } as SourceCodeSettings,
        },
        env: {
          push: mockPush,
          logger: mockLogger,
        } as unknown as Source.Env,
        setIngest: jest.fn(),
      };

      const instance = await sourceCode(context);
      await instance.push!({ data: 'test' });

      expect(mockLogger.info).toHaveBeenCalledWith('Input received:', {
        data: 'test',
      });
    });

    it('handles missing push code gracefully', async () => {
      const mockLogger = createMockLogger();
      const mockPush = jest.fn();
      const context: Source.Context = {
        collector: createMockCollector(),
        logger: mockLogger,
        id: 'test',
        config: { settings: {} },
        env: {
          push: mockPush,
          logger: mockLogger,
        } as unknown as Source.Env,
        setIngest: jest.fn(),
      };

      const instance = await sourceCode(context);

      const result = await instance.push!({ data: 'test' });
      expect(result).toEqual({ ok: true });
    });

    it('catches and logs errors in push code', async () => {
      const mockLogger = createMockLogger();
      const mockPush = jest.fn();
      const context: Source.Context = {
        collector: createMockCollector(),
        logger: mockLogger,
        id: 'test',
        config: {
          settings: {
            push: "throw new Error('push error')",
          } as SourceCodeSettings,
        },
        env: {
          push: mockPush,
          logger: mockLogger,
        } as unknown as Source.Env,
        setIngest: jest.fn(),
      };

      const instance = await sourceCode(context);
      const result = await instance.push!({ data: 'test' });

      expect(result).toEqual({ ok: false });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('can forward events to collector via env.push', async () => {
      const mockLogger = createMockLogger();
      const mockPush = jest.fn();
      const context: Source.Context = {
        collector: createMockCollector(),
        logger: mockLogger,
        id: 'test',
        config: {
          settings: {
            push: "env.push({ name: 'custom event', data: input })",
          } as SourceCodeSettings,
        },
        env: {
          push: mockPush,
          logger: mockLogger,
        } as unknown as Source.Env,
        setIngest: jest.fn(),
      };

      const instance = await sourceCode(context);
      await instance.push!({ value: 42 });

      expect(mockPush).toHaveBeenCalledWith({
        name: 'custom event',
        data: { value: 42 },
      });
    });
  });
});

describe('code: true initialization', () => {
  let collector: Collector.Instance;

  beforeEach(async () => {
    const result = await startFlow();
    collector = result.collector;
  });

  it('uses built-in sourceCode when code is true', async () => {
    const sources = await initSources(collector, {
      myCodeSource: {
        code: true as unknown as Source.Init,
        config: {
          settings: {
            init: "context.logger.info('ready')",
          },
        },
      },
    });

    expect(sources.myCodeSource).toBeDefined();
    expect(sources.myCodeSource.type).toBe('code');
    expect(sources.myCodeSource.push).toBeDefined();
  });

  it('preserves provided config with code: true', async () => {
    const sources = await initSources(collector, {
      myCodeSource: {
        code: true as unknown as Source.Init,
        config: {
          settings: {
            init: "context.logger.info('custom init')",
            push: "env.push({ name: 'event', data: input })",
          },
        },
      },
    });

    expect(sources.myCodeSource.config.settings).toEqual({
      init: "context.logger.info('custom init')",
      push: "env.push({ name: 'event', data: input })",
    });
  });

  it('executes inline code in initialized source', async () => {
    const mockPush = jest.fn();

    // Create a source that will use our mock push
    const sources = await initSources(collector, {
      manualSource: {
        code: true as unknown as Source.Init,
        config: {
          settings: {
            push: "env.push({ name: 'manual event', data: { received: input } })",
          },
        },
        env: {
          push: mockPush,
        },
      },
    });

    // The source's push method should execute the inline code
    await sources.manualSource.push!('test-input');

    expect(mockPush).toHaveBeenCalledWith({
      name: 'manual event',
      data: { received: 'test-input' },
    });
  });
});
