import type { NodeClient, NodeDestination } from '../types';
import type { WalkerOS } from '@elbwalker/types';
import { createNodeClient } from '../';

describe('Destination', () => {
  const mockPush = jest.fn(); //.mockImplementation(console.log);
  const mockInit = jest.fn();

  const mockEvent: WalkerOS.Event = {
    event: 'entity action',
    data: { k: 'v' },
    context: {},
    custom: {},
    globals: {},
    user: {},
    nested: [],
    consent: {},
    id: '1d',
    trigger: '',
    entity: 'entity',
    action: 'action',
    timestamp: 1,
    timing: 1,
    group: 'g',
    count: 1,
    version: { client: 'c', tagging: 1 },
    source: { type: 'node', id: '', previous_id: '' },
  };
  const mockDestination: NodeDestination.Destination = {
    config: {},
    init: mockInit,
    push: mockPush,
  };
  let result: NodeClient.PushResult;

  function getClient(custom?: Partial<NodeClient.InitConfig>) {
    const config = custom || {
      destinations: { mock: mockDestination },
    };

    return createNodeClient(config);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  // @TODO test.skip('regular', async () => {});

  test('init call', async () => {
    const { elb } = getClient();

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

  test('add with queue', async () => {
    const { elb, instance } = getClient({});

    result = await elb(mockEvent);
    expect(result.successful).toHaveProperty('length', 0);
    expect(result.queued).toHaveProperty('length', 0);
    expect(result.failed).toHaveProperty('length', 0);
    expect(instance.queue[0]).toEqual(
      expect.objectContaining({
        consent: {},
        user: {},
        globals: {},
      }),
    );

    // Update values after pushing the event
    instance.consent = { demo: true };
    instance.user = { id: 'us3r' };
    instance.globals = { foo: 'bar' };

    result = await elb('walker destination', mockDestination, { id: 'later' });
    expect(result.successful).toHaveProperty('length', 1);
    expect(result.successful[0]).toHaveProperty('id', 'later');
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        consent: { demo: true },
        user: { id: 'us3r' },
        globals: { foo: 'bar' },
      }),
    );
  });

  test('fail', async () => {
    const destinationFailure: NodeDestination.Destination = {
      config: {},
      push: jest.fn().mockImplementation(() => {
        throw new Error('kaputt');
      }),
    };

    const { elb } = getClient({
      destinations: { mockDestination, destinationFailure },
    });
    result = await elb('entity action');

    expect(result).toEqual({
      event: expect.any(Object),
      status: { ok: false },
      successful: [
        {
          id: 'mockDestination',
          destination: mockDestination,
        },
      ],
      queued: [],
      failed: [
        {
          id: 'destinationFailure',
          destination: destinationFailure,
          error: expect.any(String),
        },
      ],
    });
    expect(result.failed[0].error).toBe('Error: kaputt');
  });

  // @TODO test.skip('queue', async () => {});

  test('consent', async () => {
    const mockPush = jest.fn();
    const destinationConsent: NodeDestination.Destination = {
      config: { consent: { test: true } },
      push: mockPush,
    };

    const { elb } = getClient({
      destinations: { mockDestination, destinationConsent },
    });

    result = await elb(mockEvent);
    expect(result).toStrictEqual(
      expect.objectContaining({
        status: { ok: true },
        successful: [expect.objectContaining({ id: 'mockDestination' })],
        queued: [expect.objectContaining({ id: 'destinationConsent' })],
      }),
    );

    result = await elb('walker consent', { test: false });
    expect(result).toStrictEqual(
      expect.objectContaining({
        status: { ok: true },
        successful: [],
        queued: [],
        failed: [],
      }),
    );

    result = await elb('walker consent', { test: true });
    expect(mockPush.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        consent: { test: true },
      }),
    );
    expect(result).toStrictEqual(
      expect.objectContaining({
        status: { ok: true },
        successful: [expect.objectContaining({ id: 'destinationConsent' })],
        queued: [],
      }),
    );
  });
});
