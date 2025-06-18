import type { Destination, WalkerOS } from '@walkerOS/types';
import { createEvent, clone } from '@walkerOS/utils';
import { pushToDestinations } from '../';

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

  function createInstance(
    args?: Partial<WalkerOS.Instance>,
  ): WalkerOS.Instance {
    return {
      allowed: true,
      config: {},
      destinations: { foo: destination },
      globals: {},
      hooks: {},
      user: {},
      consent: {},
      queue: [],
      ...args,
    } as unknown as WalkerOS.Instance;
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
    const instance = createInstance({ allowed: false });
    let result = await pushToDestinations(instance, event);
    expect(result.ok).toBeFalsy();

    instance.allowed = true;
    result = await pushToDestinations(instance, event);
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

    await pushToDestinations(createInstance(), event, {
      destinationUpdate,
      destination,
    });
    expect(mockPushUpdate).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      clonedEvent,
      { init: true },
      undefined,
      expect.anything(),
    );
  });

  test('failing init', async () => {
    // Simulate a failed init
    mockInit.mockImplementation(() => false);

    await pushToDestinations(createInstance(), event);
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
    const result = await pushToDestinations(createInstance(), event, {
      destination,
    });
    expect(result.failed).toHaveLength(1);
    expect(result.ok).toBeFalsy();
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(destination.dlq).toContainEqual([event, new Error('kaputt')]);
  });

  test('skip on denied consent', async () => {});
});
