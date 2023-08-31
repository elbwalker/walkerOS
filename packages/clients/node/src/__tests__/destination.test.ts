import type { NodeClient, NodeDestination } from '../types';
import type { Elbwalker } from '@elbwalker/types';
import { createNodeClient } from '../';
import { assign } from '@elbwalker/utils';

describe('Destination', () => {
  const mockDestinationPush = jest.fn(); //.mockImplementation(console.log);
  const version = { client: expect.any(String), tagging: expect.any(Number) };
  const mockEvent: Elbwalker.Event = {
    event: 'entity action',
    data: expect.any(Object),
    context: {},
    custom: {},
    globals: {},
    user: {},
    nested: [],
    consent: expect.any(Object),
    id: expect.any(String),
    trigger: '',
    entity: 'entity',
    action: 'action',
    timestamp: expect.any(Number),
    timing: expect.any(Number),
    group: expect.any(String),
    count: expect.any(Number),
    version,
    source: {
      type: 'node',
      id: '',
      previous_id: '',
    },
  };
  const mockDestination: NodeDestination.Function = {
    config: {},
    push: mockDestinationPush,
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

  test('add with queue', async () => {
    const { elb, instance } = getClient({});

    result = await elb(mockEvent);
    expect(result.successful).toHaveProperty('length', 0);
    expect(result.queued).toHaveProperty('length', 0);
    expect(result.failed).toHaveProperty('length', 0);

    // Update values after pushing the event
    instance.config.consent = { demo: true };
    instance.config.user = { id: 'us3r' };
    instance.config.globals = { foo: 'bar' };

    const updatedEvent = assign(mockEvent, {
      consent: { demo: true },
      user: { id: 'us3r' },
      globals: { foo: 'bar' },
    });
    result = await elb('walker destination', mockDestination, { id: 'mock' });
    expect(result.successful).toHaveProperty('length', 1);
    expect(result.successful[0]).toHaveProperty('id', 'mock');
    expect(mockDestinationPush).toHaveBeenCalledWith([
      { event: updatedEvent, config: { id: 'mock' } },
    ]);
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
      event: mockEvent,
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
          error: expect.any(Error),
        },
      ],
    });
    expect(result.failed[0].error).toHaveProperty('message', 'kaputt');
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
    expect(mockPush).toHaveBeenCalledWith([
      { event: mockEvent, config: expect.any(Object) },
    ]);
    expect(result.status).toHaveProperty('ok', true);
    expect(result.successful[0]).toHaveProperty('id', 'destinationConsent');
    expect(result).toHaveProperty('queued', []);
    expect(result).toHaveProperty('failed', []);
  });
});
