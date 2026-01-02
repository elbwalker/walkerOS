import type { Collector, Processor, WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import {
  walkChain,
  resolveProcessorGraph,
  runProcessorChain,
  processorInit,
  processorPush,
} from '../processor';

describe('Processor', () => {
  // Mock collector for tests
  function createMockCollector(
    overrides: Partial<Collector.Instance> = {},
  ): Collector.Instance {
    const mockLogger = createMockLogger();

    return {
      allowed: true,
      config: { tagging: 1, globalsStatic: {}, sessionStatic: {} },
      consent: {},
      count: 0,
      custom: {},
      destinations: {},
      processors: {},
      processorChain: { pre: [], post: {} },
      globals: {},
      group: '',
      hooks: {},
      logger: mockLogger,
      on: {},
      queue: [],
      round: 0,
      session: undefined,
      timing: Date.now(),
      user: {},
      version: '1.0.0',
      sources: {},
      push: jest.fn(),
      command: jest.fn(),
      ...overrides,
    } as unknown as Collector.Instance;
  }

  // Mock processor factory
  function createMockProcessor(
    overrides: Partial<Processor.Instance> = {},
  ): Processor.Instance {
    return {
      type: 'mock',
      config: {},
      push: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  describe('walkChain', () => {
    test('returns empty array for undefined startId', () => {
      const result = walkChain(undefined, {});
      expect(result).toEqual([]);
    });

    test('returns empty array for empty processors', () => {
      const result = walkChain('a', {});
      expect(result).toEqual([]);
    });

    test('walks single processor', () => {
      const processors = { a: {} };
      const result = walkChain('a', processors);
      expect(result).toEqual(['a']);
    });

    test('walks chain of processors', () => {
      const processors = {
        a: { next: 'b' },
        b: { next: 'c' },
        c: {},
      };
      const result = walkChain('a', processors);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    test('detects circular reference and stops', () => {
      const processors = {
        a: { next: 'b' },
        b: { next: 'a' }, // Circular!
      };
      const result = walkChain('a', processors);
      expect(result).toEqual(['a', 'b']);
    });

    test('stops at missing processor', () => {
      const processors = {
        a: { next: 'missing' },
      };
      const result = walkChain('a', processors);
      expect(result).toEqual(['a']);
    });
  });

  describe('resolveProcessorGraph', () => {
    test('returns empty chains when no sources or destinations', () => {
      const result = resolveProcessorGraph({}, {}, {});
      expect(result).toEqual({ pre: [], post: {} });
    });

    test('builds post-chain from destination.before', () => {
      const destinations = {
        ga4: { before: 'redact' },
      };
      const processors = {
        redact: { next: 'anonymize' },
        anonymize: {},
      };
      const result = resolveProcessorGraph({}, destinations, processors);
      expect(result.post).toEqual({
        ga4: ['redact', 'anonymize'],
      });
    });

    test('builds multiple post-chains for different destinations', () => {
      const destinations = {
        ga4: { before: 'redact' },
        warehouse: { before: 'validate' },
      };
      const processors = {
        redact: {},
        validate: {},
      };
      const result = resolveProcessorGraph({}, destinations, processors);
      expect(result.post).toEqual({
        ga4: ['redact'],
        warehouse: ['validate'],
      });
    });

    test('ignores destinations without before', () => {
      const destinations = {
        ga4: { before: 'redact' },
        warehouse: {}, // No before
      };
      const processors = {
        redact: {},
      };
      const result = resolveProcessorGraph({}, destinations, processors);
      expect(result.post).toEqual({
        ga4: ['redact'],
      });
      expect(result.post.warehouse).toBeUndefined();
    });

    test('pre-chain is always empty (resolved per-source now)', () => {
      const sources = {
        browser: { next: 'enrich' },
      };
      const processors = {
        enrich: {},
      };
      const result = resolveProcessorGraph(sources, {}, processors);
      expect(result.pre).toEqual([]);
    });
  });

  describe('runProcessorChain', () => {
    test('returns original event for empty chain', async () => {
      const collector = createMockCollector();
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runProcessorChain(collector, {}, [], event);

      expect(result).toEqual(event);
    });

    test('passes event through processor that returns void', async () => {
      const collector = createMockCollector();
      const mockPush = jest.fn().mockResolvedValue(undefined);
      const processors = {
        passthrough: createMockProcessor({ push: mockPush }),
      };
      collector.processors = processors;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runProcessorChain(
        collector,
        processors,
        ['passthrough'],
        event,
      );

      expect(mockPush).toHaveBeenCalledWith(event, expect.any(Object));
      expect(result).toEqual(event);
    });

    test('uses modified event from processor', async () => {
      const collector = createMockCollector();
      const modifiedEvent = { name: 'page view', data: { modified: true } };
      const mockPush = jest.fn().mockResolvedValue(modifiedEvent);
      const processors = {
        modifier: createMockProcessor({ push: mockPush }),
      };
      collector.processors = processors;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runProcessorChain(
        collector,
        processors,
        ['modifier'],
        event,
      );

      expect(result).toEqual(modifiedEvent);
    });

    test('stops chain when processor returns false', async () => {
      const collector = createMockCollector();
      const mockPush1 = jest.fn().mockResolvedValue(false);
      const mockPush2 = jest.fn();
      const processors = {
        stopper: createMockProcessor({ push: mockPush1 }),
        never: createMockProcessor({ push: mockPush2 }),
      };
      collector.processors = processors;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runProcessorChain(
        collector,
        processors,
        ['stopper', 'never'],
        event,
      );

      expect(result).toBeNull();
      expect(mockPush1).toHaveBeenCalled();
      expect(mockPush2).not.toHaveBeenCalled();
    });

    test('stops chain when processor throws error', async () => {
      const collector = createMockCollector();
      const mockPush1 = jest.fn().mockRejectedValue(new Error('fail'));
      const mockPush2 = jest.fn();
      const processors = {
        thrower: createMockProcessor({ push: mockPush1 }),
        never: createMockProcessor({ push: mockPush2 }),
      };
      collector.processors = processors;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runProcessorChain(
        collector,
        processors,
        ['thrower', 'never'],
        event,
      );

      expect(result).toBeNull();
      expect(mockPush1).toHaveBeenCalled();
      expect(mockPush2).not.toHaveBeenCalled();
    });

    test('chains multiple processors in order', async () => {
      const collector = createMockCollector();
      const callOrder: string[] = [];
      const mockPush1 = jest.fn().mockImplementation(async (event) => {
        callOrder.push('first');
        return { ...event, data: { ...event.data, first: true } };
      });
      const mockPush2 = jest.fn().mockImplementation(async (event) => {
        callOrder.push('second');
        return { ...event, data: { ...event.data, second: true } };
      });
      const processors = {
        first: createMockProcessor({ push: mockPush1 }),
        second: createMockProcessor({ push: mockPush2 }),
      };
      collector.processors = processors;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view', data: {} };

      const result = await runProcessorChain(
        collector,
        processors,
        ['first', 'second'],
        event,
      );

      expect(callOrder).toEqual(['first', 'second']);
      expect(result).toEqual({
        name: 'page view',
        data: { first: true, second: true },
      });
    });

    test('skips missing processor and continues', async () => {
      const collector = createMockCollector();
      const mockPush = jest.fn().mockResolvedValue(undefined);
      const processors = {
        exists: createMockProcessor({ push: mockPush }),
      };
      collector.processors = processors;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runProcessorChain(
        collector,
        processors,
        ['missing', 'exists'],
        event,
      );

      expect(mockPush).toHaveBeenCalled();
      expect(result).toEqual(event);
    });
  });

  describe('processorInit', () => {
    test('returns true for processor without init function', async () => {
      const collector = createMockCollector();
      const processor = createMockProcessor();

      const result = await processorInit(collector, processor);

      expect(result).toBe(true);
    });

    test('calls init function and marks as initialized', async () => {
      const collector = createMockCollector();
      const mockInit = jest.fn().mockResolvedValue({ setting: 'value' });
      const processor = createMockProcessor({
        init: mockInit,
        config: { init: false },
      });

      const result = await processorInit(collector, processor);

      expect(result).toBe(true);
      expect(mockInit).toHaveBeenCalled();
      expect(processor.config.init).toBe(true);
    });

    test('returns false when init returns false', async () => {
      const collector = createMockCollector();
      const mockInit = jest.fn().mockResolvedValue(false);
      const processor = createMockProcessor({
        init: mockInit,
        config: { init: false },
      });

      const result = await processorInit(collector, processor);

      expect(result).toBe(false);
    });

    test('skips init if already initialized', async () => {
      const collector = createMockCollector();
      const mockInit = jest.fn();
      const processor = createMockProcessor({
        init: mockInit,
        config: { init: true }, // Already initialized
      });

      const result = await processorInit(collector, processor);

      expect(result).toBe(true);
      expect(mockInit).not.toHaveBeenCalled();
    });
  });

  describe('processorPush', () => {
    test('calls processor push with event and context', async () => {
      const collector = createMockCollector();
      const mockPush = jest.fn().mockResolvedValue(undefined);
      const processor = createMockProcessor({ push: mockPush });
      const event: WalkerOS.DeepPartialEvent = { name: 'test event' };

      await processorPush(collector, processor, event);

      expect(mockPush).toHaveBeenCalledWith(
        event,
        expect.objectContaining({
          collector,
          config: processor.config,
        }),
      );
    });

    test('returns modified event from processor', async () => {
      const collector = createMockCollector();
      const modifiedEvent = { name: 'modified', data: { changed: true } };
      const mockPush = jest.fn().mockResolvedValue(modifiedEvent);
      const processor = createMockProcessor({ push: mockPush });
      const event: WalkerOS.DeepPartialEvent = { name: 'original' };

      const result = await processorPush(collector, processor, event);

      expect(result).toEqual(modifiedEvent);
    });

    test('returns false when processor stops chain', async () => {
      const collector = createMockCollector();
      const mockPush = jest.fn().mockResolvedValue(false);
      const processor = createMockProcessor({ push: mockPush });
      const event: WalkerOS.DeepPartialEvent = { name: 'test' };

      const result = await processorPush(collector, processor, event);

      expect(result).toBe(false);
    });
  });
});
