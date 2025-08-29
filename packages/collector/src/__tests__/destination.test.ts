import type { Collector } from '@walkeros/core';
import type { Destination, WalkerOS } from '@walkeros/core';
import { clone, createEvent } from '@walkeros/core';
import { pushToDestinations } from '..';

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
});
