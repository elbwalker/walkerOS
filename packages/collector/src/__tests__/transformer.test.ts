import type { Collector, Transformer, WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import {
  walkChain,
  runTransformerChain,
  transformerInit,
  transformerPush,
} from '../transformer';

describe('Transformer', () => {
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
      transformers: {},
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

  // Mock transformer factory
  function createMockTransformer(
    overrides: Partial<Transformer.Instance> = {},
  ): Transformer.Instance {
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

    test('returns empty array for empty transformers', () => {
      const result = walkChain('a', {});
      expect(result).toEqual([]);
    });

    test('walks single transformer', () => {
      const transformers = { a: {} };
      const result = walkChain('a', transformers);
      expect(result).toEqual(['a']);
    });

    test('walks chain of transformers', () => {
      const transformers = {
        a: { next: 'b' },
        b: { next: 'c' },
        c: {},
      };
      const result = walkChain('a', transformers);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    test('detects circular reference and stops', () => {
      const transformers = {
        a: { next: 'b' },
        b: { next: 'a' }, // Circular!
      };
      const result = walkChain('a', transformers);
      expect(result).toEqual(['a', 'b']);
    });

    test('stops at missing transformer', () => {
      const transformers = {
        a: { next: 'missing' },
      };
      const result = walkChain('a', transformers);
      expect(result).toEqual(['a']);
    });

    test('returns array directly when provided', () => {
      const chain = walkChain(['a', 'b', 'c'], {});
      expect(chain).toEqual(['a', 'b', 'c']);
    });

    test('ignores transformer.next when array provided at start', () => {
      const chain = walkChain(['a'], { a: { next: 'b' }, b: {} });
      expect(chain).toEqual(['a']);
    });

    test('still walks chain for string input', () => {
      const chain = walkChain('a', { a: { next: 'b' }, b: {} });
      expect(chain).toEqual(['a', 'b']);
    });

    test('appends array next and stops when encountered during walk', () => {
      const chain = walkChain('a', {
        a: { next: 'b' },
        b: { next: ['c', 'd'] },
        c: { next: 'e' },
        d: {},
        e: {},
      });
      expect(chain).toEqual(['a', 'b', 'c', 'd']);
    });

    test('handles empty array at start', () => {
      const chain = walkChain([], { a: { next: 'b' } });
      expect(chain).toEqual([]);
    });
  });

  describe('runTransformerChain', () => {
    test('returns original event for empty chain', async () => {
      const collector = createMockCollector();
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runTransformerChain(collector, {}, [], event);

      expect(result).toEqual(event);
    });

    test('passes event through transformer that returns void', async () => {
      const collector = createMockCollector();
      const mockPush = jest.fn().mockResolvedValue(undefined);
      const transformers = {
        passthrough: createMockTransformer({ push: mockPush }),
      };
      collector.transformers = transformers;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runTransformerChain(
        collector,
        transformers,
        ['passthrough'],
        event,
      );

      expect(mockPush).toHaveBeenCalledWith(event, expect.any(Object));
      expect(result).toEqual(event);
    });

    test('uses modified event from transformer', async () => {
      const collector = createMockCollector();
      const modifiedEvent = { name: 'page view', data: { modified: true } };
      const mockPush = jest.fn().mockResolvedValue(modifiedEvent);
      const transformers = {
        modifier: createMockTransformer({ push: mockPush }),
      };
      collector.transformers = transformers;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runTransformerChain(
        collector,
        transformers,
        ['modifier'],
        event,
      );

      expect(result).toEqual(modifiedEvent);
    });

    test('stops chain when transformer returns false', async () => {
      const collector = createMockCollector();
      const mockPush1 = jest.fn().mockResolvedValue(false);
      const mockPush2 = jest.fn();
      const transformers = {
        stopper: createMockTransformer({ push: mockPush1 }),
        never: createMockTransformer({ push: mockPush2 }),
      };
      collector.transformers = transformers;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runTransformerChain(
        collector,
        transformers,
        ['stopper', 'never'],
        event,
      );

      expect(result).toBeNull();
      expect(mockPush1).toHaveBeenCalled();
      expect(mockPush2).not.toHaveBeenCalled();
    });

    test('stops chain when transformer throws error', async () => {
      const collector = createMockCollector();
      const mockPush1 = jest.fn().mockRejectedValue(new Error('fail'));
      const mockPush2 = jest.fn();
      const transformers = {
        thrower: createMockTransformer({ push: mockPush1 }),
        never: createMockTransformer({ push: mockPush2 }),
      };
      collector.transformers = transformers;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runTransformerChain(
        collector,
        transformers,
        ['thrower', 'never'],
        event,
      );

      expect(result).toBeNull();
      expect(mockPush1).toHaveBeenCalled();
      expect(mockPush2).not.toHaveBeenCalled();
    });

    test('chains multiple transformers in order', async () => {
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
      const transformers = {
        first: createMockTransformer({ push: mockPush1 }),
        second: createMockTransformer({ push: mockPush2 }),
      };
      collector.transformers = transformers;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view', data: {} };

      const result = await runTransformerChain(
        collector,
        transformers,
        ['first', 'second'],
        event,
      );

      expect(callOrder).toEqual(['first', 'second']);
      expect(result).toEqual({
        name: 'page view',
        data: { first: true, second: true },
      });
    });

    test('skips missing transformer and continues', async () => {
      const collector = createMockCollector();
      const mockPush = jest.fn().mockResolvedValue(undefined);
      const transformers = {
        exists: createMockTransformer({ push: mockPush }),
      };
      collector.transformers = transformers;
      const event: WalkerOS.DeepPartialEvent = { name: 'page view' };

      const result = await runTransformerChain(
        collector,
        transformers,
        ['missing', 'exists'],
        event,
      );

      expect(mockPush).toHaveBeenCalled();
      expect(result).toEqual(event);
    });
  });

  describe('transformerInit', () => {
    test('returns true for transformer without init function', async () => {
      const collector = createMockCollector();
      const transformer = createMockTransformer();

      const result = await transformerInit(
        collector,
        transformer,
        'test-transformer',
      );

      expect(result).toBe(true);
    });

    test('calls init function and marks as initialized', async () => {
      const collector = createMockCollector();
      const mockInit = jest.fn().mockResolvedValue({ setting: 'value' });
      const transformer = createMockTransformer({
        init: mockInit,
        config: { init: false },
      });

      const result = await transformerInit(
        collector,
        transformer,
        'test-transformer',
      );

      expect(result).toBe(true);
      expect(mockInit).toHaveBeenCalled();
      expect(transformer.config.init).toBe(true);
    });

    test('returns false when init returns false', async () => {
      const collector = createMockCollector();
      const mockInit = jest.fn().mockResolvedValue(false);
      const transformer = createMockTransformer({
        init: mockInit,
        config: { init: false },
      });

      const result = await transformerInit(
        collector,
        transformer,
        'test-transformer',
      );

      expect(result).toBe(false);
    });

    test('skips init if already initialized', async () => {
      const collector = createMockCollector();
      const mockInit = jest.fn();
      const transformer = createMockTransformer({
        init: mockInit,
        config: { init: true }, // Already initialized
      });

      const result = await transformerInit(
        collector,
        transformer,
        'test-transformer',
      );

      expect(result).toBe(true);
      expect(mockInit).not.toHaveBeenCalled();
    });
  });

  describe('transformerPush', () => {
    test('calls transformer push with event and context', async () => {
      const collector = createMockCollector();
      const mockPush = jest.fn().mockResolvedValue(undefined);
      const transformer = createMockTransformer({ push: mockPush });
      const event: WalkerOS.DeepPartialEvent = { name: 'test event' };

      await transformerPush(collector, transformer, 'test-transformer', event);

      expect(mockPush).toHaveBeenCalledWith(
        event,
        expect.objectContaining({
          collector,
          config: transformer.config,
        }),
      );
    });

    test('returns modified event from transformer', async () => {
      const collector = createMockCollector();
      const modifiedEvent = { name: 'modified', data: { changed: true } };
      const mockPush = jest.fn().mockResolvedValue(modifiedEvent);
      const transformer = createMockTransformer({ push: mockPush });
      const event: WalkerOS.DeepPartialEvent = { name: 'original' };

      const result = await transformerPush(
        collector,
        transformer,
        'test-transformer',
        event,
      );

      expect(result).toEqual(modifiedEvent);
    });

    test('returns false when transformer stops chain', async () => {
      const collector = createMockCollector();
      const mockPush = jest.fn().mockResolvedValue(false);
      const transformer = createMockTransformer({ push: mockPush });
      const event: WalkerOS.DeepPartialEvent = { name: 'test' };

      const result = await transformerPush(
        collector,
        transformer,
        'test-transformer',
        event,
      );

      expect(result).toBe(false);
    });
  });
});
