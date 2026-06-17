import type { Collector, Destination, WalkerOS } from '@walkeros/core';
import { createEvent, createMockLogger, stepId } from '@walkeros/core';
import { addDestination, pushToDestinations, startFlow } from '..';

describe('queue bounds', () => {
  function makeEvent(name = 'entity action'): WalkerOS.Event {
    return createEvent({ name });
  }

  function createTestConfig(
    overrides: Partial<Collector.Config> = {},
  ): Collector.Config {
    return {
      globalsStatic: {},
      sessionStatic: {},
      ...overrides,
    };
  }

  function createTestCollector(
    args: {
      config?: Partial<Collector.Config>;
      consent?: WalkerOS.Consent;
      destinations?: Collector.Destinations;
    } = {},
  ): Collector.Instance {
    const mockLogger = createMockLogger();
    const scopedMockLogger = createMockLogger();
    mockLogger.scope = jest.fn().mockReturnValue(scopedMockLogger);

    const config: Collector.Config = createTestConfig({
      queueMax: 1_000,
      ...args.config,
    });

    const instance: Collector.Instance = {
      allowed: true,
      destinations: args.destinations || {},
      transformers: {},
      stores: {},
      globals: {},
      hooks: {},
      observers: new Set(),
      logger: mockLogger,
      user: {},
      consent: args.consent || {},
      queue: [],
      round: 0,
      count: 0,
      stateVersion: 0,
      cellVersion: {},
      delivery: new WeakMap(),
      seenEvents: new Set(),
      session: undefined,
      timing: Date.now(),
      sources: {},
      pending: { destinations: {} },
      status: {
        startedAt: 0,
        in: 0,
        out: 0,
        failed: 0,
        sources: {},
        destinations: {},
        dropped: {},
        connectionErrors: {},
        breakers: {},
      },
      config,
      push: jest.fn(),
      command: jest.fn(),
      on: {},
      custom: {},
    };
    return instance;
  }

  describe('collector.queue cap', () => {
    test('happy path: pushes under cap, no drops', async () => {
      const collector = createTestCollector({ config: { queueMax: 100 } });

      for (let i = 0; i < 5; i++) {
        await pushToDestinations(collector, makeEvent(`event ${i}`));
      }

      expect(collector.queue.length).toBe(5);
      expect(collector.status.dropped[stepId('collector')]?.queue ?? 0).toBe(0);
    });

    test('cap enforced: drops oldest, retains newest', async () => {
      const collector = createTestCollector({ config: { queueMax: 3 } });

      for (let i = 0; i < 5; i++) {
        await pushToDestinations(collector, makeEvent(`event ${i}`));
      }

      expect(collector.queue.length).toBe(3);
      expect(collector.status.dropped[stepId('collector')]?.queue ?? 0).toBe(2);
      expect(collector.queue.map((e) => e.name)).toEqual([
        'event 2',
        'event 3',
        'event 4',
      ]);
    });

    test('backfill to new destination receives capped queue only', async () => {
      const collector = createTestCollector({ config: { queueMax: 3 } });

      for (let i = 0; i < 5; i++) {
        await pushToDestinations(collector, makeEvent(`event ${i}`));
      }

      // Add a destination after events have been pushed; it should
      // receive only the retained (capped) events as backfill.
      const mockPush = jest.fn();
      const code: Destination.Code = {
        config: {},
        push: mockPush,
      };
      // Use require:['consent'] so the destination queues rather than pushes.
      await addDestination(collector, {
        code,
        config: { id: 'late', consent: { marketing: true } },
      });

      const destination = collector.destinations['late'];
      expect(destination).toBeDefined();
      // The late destination's queuePush is initialized from collector.queue.
      // After pushToDestinations runs, queuePush carries the denied events
      // (consent not granted). Length must equal the capped queue size.
      expect(destination.queuePush?.length).toBe(3);
      expect(destination.queuePush?.map((e) => e.name)).toEqual([
        'event 2',
        'event 3',
        'event 4',
      ]);
    });

    test('warn-once-on-transition log emitted on overflow', async () => {
      const collector = createTestCollector({ config: { queueMax: 2 } });

      // Push 3 events; the third should overflow once.
      await pushToDestinations(collector, makeEvent('a'));
      await pushToDestinations(collector, makeEvent('b'));
      await pushToDestinations(collector, makeEvent('c'));

      // The scoped warn() should have been called for the queue overflow.
      // We capture both root and scoped loggers via the mock.
      const scopedLogger = (collector.logger.scope as jest.Mock).mock.results[0]
        ?.value;
      const allWarns = [
        ...(collector.logger.warn as jest.Mock).mock.calls,
        ...((scopedLogger?.warn as jest.Mock | undefined)?.mock.calls ?? []),
      ];
      const queueWarn = allWarns.find((call) =>
        String(call[0]).toLowerCase().includes('queue'),
      );
      expect(queueWarn).toBeDefined();
    });

    test('warn suppressed on subsequent drops within same window', async () => {
      const collector = createTestCollector({ config: { queueMax: 2 } });

      for (let i = 0; i < 5; i++) {
        await pushToDestinations(collector, makeEvent(`event ${i}`));
      }

      const scopedLogger = (collector.logger.scope as jest.Mock).mock.results[0]
        ?.value;
      const allWarns = [
        ...(collector.logger.warn as jest.Mock).mock.calls,
        ...((scopedLogger?.warn as jest.Mock | undefined)?.mock.calls ?? []),
      ];
      const queueWarns = allWarns.filter((call) =>
        String(call[0]).toLowerCase().includes('queue'),
      );
      // Three overflows but only the first transition logs.
      expect(queueWarns.length).toBe(1);
      // Drop counter still tracks every dropped event.
      expect(collector.status.dropped[stepId('collector')]?.queue ?? 0).toBe(3);
    });
  });

  describe('destination.queuePush cap', () => {
    test('consent-denied events drop oldest when over cap', async () => {
      const mockPush = jest.fn();
      const destination: Destination.Instance = {
        push: mockPush,
        config: { id: 'dest', consent: { marketing: true }, queueMax: 3 },
      };

      const collector = createTestCollector({
        destinations: { dest: destination },
      });

      for (let i = 0; i < 5; i++) {
        await pushToDestinations(collector, makeEvent(`event ${i}`));
      }

      expect(destination.queuePush?.length).toBe(3);
      expect(destination.queuePush?.map((e) => e.name)).toEqual([
        'event 2',
        'event 3',
        'event 4',
      ]);
      expect(
        collector.status.dropped[stepId('destination', 'dest')]?.queue ?? 0,
      ).toBe(2);
      expect(collector.status.destinations['dest'].queuePushSize).toBe(3);
    });

    test('granted consent flushes queue to destination push', async () => {
      const mockPush = jest.fn();
      const destination: Destination.Instance = {
        push: mockPush,
        config: { id: 'dest', consent: { marketing: true } },
      };

      const collector = createTestCollector({
        destinations: { dest: destination },
      });

      // Three denied pushes.
      for (let i = 0; i < 3; i++) {
        await pushToDestinations(collector, makeEvent(`denied ${i}`));
      }
      expect(destination.queuePush?.length).toBe(3);
      expect(mockPush).not.toHaveBeenCalled();

      // Grant consent on the collector.
      collector.consent = { marketing: true };

      // Push one allowed event; it flushes the 3 queued + 1 new.
      await pushToDestinations(collector, makeEvent('allowed'));
      expect(mockPush).toHaveBeenCalledTimes(4);
      expect(destination.queuePush?.length).toBe(0);
      expect(collector.status.destinations['dest'].queuePushSize).toBe(0);
    });

    test('each destination queueMax applies independently', async () => {
      const mockPush1 = jest.fn();
      const dest1: Destination.Instance = {
        push: mockPush1,
        config: {
          id: 'd1',
          consent: { marketing: true },
          queueMax: 5,
        },
      };
      const mockPush2 = jest.fn();
      const dest2: Destination.Instance = {
        push: mockPush2,
        config: {
          id: 'd2',
          consent: { marketing: true },
          queueMax: 3,
        },
      };

      const collector = createTestCollector({
        destinations: { d1: dest1, d2: dest2 },
      });

      for (let i = 0; i < 7; i++) {
        await pushToDestinations(collector, makeEvent(`event ${i}`));
      }

      expect(dest1.queuePush?.length).toBe(5);
      expect(dest2.queuePush?.length).toBe(3);
      expect(
        collector.status.dropped[stepId('destination', 'd1')]?.queue ?? 0,
      ).toBe(2);
      expect(
        collector.status.dropped[stepId('destination', 'd2')]?.queue ?? 0,
      ).toBe(4);
    });
  });

  describe('destination.dlq cap', () => {
    test('failed pushes evict oldest when over cap', async () => {
      const mockPush = jest.fn().mockImplementation(() => {
        throw new Error('kaputt');
      });
      const destination: Destination.Instance = {
        push: mockPush,
        config: { id: 'dest', dlqMax: 3 },
      };

      const collector = createTestCollector({
        destinations: { dest: destination },
      });

      for (let i = 0; i < 5; i++) {
        await pushToDestinations(collector, makeEvent(`event ${i}`));
      }

      expect(destination.dlq?.length).toBe(3);
      const names = destination.dlq?.map(([evt]) => evt.name);
      expect(names).toEqual(['event 2', 'event 3', 'event 4']);
      expect(
        collector.status.dropped[stepId('destination', 'dest')]?.dlq ?? 0,
      ).toBe(2);
      expect(collector.status.destinations['dest'].dlqSize).toBe(3);
    });

    test('DLQ entries preserve [event, error] tuple shape', async () => {
      const err = new Error('boom');
      const mockPush = jest.fn().mockImplementation(() => {
        throw err;
      });
      const destination: Destination.Instance = {
        push: mockPush,
        config: { id: 'dest' },
      };

      const collector = createTestCollector({
        destinations: { dest: destination },
      });

      const event = makeEvent('one');
      await pushToDestinations(collector, event);

      expect(destination.dlq?.length).toBe(1);
      expect(destination.dlq?.[0][0].name).toBe('one');
      expect(destination.dlq?.[0][1]).toBe(err);
    });

    test('each destination dlqMax applies independently', async () => {
      const err = new Error('fail');
      const mockPush1 = jest.fn().mockImplementation(() => {
        throw err;
      });
      const dest1: Destination.Instance = {
        push: mockPush1,
        config: { id: 'd1', dlqMax: 5 },
      };
      const mockPush2 = jest.fn().mockImplementation(() => {
        throw err;
      });
      const dest2: Destination.Instance = {
        push: mockPush2,
        config: { id: 'd2', dlqMax: 2 },
      };

      const collector = createTestCollector({
        destinations: { d1: dest1, d2: dest2 },
      });

      for (let i = 0; i < 7; i++) {
        await pushToDestinations(collector, makeEvent(`event ${i}`));
      }

      expect(dest1.dlq?.length).toBe(5);
      expect(dest2.dlq?.length).toBe(2);
      expect(
        collector.status.dropped[stepId('destination', 'd1')]?.dlq ?? 0,
      ).toBe(2);
      expect(
        collector.status.dropped[stepId('destination', 'd2')]?.dlq ?? 0,
      ).toBe(5);
    });
  });

  describe('integration: end-to-end counters', () => {
    test('startFlow with three destinations reports per-buffer counters', async () => {
      const failPush = jest.fn().mockImplementation(() => {
        throw new Error('boom');
      });
      const queuedPush = jest.fn();
      const okPush = jest.fn();

      const { collector, elb } = await startFlow({
        run: false,
        destinations: {
          failing: {
            code: { push: failPush, config: {} },
            config: { id: 'failing', dlqMax: 2 },
          },
          queued: {
            code: { push: queuedPush, config: {} },
            config: {
              id: 'queued',
              consent: { marketing: true },
              queueMax: 2,
            },
          },
          healthy: {
            code: { push: okPush, config: {} },
            config: { id: 'healthy' },
          },
        },
      });

      // Now run.
      await collector.command('run');

      for (let i = 0; i < 5; i++) {
        await elb(makeEvent(`event ${i}`));
      }

      // collector.queue capped at the default 1000; 5 events fit comfortably.
      expect(collector.status.dropped[stepId('collector')]?.queue ?? 0).toBe(0);

      // Failing destination DLQ caps at 2, drops 3.
      expect(collector.destinations['failing'].dlq?.length).toBe(2);
      expect(
        collector.status.dropped[stepId('destination', 'failing')]?.dlq ?? 0,
      ).toBe(3);
      expect(collector.status.destinations['failing'].dlqSize).toBe(2);

      // Consent-denied destination queuePush caps at 2, drops 3.
      expect(collector.destinations['queued'].queuePush?.length).toBe(2);
      expect(
        collector.status.dropped[stepId('destination', 'queued')]?.queue ?? 0,
      ).toBe(3);
      expect(collector.status.destinations['queued'].queuePushSize).toBe(2);

      // Healthy destination receives all events.
      expect(okPush).toHaveBeenCalledTimes(5);
    });
  });
});
