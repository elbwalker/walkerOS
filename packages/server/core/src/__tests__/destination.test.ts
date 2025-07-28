import type { DestinationServer, Elb } from '../types';
import type { WalkerOS } from '@walkerOS/core';
import { createCollector } from '@walkerOS/collector';
import type { CollectorConfig } from '@walkerOS/collector';
import { createEvent } from '@walkerOS/core';

describe('Destination', () => {
  const eventCall = jest.fn();
  const mockPush = jest.fn().mockImplementation((event) => {
    eventCall(event);
  });
  const mockInit = jest.fn();

  let mockEvent: WalkerOS.Event;

  const mockDestination: DestinationServer.Destination = {
    config: {},
    init: mockInit,
    push: mockPush,
    queue: [],
    dlq: [],
  };
  let result: Elb.PushResult;

  async function getCollector(custom?: Partial<CollectorConfig>) {
    const config = custom || {
      destinations: { mock: mockDestination },
    };

    const { elb, collector } = await createCollector(config);
    return {
      elb,
      collector,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    mockEvent = createEvent({
      globals: { foo: 'bar' },
      consent: { client: true },
      user: { session: 's3ss10n' },
    });
  });

  test('init call', async () => {
    const { elb } = await getCollector();

    await elb(mockEvent);
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);

    // No init function
    const mockPushNoInit = jest.fn();
    await elb('walker destination', {
      config: {},
      push: mockPushNoInit,
    });

    jest.clearAllMocks();
    await elb(mockEvent);
    expect(mockPushNoInit).toHaveBeenCalledTimes(1);

    // Init set to true and should not be called
    const mockInitSkip = jest.fn();
    await elb(
      'walker destination',
      {
        config: { init: true },
        init: mockInitSkip,
        push: mockPush,
      },
      { init: true },
    );
    await elb(mockEvent);
    expect(mockInitSkip).toHaveBeenCalledTimes(0);

    // Always trigger init since it returns false
    const mockInitFalse = jest.fn().mockImplementation(() => {
      return false;
    });
    const mockPushFalse = jest.fn();
    await elb('walker destination', {
      config: {},
      init: mockInitFalse,
      push: mockPushFalse,
    });

    // Save config automatically
    const destinationSave = (
      await elb('walker destination', {
        config: {},
        init: jest.fn().mockImplementation(() => {
          return { foo: 'bar' };
        }),
        push: mockPush,
      })
    ).successful[0].destination;
    expect(destinationSave.config).toEqual({ foo: 'bar', init: true });

    jest.clearAllMocks();
    await elb(mockEvent);
    expect(mockInitFalse).toHaveBeenCalledTimes(1);
    await elb(mockEvent);
    expect(mockInitFalse).toHaveBeenCalledTimes(2);
    expect(mockPushFalse).not.toHaveBeenCalled();
  });

  test('push', async () => {
    const eventMapping = {
      name: 'NewEventName',
      settings: { something: 'random' },
    };
    const mapping = {
      entity: {
        rename: eventMapping,
      },
    };
    mockDestination.config.mapping = mapping;

    const { elb, collector } = await getCollector({
      destinations: { mockDestination },
      user: { id: 'us3r' },
      globalsStatic: { foo: 'irrelevant', bar: 'baz' },
      consent: { server: true },
    });

    const changes = {
      consent: { client: true, server: true },
      user: { id: 'us3r', session: 's3ss10n' },
      globals: { foo: 'bar', bar: 'baz' },
    };

    result = await elb(mockEvent);
    expect(mockDestination.push).toHaveBeenCalledTimes(1);
    expect(eventCall).toHaveBeenCalledWith({ ...mockEvent, ...changes });

    jest.clearAllMocks();
    await elb({ ...mockEvent, event: 'entity rename' });
    expect(mockDestination.push).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockEvent,
        ...changes,
        event: 'NewEventName',
      }),
      expect.objectContaining({
        mapping: eventMapping,
      }),
    );
  });

  test('mapping', async () => {
    const eventMapping = { name: 'custom' };
    const mapping = { entity: { action: eventMapping } };

    const { elb, collector } = await getCollector({});
    await elb('walker destination', mockDestination, { mapping });
    result = await elb(mockEvent);

    expect(mockDestination.push).toHaveBeenCalledTimes(1);
    expect(mockDestination.push).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'custom',
      }),
      expect.objectContaining({
        mapping: eventMapping,
      }),
    );
  });

  test('mapping data', async () => {
    const { elb } = await getCollector({});

    const eventMapping = { data: { value: 'bar' } };
    elb(
      'walker destination',
      { push: mockPush },
      { mapping: { entity: { action: eventMapping } } },
    );

    result = await elb(mockEvent);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'entity action' }),
      expect.objectContaining({
        mapping: eventMapping,
        data: 'bar',
      }),
    );
  });

  test('mapping data merge', async () => {
    const { elb } = await getCollector({});

    const eventMapping = { data: { map: { foo: { value: 'bar' } } } };
    elb(
      'walker destination',
      { push: mockPush },
      {
        data: { map: { foo: { value: 'unknown' }, bar: { value: 'baz' } } },
        mapping: { entity: { action: eventMapping } },
      },
    );

    result = await elb(mockEvent);
    expect(mockPush).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        mapping: eventMapping,
        data: {
          foo: 'bar',
          bar: 'baz',
        },
      }),
    );
  });

  test('ignore', async () => {
    mockDestination.config.mapping = { entity: { action: { ignore: true } } };

    const { elb } = await getCollector({
      destinations: { mockDestination },
    });
    result = await elb(mockEvent);

    expect(mockDestination.push).toHaveBeenCalledTimes(0);
  });

  test('immutable events', async () => {
    let changedByFirst = false;
    const first = jest.fn();
    const fistDestination: DestinationServer.Destination = {
      config: {
        mapping: {
          // Destination will change event
          entity: { action: { name: 'new name' } },
        },
      },
      push: async (event) => {
        // Destination will change event
        event.custom = { foo: 'bar' };
        changedByFirst = true;

        first({ ...event });
      },
    };
    const second = jest.fn();
    const secondDestination: DestinationServer.Destination = {
      config: {},
      push: async (event) => {
        // Make sure the first destination was called before
        if (!changedByFirst) throw Error('wrong execution order');

        second(event);
      },
    };

    const { elb } = await getCollector({
      destinations: { fistDestination, secondDestination },
    });
    result = await elb(mockEvent);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith({
      ...mockEvent,
      event: 'new name',
      custom: { foo: 'bar' },
    });
    expect(second).toHaveBeenCalledWith({ ...mockEvent });
  });

  test('add with queue', async () => {
    const { elb, collector } = await getCollector({});

    result = await elb(mockEvent);
    expect(result.successful).toHaveProperty('length', 0);
    expect(result.queued).toHaveProperty('length', 0);
    expect(result.failed).toHaveProperty('length', 0);
    expect(collector.queue[0]).toEqual(
      expect.objectContaining({
        consent: mockEvent.consent,
        user: mockEvent.user,
        globals: mockEvent.globals,
      }),
    );

    // Update values after pushing the event
    collector.consent = { demo: true };
    collector.user = { id: 'us3r' };
    collector.globals = { foo: 'bar' };

    result = await elb('walker destination', mockDestination, { id: 'later' });
    expect(result.successful).toHaveProperty('length', 1);
    expect(result.successful[0]).toHaveProperty('id', 'later');
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        consent: { demo: true },
        user: { id: 'us3r', session: 's3ss10n' },
        globals: { foo: 'bar' },
      }),
    );
  });

  test('fail', async () => {
    const initFail: DestinationServer.Destination = {
      config: {},
      push: jest.fn().mockImplementation(() => {
        throw new Error('init kaputt');
      }),
      queue: [],
      dlq: [],
    };

    const pushFail: DestinationServer.Destination = {
      config: {},
      push: jest.fn().mockImplementation(() => {
        throw new Error('push kaputt');
      }),
      queue: [],
      dlq: [],
    };

    const { elb, collector } = await getCollector({
      destinations: { mockDestination, initFail, pushFail },
    });

    result = await elb('entity action');

    expect(result).toEqual({
      event: expect.any(Object),
      ok: false,
      successful: [
        {
          id: 'mockDestination',
          destination: expect.objectContaining({
            ...mockDestination,
            config: expect.objectContaining({
              ...mockDestination.config,
              init: true,
            }),
          }),
        },
      ],
      queued: [],
      failed: [
        {
          id: 'initFail',
          destination: initFail,
        },
        {
          id: 'pushFail',
          destination: pushFail,
        },
      ],
    });

    // DLQ
    expect(collector.destinations['initFail'].dlq).toContainEqual([
      expect.objectContaining({ event: mockEvent.event }),
      new Error('init kaputt'),
    ]);
    expect(collector.destinations['pushFail'].dlq).toContainEqual([
      expect.objectContaining({ event: mockEvent.event }),
      new Error('push kaputt'),
    ]);
  });

  // @TODO test.skip('queue', async () => {});

  test('consent', async () => {
    const mockPushConsent = jest.fn();
    const destinationConsent: DestinationServer.Destination = {
      config: { consent: { test: true } },
      push: mockPushConsent,
    };

    const { elb } = await getCollector({
      destinations: { mockDestination, destinationConsent },
    });

    result = await elb(mockEvent);
    expect(result).toStrictEqual(
      expect.objectContaining({
        ok: true,
        successful: [expect.objectContaining({ id: 'mockDestination' })],
        queued: [expect.objectContaining({ id: 'destinationConsent' })],
      }),
    );

    result = await elb('walker consent', { test: false });
    expect(result).toStrictEqual(
      expect.objectContaining({
        ok: true,
        successful: [],
        queued: [],
        failed: [],
      }),
    );

    result = await elb('walker consent', { test: true });

    expect(mockPushConsent.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        consent: { test: true },
      }),
    );
    expect(result).toStrictEqual(
      expect.objectContaining({
        ok: true,
        successful: [expect.objectContaining({ id: 'destinationConsent' })],
        queued: [],
      }),
    );
  });

  test('policy', async () => {
    const event = createEvent();

    const policy = {
      event: {
        value: 'new name',
      },
      'data.string': { value: 'bar' },
      'nested.0.type': { value: 'kid' },
      'data.number': {
        consent: { marketing: true },
      },
      'data.new': { value: 'value' },
      // timing: { value: 'now' }, // @TODO shouldn't be possible
    };

    const destination: DestinationServer.Destination = {
      config: { policy },
      push: async (e) => {
        mockPush(e);
      },
    };

    const { elb } = await getCollector({
      destinations: { destination },
    });

    await elb(event);

    expect(mockPush).toHaveBeenCalledWith({
      ...event,
      event: 'new name',
      data: expect.objectContaining({
        string: 'bar',
        number: undefined, // Redacted due to missing consent
        new: 'value',
      }),
      nested: [expect.objectContaining({ type: 'kid' })],
      // timing: 0, // @TODO should be set to default type
    });
  });

  describe('wrapper integration', () => {
    test('should pass wrapper to destination push functions', async () => {
      const mockPushWithWrapper = jest.fn();
      const onCall = jest.fn();

      const destination: DestinationServer.Destination = {
        config: { wrapper: { onCall } },
        push: mockPushWithWrapper,
      };

      const { elb } = await getCollector({
        destinations: { destination },
      });

      await elb(mockEvent);

      expect(mockPushWithWrapper).toHaveBeenCalledWith(
        expect.objectContaining({
          event: mockEvent.event,
        }),
        expect.objectContaining({
          wrap: expect.any(Function),
        }),
      );
    });

    test('should pass wrapper to destination init functions', async () => {
      const mockInitWithWrapper = jest.fn();
      const onCall = jest.fn();

      const destination: DestinationServer.Destination = {
        config: { wrapper: { onCall } },
        init: mockInitWithWrapper,
        push: mockPush,
      };

      const { elb } = await getCollector({
        destinations: { destination },
      });

      await elb(mockEvent);

      expect(mockInitWithWrapper).toHaveBeenCalledWith(
        expect.objectContaining({
          wrap: expect.any(Function),
        }),
      );
    });
  });
});
