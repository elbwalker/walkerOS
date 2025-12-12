import type { Collector, Destination } from '@walkeros/core';
import { createEvent, createMockLogger } from '@walkeros/core';
import { destinationCode } from '../destination-code';
import { initDestinations } from '../destination';
import type {
  Settings,
  CodeMapping,
  InitContext,
  PushContext,
  PushBatchContext,
  Context,
} from '../types/code';

describe('destinationCode', () => {
  const createMockCollector = (): Collector.Instance =>
    ({
      consent: {},
      destinations: {},
      sources: {},
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
    }) as unknown as Collector.Instance;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic properties', () => {
    it('should have correct type', () => {
      expect(destinationCode.type).toBe('code');
    });

    it('should have empty default config', () => {
      expect(destinationCode.config).toEqual({});
    });
  });

  describe('init', () => {
    it('accepts scripts array in settings', () => {
      const settings: Settings = {
        scripts: [
          'https://example.com/analytics.js',
          'https://example.com/pixel.js',
        ],
        init: "console.log('ready')",
      };
      expect(settings.scripts).toHaveLength(2);
    });

    it('injects script tags for each URL in scripts array', () => {
      const initialScriptCount =
        document.head.querySelectorAll('script').length;

      const context: InitContext = {
        collector: createMockCollector(),
        config: {
          settings: {
            scripts: ['https://example.com/a.js', 'https://example.com/b.js'],
          },
        },
        env: {},
        logger: createMockLogger(),
      };

      destinationCode.init!(context);

      const scripts = document.head.querySelectorAll('script');
      expect(scripts.length).toBe(initialScriptCount + 2);

      const addedScripts = Array.from(scripts).slice(-2);
      expect(addedScripts[0].src).toBe('https://example.com/a.js');
      expect(addedScripts[0].async).toBe(true);
      expect(addedScripts[1].src).toBe('https://example.com/b.js');
      expect(addedScripts[1].async).toBe(true);
    });

    it('injects scripts before running init code', () => {
      const initialScriptCount =
        document.head.querySelectorAll('script').length;
      const mockLogger = createMockLogger();

      const context: InitContext = {
        collector: createMockCollector(),
        config: {
          settings: {
            scripts: ['https://example.com/lib.js'],
            init: "context.logger.info('init ran')",
          },
        },
        env: {},
        logger: mockLogger,
      };

      destinationCode.init!(context);

      // Scripts should be injected
      const scripts = document.head.querySelectorAll('script');
      expect(scripts.length).toBe(initialScriptCount + 1);
      expect(Array.from(scripts).pop()?.src).toBe('https://example.com/lib.js');

      // Init code should also run
      expect(mockLogger.info).toHaveBeenCalledWith('init ran');
    });

    it('executes init code string', () => {
      const mockLogger = createMockLogger();
      const context: InitContext = {
        collector: createMockCollector(),
        config: {
          settings: {
            init: "context.logger.info('initialized')",
          },
        },
        env: {},
        logger: mockLogger,
      };

      destinationCode.init!(context);

      expect(mockLogger.info).toHaveBeenCalledWith('initialized');
    });

    it('handles empty scripts array gracefully', () => {
      const initialScriptCount =
        document.head.querySelectorAll('script').length;
      const mockLogger = createMockLogger();
      const context: InitContext = {
        collector: createMockCollector(),
        config: {
          settings: {
            scripts: [],
            init: "context.logger.info('init ran')",
          },
        },
        env: {},
        logger: mockLogger,
      };

      expect(() => destinationCode.init!(context)).not.toThrow();

      // No scripts should be added
      expect(document.head.querySelectorAll('script').length).toBe(
        initialScriptCount,
      );

      // Init code should still run
      expect(mockLogger.info).toHaveBeenCalledWith('init ran');
    });

    it('handles missing init code gracefully', () => {
      const context: InitContext = {
        collector: createMockCollector(),
        config: { settings: {} },
        env: {},
        logger: createMockLogger(),
      };

      expect(() => destinationCode.init!(context)).not.toThrow();
    });

    it('catches and logs errors in init code', () => {
      const mockLogger = createMockLogger();
      const context: InitContext = {
        collector: createMockCollector(),
        config: {
          settings: {
            init: "throw new Error('test error')",
          },
        },
        env: {},
        logger: mockLogger,
      };

      destinationCode.init!(context);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('push', () => {
    it('executes push code from mapping', () => {
      const mockLogger = createMockLogger();
      const context: PushContext = {
        collector: createMockCollector(),
        config: {},
        data: { transformed: true },
        env: {},
        logger: mockLogger,
        mapping: {
          push: 'context.logger.info(event.name, context.data)',
        } as CodeMapping,
      };

      destinationCode.push(createEvent({ name: 'product view' }), context);

      expect(mockLogger.info).toHaveBeenCalledWith('product view', {
        transformed: true,
      });
    });

    it('falls back to settings.push when mapping.push is missing', () => {
      const mockLogger = createMockLogger();
      const context: PushContext = {
        collector: createMockCollector(),
        config: {
          settings: {
            push: "context.logger.info('settings fallback')",
          } as Settings,
        },
        data: {},
        env: {},
        logger: mockLogger,
        mapping: {},
      };

      destinationCode.push(createEvent({ name: 'product view' }), context);

      expect(mockLogger.info).toHaveBeenCalledWith('settings fallback');
    });

    it('prefers mapping.push over settings.push', () => {
      const mockLogger = createMockLogger();
      const context: PushContext = {
        collector: createMockCollector(),
        config: {
          settings: {
            push: "context.logger.info('from settings')",
          } as Settings,
        },
        data: {},
        env: {},
        logger: mockLogger,
        mapping: {
          push: "context.logger.info('from mapping')",
        } as CodeMapping,
      };

      destinationCode.push(createEvent({ name: 'product view' }), context);

      expect(mockLogger.info).toHaveBeenCalledWith('from mapping');
      expect(mockLogger.info).not.toHaveBeenCalledWith('from settings');
    });

    it('handles missing push code gracefully', () => {
      const context: PushContext = {
        collector: createMockCollector(),
        config: {},
        env: {},
        logger: createMockLogger(),
        mapping: {},
        data: {},
      };

      expect(() =>
        destinationCode.push(createEvent({ name: 'product view' }), context),
      ).not.toThrow();
    });

    it('catches and logs errors in push code', () => {
      const mockLogger = createMockLogger();
      const context: PushContext = {
        collector: createMockCollector(),
        config: {},
        env: {},
        logger: mockLogger,
        mapping: {
          push: "throw new Error('test error')",
        } as CodeMapping,
        data: {},
      };

      destinationCode.push(createEvent({ name: 'product view' }), context);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('pushBatch', () => {
    it('executes pushBatch code from mapping', () => {
      const mockLogger = createMockLogger();
      const batch: Destination.Batch<CodeMapping> = {
        key: 'product view',
        events: [
          createEvent({ name: 'product view', id: '1' }),
          createEvent({ name: 'product view', id: '2' }),
        ],
        data: [{ id: '1' }, { id: '2' }],
      };

      const context: PushBatchContext = {
        collector: createMockCollector(),
        config: {},
        env: {},
        logger: mockLogger,
        mapping: {
          pushBatch: "context.logger.info('batch size:', batch.events.length)",
        } as CodeMapping,
      };

      destinationCode.pushBatch!(batch, context);

      expect(mockLogger.info).toHaveBeenCalledWith('batch size:', 2);
    });

    it('falls back to settings.pushBatch when mapping.pushBatch is missing', () => {
      const mockLogger = createMockLogger();
      const batch: Destination.Batch<CodeMapping> = {
        key: 'test',
        events: [],
        data: [],
      };

      const context: PushBatchContext = {
        collector: createMockCollector(),
        config: {
          settings: {
            pushBatch: "context.logger.info('batch settings fallback')",
          } as Settings,
        },
        env: {},
        logger: mockLogger,
        mapping: {},
      };

      destinationCode.pushBatch!(batch, context);

      expect(mockLogger.info).toHaveBeenCalledWith('batch settings fallback');
    });

    it('handles missing pushBatch code gracefully', () => {
      const batch: Destination.Batch<CodeMapping> = {
        key: 'test',
        events: [],
        data: [],
      };

      const context: PushBatchContext = {
        collector: createMockCollector(),
        config: {},
        env: {},
        logger: createMockLogger(),
        mapping: {},
      };

      expect(() => destinationCode.pushBatch!(batch, context)).not.toThrow();
    });

    it('catches and logs errors in pushBatch code', () => {
      const mockLogger = createMockLogger();
      const batch: Destination.Batch<CodeMapping> = {
        key: 'test',
        events: [],
        data: [],
      };

      const context: PushBatchContext = {
        collector: createMockCollector(),
        config: {},
        env: {},
        logger: mockLogger,
        mapping: {
          pushBatch: "throw new Error('test error')",
        } as CodeMapping,
      };

      destinationCode.pushBatch!(batch, context);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('on', () => {
    it('executes on code string', () => {
      const mockLogger = createMockLogger();
      const context: Context = {
        collector: createMockCollector(),
        config: {
          settings: {
            on: "if (type === 'consent') context.logger.info('consent:', context.data)",
          } as Settings,
        },
        data: { marketing: true },
        env: {},
        logger: mockLogger,
      };

      destinationCode.on!('consent', context);

      expect(mockLogger.info).toHaveBeenCalledWith('consent:', {
        marketing: true,
      });
    });

    it('handles missing on code gracefully', () => {
      const context: Context = {
        collector: createMockCollector(),
        config: { settings: {} },
        env: {},
        logger: createMockLogger(),
      };

      expect(() => destinationCode.on!('consent', context)).not.toThrow();
    });

    it('catches and logs errors in on code', () => {
      const mockLogger = createMockLogger();
      const context: Context = {
        collector: createMockCollector(),
        config: {
          settings: {
            on: "throw new Error('test error')",
          } as Settings,
        },
        env: {},
        logger: mockLogger,
      };

      destinationCode.on!('consent', context);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

describe('code: true initialization', () => {
  it('uses built-in destinationCode when code is true', async () => {
    const collector = {
      logger: createMockLogger(),
    } as unknown as Collector.Instance;

    const destinations = await initDestinations(collector, {
      myCodeDest: {
        code: true as unknown as Destination.Instance,
        config: {
          settings: {
            init: "context.logger.info('ready')",
          },
        },
      },
    });

    expect(destinations.myCodeDest).toBeDefined();
    expect(destinations.myCodeDest.type).toBe('code');
    expect(destinations.myCodeDest.init).toBeDefined();
    expect(destinations.myCodeDest.push).toBeDefined();
  });

  it('preserves provided config with code: true', async () => {
    const collector = {
      logger: createMockLogger(),
    } as unknown as Collector.Instance;

    const destinations = await initDestinations(collector, {
      myCodeDest: {
        code: true as unknown as Destination.Instance,
        config: {
          settings: {
            init: "context.logger.info('custom init')",
            push: "context.logger.info('custom push')",
          },
          consent: { functional: true },
        },
      },
    });

    expect(destinations.myCodeDest.config.settings).toEqual({
      init: "context.logger.info('custom init')",
      push: "context.logger.info('custom push')",
    });
    expect(destinations.myCodeDest.config.consent).toEqual({
      functional: true,
    });
  });
});
