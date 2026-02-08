import type { Collector } from '@walkeros/core';
import type { Destination, WalkerOS } from '@walkeros/core';
import { clone, createEvent, createMockLogger } from '@walkeros/core';
import { pushToDestinations, startFlow } from '..';

describe('Destination', () => {
  let event: WalkerOS.Event;
  let destination: Destination.Instance;
  let config: Destination.Config;
  let mockInit: jest.Mock;
  let mockPush: jest.Mock;

  function createDestination(
    args?: Partial<Destination.Instance>,
  ): Destination.Instance {
    return {
      init: mockInit,
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

  function createWalkerjs(
    args?: Partial<
      Omit<Collector.Instance, 'config'> & {
        config?: Partial<Collector.Config>;
      }
    >,
  ): Collector.Instance {
    const defaultConfig = createTestConfig();

    // Create mock logger with proper scope chaining
    const mockLogger = createMockLogger();
    const scopedMockLogger = createMockLogger();
    mockLogger.scope = jest.fn().mockReturnValue(scopedMockLogger);

    return {
      allowed: true,
      destinations: { foo: destination },
      globals: {},
      hooks: {},
      logger: mockLogger,
      user: {},
      consent: {},
      queue: [],
      ...args,
      config: args?.config ? createTestConfig(args.config) : defaultConfig,
    } as unknown as Collector.Instance;
  }

  beforeEach(() => {
    event = createEvent();
    mockInit = jest.fn(); //.mockImplementation(console.log);
    mockPush = jest.fn(); //.mockImplementation(console.log);

    config = { init: false };

    destination = {
      init: mockInit,
      push: mockPush,
      config,
    };
  });

  test('allowed', async () => {
    const collector = createWalkerjs({ allowed: false });
    let result = await pushToDestinations(collector, event);
    expect(result.ok).toBeFalsy();

    collector.allowed = true;
    result = await pushToDestinations(collector, event);
    expect(result.ok).toBeTruthy();
  });

  test('preventing data manipulation', async () => {
    const clonedEvent = clone(event);
    const mockPushUpdate = jest.fn().mockImplementation((event) => {
      event.data.foo = 'bar';
    });

    const destinationUpdate = {
      init: mockInit,
      push: mockPushUpdate,
      config: {},
    };

    await pushToDestinations(
      createWalkerjs(),
      event,
      {},
      {
        destinationUpdate,
        destination,
      },
    );
    expect(mockPushUpdate).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      clonedEvent,
      expect.objectContaining({
        config: { init: true },
      }),
    );
  });

  test('failing init', async () => {
    // Simulate a failed init
    mockInit.mockImplementation(() => false);

    await pushToDestinations(createWalkerjs(), event);
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(0);
    expect(destination.config.init).toBeFalsy();
  });

  test('logs init lifecycle', async () => {
    const collector = createWalkerjs();

    await pushToDestinations(collector, event);

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);

    // Verify logger.scope was called with destination type
    expect(collector.logger.scope).toHaveBeenCalledWith('unknown');

    // Get the scoped logger instance
    const scopedLogger = (collector.logger.scope as jest.Mock).mock.results[0]
      .value;

    // Verify init lifecycle logs
    expect(scopedLogger.debug).toHaveBeenCalledWith('init');
    expect(scopedLogger.debug).toHaveBeenCalledWith('init done');
  });

  test('logs push lifecycle', async () => {
    const collector = createWalkerjs();
    destination.config.init = true; // Skip init for this test

    await pushToDestinations(collector, event);

    expect(mockPush).toHaveBeenCalledTimes(1);

    // Verify logger.scope was called with destination type
    expect(collector.logger.scope).toHaveBeenCalledWith('unknown');

    // Get the scoped logger instance
    const scopedLogger = (collector.logger.scope as jest.Mock).mock.results[0]
      .value;

    // Verify push lifecycle logs
    expect(scopedLogger.debug).toHaveBeenCalledWith('push', {
      event: event.name,
    });
    expect(scopedLogger.debug).toHaveBeenCalledWith('push done');
  });

  test('DLQ', async () => {
    const event = createEvent();
    // Simulate a failing push
    mockPush.mockImplementation(() => {
      throw new Error('kaputt');
    });

    const destination = createDestination();
    const result = await pushToDestinations(
      createWalkerjs(),
      event,
      {},
      {
        destination,
      },
    );
    expect(result.failed).toBeDefined();
    expect(Object.keys(result.failed!)).toHaveLength(1);
    expect(result.ok).toBeFalsy();
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(destination.dlq).toContainEqual([event, new Error('kaputt')]);
  });

  test('skip on denied consent', async () => {});

  test('preserves denied events in queue when some events are allowed', async () => {
    // Destination requires marketing consent
    const destinationWithConsent = createDestination({
      config: { consent: { marketing: true } },
    });

    // Collector does NOT have marketing consent
    const collector = createWalkerjs({
      consent: { analytics: true },
      destinations: { dest: destinationWithConsent },
    });

    // Pre-queue an event (will be denied: collector lacks marketing,
    // and queue events get consent overwritten with collector state)
    const deniedEvent = clone(event);
    deniedEvent.name = 'denied action';
    deniedEvent.entity = 'denied';
    deniedEvent.action = 'action';
    destinationWithConsent.queuePush = [deniedEvent];

    // Push a new event that carries individual marketing consent.
    // New events are cloned (not consent-overwritten), so this one
    // passes the consent check via individual consent.
    const allowedEvent = clone(event);
    allowedEvent.consent = { marketing: true };

    await pushToDestinations(collector, allowedEvent);

    // The allowed (new) event should have been pushed
    expect(mockPush).toHaveBeenCalledTimes(1);

    // The denied (queued) event should still be in the queue
    expect(destinationWithConsent.queuePush).toHaveLength(1);
    expect(destinationWithConsent.queuePush[0].name).toBe('denied action');
  });

  describe('destination on method', () => {
    let mockOnMethod: jest.Mock;

    beforeEach(() => {
      mockOnMethod = jest.fn();
    });

    it('should call destination on method when consent event is triggered', async () => {
      const destinationWithOn = createDestination({
        on: mockOnMethod,
        config: { init: true },
      });

      const { collector, elb } = await startFlow({
        destinations: { testDestination: { code: destinationWithOn } },
      });

      // Trigger consent event
      await elb('walker consent', { marketing: true });

      // Verify the destination's on method was called with consent context
      expect(mockOnMethod).toHaveBeenCalledWith(
        'consent',
        expect.objectContaining({
          data: { marketing: true },
          collector: expect.any(Object),
          config: expect.any(Object),
          env: expect.any(Object),
          logger: expect.any(Object),
        }),
      );
    });

    it('should call destination on method when session event is triggered', async () => {
      const destinationWithOn = createDestination({
        on: mockOnMethod,
        config: { init: true },
      });

      const { collector, elb } = await startFlow({
        destinations: { testDestination: { code: destinationWithOn } },
      });

      // Set session data and trigger session event
      collector.session = {
        id: 'test-session',
        isStart: true,
        storage: false,
        device: 'test',
      };
      await elb('walker session');

      // Verify the destination's on method was called with session context
      expect(mockOnMethod).toHaveBeenCalledWith(
        'session',
        expect.objectContaining({
          data: collector.session,
          collector: expect.any(Object),
          config: expect.any(Object),
          env: expect.any(Object),
          logger: expect.any(Object),
        }),
      );
    });

    it('should call destination on method when ready event is triggered', async () => {
      const destinationWithOn = createDestination({
        on: mockOnMethod,
        config: { init: true },
      });

      const { collector, elb } = await startFlow({
        destinations: { testDestination: { code: destinationWithOn } },
      });

      // Trigger ready event
      await elb('walker ready');

      // Verify the destination's on method was called
      expect(mockOnMethod).toHaveBeenCalledWith(
        'ready',
        expect.objectContaining({
          data: undefined,
          collector: expect.any(Object),
          config: expect.any(Object),
          env: expect.any(Object),
          logger: expect.any(Object),
        }),
      );
    });

    it('should call destination on method when run event is triggered', async () => {
      const destinationWithOn = createDestination({
        on: mockOnMethod,
        config: { init: true },
      });

      const { collector, elb } = await startFlow({
        destinations: { testDestination: { code: destinationWithOn } },
      });

      // Trigger run event
      await elb('walker run');

      // Verify the destination's on method was called
      expect(mockOnMethod).toHaveBeenCalledWith(
        'run',
        expect.objectContaining({
          data: undefined,
          collector: expect.any(Object),
          config: expect.any(Object),
          env: expect.any(Object),
          logger: expect.any(Object),
        }),
      );
    });

    it('should not fail if destination does not have on method', async () => {
      const destinationWithoutOn = createDestination({
        config: { init: true },
      });

      const { collector, elb } = await startFlow({
        destinations: { testDestination: { code: destinationWithoutOn } },
      });

      // Should not throw when destination has no on method
      expect(async () => {
        await elb('walker consent', { marketing: true });
        await elb('walker session');
        await elb('walker ready');
        await elb('walker run');
      }).not.toThrow();
    });

    it('should handle async on method', async () => {
      const asyncOnMethod = jest.fn().mockResolvedValue(undefined);
      const destinationWithAsyncOn = createDestination({
        on: asyncOnMethod,
        config: { init: true },
      });

      const { collector, elb } = await startFlow({
        destinations: { testDestination: { code: destinationWithAsyncOn } },
      });

      // Trigger consent event
      await elb('walker consent', { marketing: true });

      // Verify the async destination's on method was called
      expect(asyncOnMethod).toHaveBeenCalledWith(
        'consent',
        expect.objectContaining({
          data: { marketing: true },
          collector: expect.any(Object),
          config: expect.any(Object),
          env: expect.any(Object),
          logger: expect.any(Object),
        }),
      );
    });

    it('should call on method for multiple destinations', async () => {
      const mockOn1 = jest.fn();
      const mockOn2 = jest.fn();

      const destination1 = createDestination({
        on: mockOn1,
        config: { init: true },
      });

      const destination2 = createDestination({
        on: mockOn2,
        config: { init: true },
      });

      const { collector, elb } = await startFlow({
        destinations: {
          dest1: { code: destination1 },
          dest2: { code: destination2 },
        },
      });

      // Trigger consent event
      await elb('walker consent', { marketing: true });

      // Both destinations should receive the event
      expect(mockOn1).toHaveBeenCalledWith(
        'consent',
        expect.objectContaining({
          data: { marketing: true },
          collector: expect.any(Object),
          config: expect.any(Object),
          env: expect.any(Object),
          logger: expect.any(Object),
        }),
      );
      expect(mockOn2).toHaveBeenCalledWith(
        'consent',
        expect.objectContaining({
          data: { marketing: true },
          collector: expect.any(Object),
          config: expect.any(Object),
          env: expect.any(Object),
          logger: expect.any(Object),
        }),
      );
    });

    it('should handle on method errors gracefully', async () => {
      const errorOnMethod = jest.fn().mockImplementation(() => {
        throw new Error('On method error');
      });

      const destinationWithErrorOn = createDestination({
        on: errorOnMethod,
        config: { init: true },
      });

      const { collector, elb } = await startFlow({
        destinations: { testDestination: { code: destinationWithErrorOn } },
      });

      // Should not throw even if on method throws an error
      expect(async () => {
        await elb('walker consent', { marketing: true });
      }).not.toThrow();

      // On method should still have been called
      expect(errorOnMethod).toHaveBeenCalledWith(
        'consent',
        expect.objectContaining({
          data: { marketing: true },
          collector: expect.any(Object),
          config: expect.any(Object),
          env: expect.any(Object),
          logger: expect.any(Object),
        }),
      );
    });
  });

  describe('batch with wildcard mapping', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not duplicate events when using wildcard batch config', async () => {
      // Capture events at call time (since batched.events gets cleared after pushBatch)
      const capturedBatches: { events: WalkerOS.Events; key: string }[] = [];
      const mockPushBatch = jest.fn((batch) => {
        // Clone the events array to capture at call time
        capturedBatches.push({
          events: [...batch.events],
          key: batch.key,
        });
      });
      const mockPush = jest.fn();

      const destinationWithBatch: Destination.Instance = {
        push: mockPush,
        pushBatch: mockPushBatch,
        config: {
          init: true,
          mapping: {
            '*': {
              '*': { batch: 50 }, // 50ms debounce
            },
          },
        },
      };

      const { elb } = await startFlow({
        destinations: { batchDest: { code: destinationWithBatch } },
      });

      // Send different event types (all should match wildcard)
      await elb('page view');
      await elb('product click');
      await elb('button press');

      // Advance timers to trigger debounce
      jest.advanceTimersByTime(100);

      // pushBatch should be called exactly once with all 3 events
      expect(mockPushBatch).toHaveBeenCalledTimes(1);
      expect(capturedBatches[0].events).toHaveLength(3);

      // Verify all events are present (not duplicated)
      const eventNames = capturedBatches[0].events.map((e) => e.name);
      expect(eventNames).toContain('page view');
      expect(eventNames).toContain('product click');
      expect(eventNames).toContain('button press');

      // Individual push should NOT be called (batch handles it)
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should batch events separately per mapping key', async () => {
      // Capture events at call time
      const capturedBatches: { events: WalkerOS.Events; key: string }[] = [];
      const mockPushBatch = jest.fn((batch) => {
        capturedBatches.push({
          events: [...batch.events],
          key: batch.key,
        });
      });
      const mockPush = jest.fn();

      const destinationWithBatch: Destination.Instance = {
        push: mockPush,
        pushBatch: mockPushBatch,
        config: {
          init: true,
          mapping: {
            page: {
              '*': { batch: 50 }, // page events batch together
            },
            product: {
              '*': { batch: 50 }, // product events batch together
            },
          },
        },
      };

      const { elb } = await startFlow({
        destinations: { batchDest: { code: destinationWithBatch } },
      });

      // Send events that match different mapping keys
      await elb('page view');
      await elb('page scroll');
      await elb('product click');
      await elb('product view');

      // Advance timers to trigger debounce
      jest.advanceTimersByTime(100);

      // pushBatch should be called twice (once per mapping key)
      expect(mockPushBatch).toHaveBeenCalledTimes(2);

      // Each batch should have 2 events
      expect(capturedBatches[0].events).toHaveLength(2);
      expect(capturedBatches[1].events).toHaveLength(2);
    });

    it('should isolate batch state when multiple destinations share same mapping config', async () => {
      // This test reproduces the bug where shared mapping config causes duplicate events
      // Two destinations with the SAME mapping config object (shared reference)
      const sharedMapping = {
        '*': {
          '*': { batch: 50 },
        },
      };

      const capturedBatches: {
        destination: string;
        events: WalkerOS.Events;
        key: string;
      }[] = [];

      const mockPushBatch1 = jest.fn((batch) => {
        capturedBatches.push({
          destination: 'dest1',
          events: [...batch.events],
          key: batch.key,
        });
      });
      const mockPushBatch2 = jest.fn((batch) => {
        capturedBatches.push({
          destination: 'dest2',
          events: [...batch.events],
          key: batch.key,
        });
      });

      const destination1: Destination.Instance = {
        push: jest.fn(),
        pushBatch: mockPushBatch1,
        config: {
          init: true,
          mapping: sharedMapping, // Shared reference!
        },
      };

      const destination2: Destination.Instance = {
        push: jest.fn(),
        pushBatch: mockPushBatch2,
        config: {
          init: true,
          mapping: sharedMapping, // Same shared reference!
        },
      };

      const { elb } = await startFlow({
        destinations: {
          dest1: { code: destination1 },
          dest2: { code: destination2 },
        },
      });

      // Send events
      await elb('page view');
      await elb('product click');

      // Advance timers to trigger debounce
      jest.advanceTimersByTime(100);

      // Each destination should receive its own batch
      // BUG: Currently shared mapping causes only last destination to receive events
      // or events get duplicated across destinations
      const totalPushBatchCalls =
        mockPushBatch1.mock.calls.length + mockPushBatch2.mock.calls.length;
      expect(totalPushBatchCalls).toBe(2); // Should be 2 (one per destination)

      // Each destination should receive exactly 2 events
      expect(mockPushBatch1).toHaveBeenCalledTimes(1);
      expect(mockPushBatch2).toHaveBeenCalledTimes(1);
    });
  });
});
