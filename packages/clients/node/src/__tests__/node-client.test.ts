import type { NodeClient, NodeDestination } from '../types';
import type { Elbwalker } from '@elbwalker/types';
import { createNodeClient } from '../';

describe('Node Client', () => {
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
    consent: {},
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
      id: '@TODO',
      previous_id: '@TODO',
    },
  };
  const mockDestination: NodeDestination.Function = {
    config: {},
    push: mockDestinationPush,
  };

  function getClient(custom?: unknown) {
    const config: Partial<NodeClient.Config> = custom || {
      destinations: { mock: mockDestination },
    };

    return createNodeClient(config);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('create', () => {
    const { elb, instance } = getClient();
    expect(elb).toBeDefined();
    expect(instance).toBeDefined();
    expect(elb).toBe(instance.push);
  });

  test('add destination', async () => {
    const { instance } = getClient({});
    expect(instance.config.destinations).toEqual({});
    instance.addDestination('mock', mockDestination);
    expect(instance.config.destinations).toEqual({ mock: mockDestination });
  });

  test('push regular', async () => {
    const { elb } = getClient();
    const result = await elb(mockEvent);
    expect(mockDestinationPush).toHaveBeenCalledTimes(1);
    expect(mockDestinationPush).toHaveBeenCalledWith([
      { event: mockEvent, config: mockDestination.config },
    ]);
    expect(result).toEqual({
      status: { ok: true },
      successful: [{ id: 'mock', destination: mockDestination }],
      failed: [],
    });
  });

  test('push failure', async () => {
    const { elb } = getClient();
    let result = await (elb as Function)();

    expect(result.status).toHaveProperty('ok', false);
    expect(result.status).toHaveProperty('error', expect.any(Error));
    expect(result.status.error).toHaveProperty(
      'message',
      'Event name is required',
    );

    result = await elb('foo');
    expect(result.status).toHaveProperty('ok', false);
    expect(result.status).toHaveProperty('error', expect.any(Error));
    expect(result.status.error).toHaveProperty(
      'message',
      'Event name is invalid',
    );
  });
});
