import type { Destination, WalkerOS } from '@walkerOS/core';
import { clone, createEvent } from '@walkerOS/core';
import { pushToDestinations } from '..';

describe('Destination', () => {
  let event: WalkerOS.Event;
  let destination: Destination.Destination;
  let config: Destination.Config;
  let mockInit: jest.Mock;
  let mockPush: jest.Mock;

  function createDestination(
    args?: Partial<Destination.Destination>,
  ): Destination.Destination {
    return {
      init: mockInit,
      push: mockPush,
      config: {},
      ...args,
    } as Destination.Destination;
  }

  function createTestConfig(
    overrides: Partial<WalkerOS.Config> = {},
  ): WalkerOS.Config {
    return {
      dryRun: false,
      tagging: 1,
      session: false,
      verbose: false,
      globalsStatic: {},
      sessionStatic: {},
      ...overrides,
    };
  }

  function createWalkerjs(
    args?: Partial<
      Omit<WalkerOS.Collector, 'config'> & { config?: Partial<WalkerOS.Config> }
    >,
  ): WalkerOS.Collector {
    const defaultConfig = createTestConfig();

    return {
      allowed: true,
      destinations: { foo: destination },
      globals: {},
      hooks: {},
      user: {},
      consent: {},
      queue: [],
      ...args,
      config: args?.config ? createTestConfig(args.config) : defaultConfig,
    } as unknown as WalkerOS.Collector;
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

    await pushToDestinations(createWalkerjs(), event, {
      destinationUpdate,
      destination,
    });
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

  test('DLQ', async () => {
    const event = createEvent();
    // Simulate a failing push
    mockPush.mockImplementation(() => {
      throw new Error('kaputt');
    });

    const destination = createDestination();
    const result = await pushToDestinations(createWalkerjs(), event, {
      destination,
    });
    expect(result.failed).toHaveLength(1);
    expect(result.ok).toBeFalsy();
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(destination.dlq).toContainEqual([event, new Error('kaputt')]);
  });

  test('skip on denied consent', async () => {});

  test('dryRun from destination config', async () => {
    const destinationWithDryRun = createDestination({
      config: { dryRun: true },
    });

    await pushToDestinations(createWalkerjs(), event, {
      destinationWithDryRun,
    });

    // Init should still be called, but push should not actually execute (due to wrapper)
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    // The wrapper should be configured with dryRun
    expect(mockPush).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        wrap: expect.any(Function),
      }),
    );
  });

  test('dryRun from collector config', async () => {
    const collectorWithDryRun = createWalkerjs({
      config: { dryRun: true },
    });

    await pushToDestinations(collectorWithDryRun, event);

    // Init and push should be called, but wrapped with dryRun
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  test('destination dryRun overrides collector dryRun', async () => {
    const collectorWithDryRun = createWalkerjs({
      config: { dryRun: true },
    });

    const destinationOverrideDryRun = createDestination({
      config: { dryRun: false },
    });

    await pushToDestinations(collectorWithDryRun, event, {
      destinationOverrideDryRun,
    });

    // Should use destination's dryRun setting (false), not collector's (true)
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  describe('DryRun Configuration Scenarios', () => {
    let mockWrapperFn: jest.Mock;
    let onCall: jest.Mock;

    beforeEach(() => {
      mockWrapperFn = jest.fn((_arg: string) => 'original-result');
      onCall = jest.fn();
    });

    function createDestinationWithWrapper(
      destinationConfig: Partial<Destination.Config>,
    ) {
      return createDestination({
        push: (_event, { wrap }) => {
          const wrappedFn = wrap('testFunction', mockWrapperFn);
          const result = wrappedFn('test-arg');
          mockPush({ result, executed: mockWrapperFn.mock.calls.length });
        },
        config: {
          wrapper: { onCall },
          ...destinationConfig,
        },
      });
    }

    test('should use global dryRun when destination has no dryRun config', async () => {
      const collectorWithGlobalDryRun = createWalkerjs({
        config: { dryRun: true },
      });

      const destinationNoDryRun = createDestinationWithWrapper({});

      await pushToDestinations(collectorWithGlobalDryRun, event, {
        destinationNoDryRun,
      });

      expect(mockPush).toHaveBeenCalledWith({
        result: undefined, // dryRun returns undefined when no mockReturn
        executed: 0, // Function should not execute in dryRun mode
      });
      expect(onCall).toHaveBeenCalledWith(
        { name: 'testFunction', type: 'unknown' },
        ['test-arg'],
      );
    });

    test('should use destination dryRun when both global and destination are set', async () => {
      const collectorWithGlobalDryRun = createWalkerjs({
        config: { dryRun: true },
      });

      const destinationOverrideDryRun = createDestinationWithWrapper({
        dryRun: false,
      });

      await pushToDestinations(collectorWithGlobalDryRun, event, {
        destinationOverrideDryRun,
      });

      expect(mockPush).toHaveBeenCalledWith({
        result: 'original-result', // Normal execution, not dryRun
        executed: 1, // Function should execute normally
      });
      expect(onCall).toHaveBeenCalledWith(
        { name: 'testFunction', type: 'unknown' },
        ['test-arg'],
      );
    });

    test('should handle undefined dryRun values correctly', async () => {
      // Test 1: No dryRun anywhere
      const collectorNoDryRun = createWalkerjs({ config: {} });
      const destinationNoDryRun = createDestinationWithWrapper({});

      await pushToDestinations(collectorNoDryRun, event, {
        destinationNoDryRun,
      });

      expect(mockPush).toHaveBeenCalledWith({
        result: 'original-result',
        executed: 1, // Normal execution
      });

      // Reset mocks
      jest.clearAllMocks();

      // Test 2: Global false, destination undefined
      const collectorFalseDryRun = createWalkerjs({
        config: { dryRun: false },
      });

      await pushToDestinations(collectorFalseDryRun, event, {
        destinationNoDryRun,
      });

      expect(mockPush).toHaveBeenCalledWith({
        result: 'original-result',
        executed: 1, // Normal execution
      });
    });

    test('should pass dryRun with mockReturn correctly', async () => {
      const collectorWithDryRun = createWalkerjs({
        config: { dryRun: true },
      });

      const destinationWithMockReturn = createDestination({
        push: (_event, { wrap }) => {
          const wrappedFn = wrap('testFunction', mockWrapperFn);
          const result = wrappedFn('test-arg');
          mockPush({ result, executed: mockWrapperFn.mock.calls.length });
        },
        config: {
          wrapper: { mockReturn: 'mocked-result', onCall },
        },
      });

      await pushToDestinations(collectorWithDryRun, event, {
        destinationWithMockReturn,
      });

      expect(mockPush).toHaveBeenCalledWith({
        result: 'mocked-result', // Should return mockReturn value
        executed: 0, // Function should not execute
      });
    });

    test('should handle multiple destinations with different dryRun settings', async () => {
      const collectorWithGlobalDryRun = createWalkerjs({
        config: { dryRun: true },
      });

      // Create separate mock functions for each destination to avoid conflicts
      const mockPush1 = jest.fn();
      const mockPush2 = jest.fn();
      const mockPush3 = jest.fn();
      const mockWrapperFn1 = jest.fn((_arg: string) => 'original-result-1');
      const mockWrapperFn2 = jest.fn((_arg: string) => 'original-result-2');
      const mockWrapperFn3 = jest.fn((_arg: string) => 'original-result-3');

      const destination1 = createDestination({
        push: (_event, { wrap }) => {
          const wrappedFn = wrap('testFunction1', mockWrapperFn1);
          const result = wrappedFn('test-arg');
          mockPush1({ result, executed: mockWrapperFn1.mock.calls.length });
        },
        config: { dryRun: false, wrapper: { onCall } }, // Override to normal
      });

      const destination2 = createDestination({
        push: (_event, { wrap }) => {
          const wrappedFn = wrap('testFunction2', mockWrapperFn2);
          const result = wrappedFn('test-arg');
          mockPush2({ result, executed: mockWrapperFn2.mock.calls.length });
        },
        config: { wrapper: { onCall } }, // Use global (dryRun)
      });

      const destination3 = createDestination({
        push: (_event, { wrap }) => {
          const wrappedFn = wrap('testFunction3', mockWrapperFn3);
          const result = wrappedFn('test-arg');
          mockPush3({ result, executed: mockWrapperFn3.mock.calls.length });
        },
        config: { dryRun: true, wrapper: { onCall } }, // Explicit dryRun
      });

      await pushToDestinations(collectorWithGlobalDryRun, event, {
        destination1,
        destination2,
        destination3,
      });

      // destination1: dryRun = false (override to normal execution)
      expect(mockPush1).toHaveBeenCalledWith({
        result: 'original-result-1',
        executed: 1,
      });

      // destination2: dryRun = true (from global, should not execute)
      expect(mockPush2).toHaveBeenCalledWith({
        result: undefined,
        executed: 0,
      });

      // destination3: dryRun = true (explicit, should not execute)
      expect(mockPush3).toHaveBeenCalledWith({
        result: undefined,
        executed: 0,
      });
    });

    test('should pass dryRun to wrapper in destinationInit context', async () => {
      const mockInitWrapper = jest.fn((_arg: string) => 'init-result');
      const initDestination = createDestination({
        init: (context) => {
          const wrappedFn = context.wrap('initFunction', mockInitWrapper);
          const result = wrappedFn('init-arg');
          mockInit({ result, executed: mockInitWrapper.mock.calls.length });
        },
        config: { dryRun: true, wrapper: { onCall } },
      });

      await pushToDestinations(createWalkerjs(), event, { initDestination });

      expect(mockInit).toHaveBeenCalledWith({
        result: undefined, // dryRun mode
        executed: 0,
      });
      expect(onCall).toHaveBeenCalledWith(
        { name: 'initFunction', type: 'unknown' },
        ['init-arg'],
      );
    });

    test('should pass dryRun to wrapper in batch context', async () => {
      const mockBatchWrapper = jest.fn((_arg: string) => 'batch-result');
      const batchDestination = createDestination({
        push: mockPush,
        pushBatch: (_batch, { wrap }) => {
          const wrappedFn = wrap('batchFunction', mockBatchWrapper);
          const result = wrappedFn('batch-arg');
          mockPush({ result, executed: mockBatchWrapper.mock.calls.length });
        },
        config: {
          dryRun: true,
          wrapper: { onCall },
          mapping: {
            test: { action: { batch: 50 } },
          },
        },
      });

      const batchEvent = clone(event);
      batchEvent.event = 'test action';

      await pushToDestinations(createWalkerjs(), batchEvent, {
        batchDestination,
      });

      // Advance timers to trigger batch processing
      jest.advanceTimersByTime(50);

      expect(mockPush).toHaveBeenCalledWith({
        result: undefined, // dryRun mode
        executed: 0,
      });
      expect(onCall).toHaveBeenCalledWith(
        { name: 'batchFunction', type: 'unknown' },
        ['batch-arg'],
      );
    });

    test('should handle dryRun precedence correctly in all scenarios', async () => {
      const testCases = [
        {
          name: 'global undefined, destination undefined',
          globalDryRun: undefined,
          destinationDryRun: undefined,
          expectedExecution: 1,
        },
        {
          name: 'global false, destination undefined',
          globalDryRun: false,
          destinationDryRun: undefined,
          expectedExecution: 1,
        },
        {
          name: 'global true, destination undefined',
          globalDryRun: true,
          destinationDryRun: undefined,
          expectedExecution: 0,
        },
        {
          name: 'global true, destination false',
          globalDryRun: true,
          destinationDryRun: false,
          expectedExecution: 1,
        },
        {
          name: 'global false, destination true',
          globalDryRun: false,
          destinationDryRun: true,
          expectedExecution: 0,
        },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        const collector = createWalkerjs({
          config:
            testCase.globalDryRun !== undefined
              ? { dryRun: testCase.globalDryRun }
              : {},
        });

        const destination = createDestinationWithWrapper(
          testCase.destinationDryRun !== undefined
            ? { dryRun: testCase.destinationDryRun }
            : {},
        );

        await pushToDestinations(collector, event, { destination });

        expect(mockPush).toHaveBeenCalledWith({
          result: testCase.expectedExecution ? 'original-result' : undefined,
          executed: testCase.expectedExecution,
        });
      }
    });
  });
});
