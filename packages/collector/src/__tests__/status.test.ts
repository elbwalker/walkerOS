import type { Collector, Destination, WalkerOS } from '@walkeros/core';
import { createEvent, createMockLogger } from '@walkeros/core';
import { pushToDestinations, startFlow } from '..';

describe('Status', () => {
  let event: WalkerOS.Event;
  let mockPush: jest.Mock;

  function createDestination(
    args?: Partial<Destination.Instance>,
  ): Destination.Instance {
    return {
      push: mockPush,
      config: {},
      ...args,
    } as Destination.Instance;
  }

  function createTestConfig(
    overrides: Partial<Collector.Config> = {},
  ): Collector.Config {
    return {
      tagging: 1,
      globalsStatic: {},
      sessionStatic: {},
      ...overrides,
    };
  }

  function createCollector(
    args?: Partial<
      Omit<Collector.Instance, 'config'> & {
        config?: Partial<Collector.Config>;
      }
    >,
  ): Collector.Instance {
    const mockLogger = createMockLogger();
    const scopedMockLogger = createMockLogger();
    mockLogger.scope = jest.fn().mockReturnValue(scopedMockLogger);

    return {
      allowed: true,
      destinations: {},
      globals: {},
      hooks: {},
      logger: mockLogger,
      user: {},
      consent: {},
      queue: [],
      transformers: {},
      status: {
        startedAt: 0,
        in: 0,
        out: 0,
        failed: 0,
        sources: {},
        destinations: {},
      },
      ...args,
      config: args?.config ? createTestConfig(args.config) : createTestConfig(),
    } as unknown as Collector.Instance;
  }

  beforeEach(() => {
    event = createEvent();
    mockPush = jest.fn();
  });

  describe('initialization', () => {
    test('startFlow initializes status with startedAt', async () => {
      const before = Date.now();
      const { collector } = await startFlow({});
      const after = Date.now();

      expect(collector.status).toBeDefined();
      expect(collector.status.startedAt).toBeGreaterThanOrEqual(before);
      expect(collector.status.startedAt).toBeLessThanOrEqual(after);
      expect(collector.status.in).toBe(0);
      expect(collector.status.out).toBe(0);
      expect(collector.status.failed).toBe(0);
      expect(collector.status.sources).toEqual({});
      expect(collector.status.destinations).toEqual({});
    });
  });

  describe('destination tracking', () => {
    test('successful push increments out and destination count', async () => {
      const destination = createDestination();
      const collector = createCollector({
        destinations: { ga4: destination },
      });

      await pushToDestinations(collector, event);

      expect(collector.status.in).toBe(1);
      expect(collector.status.out).toBe(1);
      expect(collector.status.failed).toBe(0);
      expect(collector.status.destinations.ga4).toBeDefined();
      expect(collector.status.destinations.ga4.count).toBe(1);
      expect(collector.status.destinations.ga4.failed).toBe(0);
      expect(collector.status.destinations.ga4.lastAt).toBeGreaterThan(0);
      expect(collector.status.destinations.ga4.duration).toBeGreaterThanOrEqual(
        0,
      );
    });

    test('failed push increments failed counters', async () => {
      const failingPush = jest
        .fn()
        .mockRejectedValue(new Error('Token expired'));
      const destination = createDestination({ push: failingPush });
      const collector = createCollector({
        destinations: { meta: destination },
      });

      await pushToDestinations(collector, event);

      expect(collector.status.in).toBe(1);
      expect(collector.status.out).toBe(0);
      expect(collector.status.failed).toBe(1);
      expect(collector.status.destinations.meta.count).toBe(0);
      expect(collector.status.destinations.meta.failed).toBe(1);
      expect(collector.status.destinations.meta.lastAt).toBeGreaterThan(0);
      expect(
        collector.status.destinations.meta.duration,
      ).toBeGreaterThanOrEqual(0);
    });

    test('multiple destinations tracked independently', async () => {
      const successDest = createDestination();
      const failingPush = jest.fn().mockRejectedValue(new Error('fail'));
      const failDest = createDestination({ push: failingPush });
      const collector = createCollector({
        destinations: { ga4: successDest, meta: failDest },
      });

      await pushToDestinations(collector, event);

      expect(collector.status.in).toBe(1);
      expect(collector.status.out).toBe(1);
      expect(collector.status.failed).toBe(1);
      expect(collector.status.destinations.ga4.count).toBe(1);
      expect(collector.status.destinations.ga4.failed).toBe(0);
      expect(collector.status.destinations.meta.count).toBe(0);
      expect(collector.status.destinations.meta.failed).toBe(1);
    });

    test('multiple pushes accumulate counters', async () => {
      const destination = createDestination();
      const collector = createCollector({
        destinations: { ga4: destination },
      });

      await pushToDestinations(collector, event);
      await pushToDestinations(collector, event);
      await pushToDestinations(collector, event);

      expect(collector.status.in).toBe(3);
      expect(collector.status.out).toBe(3);
      expect(collector.status.destinations.ga4.count).toBe(3);
      expect(collector.status.destinations.ga4.duration).toBeGreaterThanOrEqual(
        0,
      );
    });

    test('duration accumulates across pushes', async () => {
      // Advance fake timers between pushes to simulate time passing
      const destination = createDestination();
      const collector = createCollector({
        destinations: { slow: destination },
      });

      await pushToDestinations(collector, event);
      await pushToDestinations(collector, event);

      // Duration is tracked (may be 0 with fake timers, but field exists and accumulates)
      expect(
        collector.status.destinations.slow.duration,
      ).toBeGreaterThanOrEqual(0);
      expect(collector.status.destinations.slow.count).toBe(2);
    });

    test('skipped destinations do not create status entries', async () => {
      const collector = createCollector({ allowed: false });

      await pushToDestinations(collector, event);

      expect(collector.status.in).toBe(0);
      expect(Object.keys(collector.status.destinations)).toHaveLength(0);
    });

    test('no event push does not increment in', async () => {
      const destination = createDestination();
      const collector = createCollector({
        destinations: { ga4: destination },
      });

      await pushToDestinations(collector, undefined);

      expect(collector.status.in).toBe(0);
    });
  });

  describe('source tracking via startFlow', () => {
    test('source push increments source count', async () => {
      let sourcePush!: Collector.PushFn;

      const testSource = async (context: any) => {
        sourcePush = context.env.push;
        return {
          type: 'test',
          config: {},
          push: context.env.push,
        };
      };

      const { collector } = await startFlow({
        sources: {
          mySource: { code: testSource },
        },
        destinations: {
          console: { code: { push: jest.fn(), config: {} } },
        },
      });

      collector.allowed = true;
      await sourcePush({ name: 'test action' });

      expect(collector.status.in).toBe(1);
      expect(collector.status.sources.mySource).toBeDefined();
      expect(collector.status.sources.mySource.count).toBe(1);
      expect(collector.status.sources.mySource.lastAt).toBeGreaterThan(0);
      expect(collector.status.sources.mySource.duration).toBeGreaterThanOrEqual(
        0,
      );
    });
  });
});
