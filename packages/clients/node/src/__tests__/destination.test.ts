import type { NodeClient, NodeDestination } from '../types';
import type { Elbwalker } from '@elbwalker/types';
import { createNodeClient } from '../';
import { assign } from '@elbwalker/utils';

describe('Destination', () => {
  const mockPush = jest.fn(); //.mockImplementation(console.log);
  const mockInit = jest.fn().mockImplementation(() => {
    return true;
  });

  const mockEvent: Elbwalker.Event = {
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
  const mockDestination: NodeDestination.Function = {
    config: {},
    init: mockInit,
    push: mockPush,
  };
  let result: NodeClient.PushResult;

  function getClient(custom?: Partial<NodeClient.Config>) {
    const config = custom || {
      destinations: { mock: mockDestination },
    };

    return createNodeClient(config);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test.skip('regular', async () => {});

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
    expect(instance.config.queue[0]).toEqual(
      expect.objectContaining({
        consent: {},
        user: {},
        globals: {},
      }),
    );

    // Update values after pushing the event
    instance.config.consent = { demo: true };
    instance.config.user = { id: 'us3r' };
    instance.config.globals = { foo: 'bar' };

    result = await elb('walker destination', mockDestination, { id: 'later' });
    expect(result.successful).toHaveProperty('length', 1);
    expect(result.successful[0]).toHaveProperty('id', 'later');
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0][0].event).toEqual(
      expect.objectContaining({
        consent: { demo: true },
        user: { id: 'us3r' },
        globals: { foo: 'bar' },
      }),
    );
  });

  test('fail', async () => {
    const destinationFailure: NodeDestination.Function = {
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

  test.skip('queue', async () => {});

  test('consent', async () => {
    const mockPush = jest.fn();
    const destinationConsent: NodeDestination.Function = {
      config: { consent: { test: true } },
      push: mockPush,
    };

    const { elb } = getClient({
      destinations: { mockDestination, destinationConsent },
    });

    result = await elb(mockEvent);
    expect(result.status).toHaveProperty('ok', true);
    expect(result.successful[0]).toHaveProperty('id', 'mockDestination');
    expect(result.queued[0]).toHaveProperty('id', 'destinationConsent');

    result = await elb('walker consent', { test: false });
    expect(result.status).toHaveProperty('ok', true);
    expect(result).toHaveProperty('successful', []);
    expect(result).toHaveProperty('queued', []);
    expect(result).toHaveProperty('failed', []);

    result = await elb('walker consent', { test: true });
    expect(mockPush.mock.calls[0][0][0].event).toEqual(
      expect.objectContaining({
        consent: { test: true },
      }),
    );
    expect(result.status).toHaveProperty('ok', true);
    expect(result.successful[0]).toHaveProperty('id', 'destinationConsent');
    expect(result).toHaveProperty('queued', []);
    expect(result).toHaveProperty('failed', []);
  });
});
