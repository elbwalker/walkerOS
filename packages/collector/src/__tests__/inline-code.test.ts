import type {
  Collector,
  Destination,
  Source,
  Transformer,
  WalkerOS,
  Elb,
} from '@walkeros/core';
import { createEvent, createMockLogger } from '@walkeros/core';
import { startFlow } from '../flow';
import { initSources } from '../source';
import { initDestinations, pushToDestinations } from '../destination';
import { initTransformers, runTransformerChain } from '../transformer';

/**
 * Tests for inline function code support.
 *
 * These tests verify that inline functions work correctly for sources,
 * destinations, and transformers. This is the mechanism that the $code:
 * prefix uses at bundle time - it outputs raw JavaScript functions instead
 * of strings, which are then used directly as the code parameter.
 *
 * The old `code: true` approach used `new Function()` at runtime, which
 * is now deprecated. Users should use $code: prefix in flow.json instead.
 */
describe('Inline Code Support ($code: prefix equivalent)', () => {
  // Helper to create a minimal collector for testing
  function createTestCollector(
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
      pendingSources: [],
      push: jest.fn(),
      command: jest.fn(),
      status: {
        startedAt: 0,
        in: 0,
        out: 0,
        failed: 0,
        sources: {},
        destinations: {},
      },
      ...overrides,
    } as unknown as Collector.Instance;
  }

  describe('Source with inline code', () => {
    let collector: Collector.Instance;

    beforeEach(async () => {
      const result = await startFlow();
      collector = result.collector;
    });

    it('should initialize source with inline function code', async () => {
      // This is what $code: produces at bundle time - a raw function
      const inlineSourceCode: Source.Init = async (context) => {
        const { config, env } = context;
        return {
          type: 'inline-source',
          config: {
            ...config,
            settings: { initialized: true },
          } as Source.Config,
          push: env.push as Elb.Fn,
        };
      };

      const sources = await initSources(collector, {
        mySource: {
          code: inlineSourceCode,
          config: { settings: {} } as Source.Config,
          env: {},
        },
      });

      expect(sources).toHaveProperty('mySource');
      expect(sources.mySource.type).toBe('inline-source');
      expect(sources.mySource.config.settings).toEqual({ initialized: true });
    });

    it('should provide push function to inline source', async () => {
      let receivedPush: unknown;

      const inlineSourceCode: Source.Init = async (context) => {
        const { config, env } = context;
        receivedPush = env.push;

        return {
          type: 'inline-push',
          config: config as Source.Config,
          push: env.push as Elb.Fn,
        };
      };

      await initSources(collector, {
        pushSource: {
          code: inlineSourceCode,
          config: { settings: {} } as Source.Config,
          env: {},
        },
      });

      // The source should have received a push function
      expect(receivedPush).toBeDefined();
      expect(typeof receivedPush).toBe('function');
    });
  });

  describe('Destination with inline code', () => {
    it('should initialize destination with inline function code', async () => {
      const collector = createTestCollector();

      // This is what $code: produces at bundle time
      const inlineDestination: Destination.Instance = {
        type: 'inline-dest',
        config: {},
        push: jest.fn(),
      };

      const destinations = await initDestinations(collector, {
        myDest: {
          code: inlineDestination,
          config: {},
          env: {},
        },
      });

      expect(destinations).toHaveProperty('myDest');
      expect(destinations.myDest.type).toBe('inline-dest');
    });

    it('should push events to inline destination', async () => {
      const mockPush = jest.fn();
      const collector = createTestCollector();

      const inlineDestination: Destination.Instance = {
        type: 'inline-receiver',
        config: {},
        push: mockPush,
      };

      const destinations = {
        receiver: inlineDestination,
      };

      const event = createEvent({ name: 'test event', data: { foo: 'bar' } });

      await pushToDestinations(collector, event, {}, destinations);

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'test event' }),
        expect.any(Object),
      );
    });

    it('should support init function in inline destination', async () => {
      const mockInit = jest.fn().mockResolvedValue({ init: true });
      const mockPush = jest.fn();
      const collector = createTestCollector();

      const inlineDestinationWithInit: Destination.Instance = {
        type: 'inline-with-init',
        config: {},
        init: mockInit,
        push: mockPush,
      };

      const destinations = {
        initDest: inlineDestinationWithInit,
      };

      const event = createEvent({ name: 'trigger init', data: {} });

      await pushToDestinations(collector, event, {}, destinations);

      expect(mockInit).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('Transformer with inline code', () => {
    let collector: Collector.Instance;

    beforeEach(async () => {
      const result = await startFlow();
      collector = result.collector;
    });

    it('should initialize transformer with inline function code', async () => {
      // This is what $code: produces at bundle time
      const inlineTransformerCode: Transformer.Init = async (context) => {
        return {
          type: 'inline-transformer',
          config: context.config,
          push: async (event) => {
            // Transform the event
            return {
              ...event,
              data: { ...event.data, transformed: true },
            };
          },
        };
      };

      const transformers = await initTransformers(collector, {
        myTransformer: {
          code: inlineTransformerCode,
          config: {},
          env: {},
        },
      });

      expect(transformers).toHaveProperty('myTransformer');
      expect(transformers.myTransformer.type).toBe('inline-transformer');
    });

    it('should transform events through inline transformer', async () => {
      const inlineTransformerCode: Transformer.Init = async () => {
        return {
          type: 'enricher',
          config: {},
          push: async (event) => {
            return {
              ...event,
              data: {
                ...event.data,
                enriched: true,
                timestamp: 12345,
              },
            };
          },
        };
      };

      const transformers = await initTransformers(collector, {
        enricher: {
          code: inlineTransformerCode,
          config: {},
          env: {},
        },
      });

      collector.transformers = transformers;

      const inputEvent: WalkerOS.DeepPartialEvent = {
        name: 'original event',
        data: { original: true },
      };

      const result = await runTransformerChain(
        collector,
        transformers,
        ['enricher'],
        inputEvent,
      );

      expect(result).not.toBeNull();
      expect(result!.data).toEqual({
        original: true,
        enriched: true,
        timestamp: 12345,
      });
    });

    it('should support transformer chaining with inline code', async () => {
      const validatorCode: Transformer.Init = async () => ({
        type: 'validator',
        config: { next: 'enricher' },
        push: async (event) => {
          if (!event.name) return false; // Stop chain if no name
          return { ...event, data: { ...event.data, validated: true } };
        },
      });

      const enricherCode: Transformer.Init = async () => ({
        type: 'enricher',
        config: {},
        push: async (event) => {
          return { ...event, data: { ...event.data, enriched: true } };
        },
      });

      const transformers = await initTransformers(collector, {
        validator: {
          code: validatorCode,
          config: { next: 'enricher' },
          env: {},
        },
        enricher: { code: enricherCode, config: {}, env: {} },
      });

      collector.transformers = transformers;

      const inputEvent: WalkerOS.DeepPartialEvent = {
        name: 'chained event',
        data: { original: true },
      };

      const result = await runTransformerChain(
        collector,
        transformers,
        ['validator', 'enricher'],
        inputEvent,
      );

      expect(result).not.toBeNull();
      expect(result!.data).toEqual({
        original: true,
        validated: true,
        enriched: true,
      });
    });

    it('should stop chain when transformer returns false', async () => {
      const blockerCode: Transformer.Init = async () => ({
        type: 'blocker',
        config: {},
        push: async () => false as const, // Always block
      });

      const neverCalledCode: Transformer.Init = async () => ({
        type: 'never-called',
        config: {},
        push: jest.fn(),
      });

      const transformers = await initTransformers(collector, {
        blocker: { code: blockerCode, config: {}, env: {} },
        neverCalled: { code: neverCalledCode, config: {}, env: {} },
      });

      collector.transformers = transformers;

      const result = await runTransformerChain(
        collector,
        transformers,
        ['blocker', 'neverCalled'],
        { name: 'blocked event', data: {} },
      );

      expect(result).toBeNull();
    });
  });

  describe('Full flow with inline code', () => {
    it('should work with inline source, transformer, and destination together', async () => {
      const mockDestPush = jest.fn();

      // Use startFlow to get a properly initialized collector
      const { collector } = await startFlow();

      // Initialize inline transformer
      const inlineTransformer: Transformer.Init = async () => ({
        type: 'flow-transformer',
        config: {},
        push: async (event) => ({
          ...event,
          data: { ...event.data, transformed: true },
        }),
      });

      const transformers = await initTransformers(collector, {
        myTransformer: {
          code: inlineTransformer,
          config: {},
          env: {},
        },
      });

      collector.transformers = transformers;

      // Initialize inline destination
      const inlineDestination: Destination.Instance = {
        type: 'flow-destination',
        config: {},
        push: mockDestPush,
      };

      const destinations = {
        myDestination: inlineDestination,
      };

      // Initialize inline source
      const inlineSource: Source.Init = async (context) => {
        return {
          type: 'flow-source',
          config: context.config as Source.Config,
          push: context.env.push as Elb.Fn,
        };
      };

      const sources = await initSources(collector, {
        mySource: {
          code: inlineSource,
          config: { settings: {} } as Source.Config,
          env: {},
        },
      });

      // Verify all components initialized
      expect(transformers.myTransformer).toBeDefined();
      expect(transformers.myTransformer.type).toBe('flow-transformer');
      expect(destinations.myDestination.type).toBe('flow-destination');
      expect(sources.mySource.type).toBe('flow-source');

      // Test transformer transforms event
      const event: WalkerOS.DeepPartialEvent = {
        name: 'flow event',
        data: { source: 'test' },
      };

      const transformedEvent = await runTransformerChain(
        collector,
        transformers,
        ['myTransformer'],
        event,
      );

      expect(transformedEvent).not.toBeNull();
      expect(transformedEvent!.data).toEqual({
        source: 'test',
        transformed: true,
      });
    });
  });
});
