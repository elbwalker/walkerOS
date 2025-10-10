import type { Collector } from '@walkeros/core';
import type { Destination, WalkerOS } from '@walkeros/core';
import { clone, createEvent } from '@walkeros/core';
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
      verbose: false,
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
      expect(mockOnMethod).toHaveBeenCalledWith('consent', { marketing: true });
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
      expect(mockOnMethod).toHaveBeenCalledWith('session', collector.session);
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
      expect(mockOnMethod).toHaveBeenCalledWith('ready', undefined);
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
      expect(mockOnMethod).toHaveBeenCalledWith('run', undefined);
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
      expect(asyncOnMethod).toHaveBeenCalledWith('consent', {
        marketing: true,
      });
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
      expect(mockOn1).toHaveBeenCalledWith('consent', { marketing: true });
      expect(mockOn2).toHaveBeenCalledWith('consent', { marketing: true });
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
      expect(errorOnMethod).toHaveBeenCalledWith('consent', {
        marketing: true,
      });
    });
  });
});
