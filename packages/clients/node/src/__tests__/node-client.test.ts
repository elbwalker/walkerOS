import type { NodeClient, NodeDestination } from '../types';
import type { WalkerOS } from '@elbwalker/types';
import { createNodeClient } from '../';

describe('Client', () => {
  const mockDestinationPush = jest.fn(); //.mockImplementation(console.log);
  const mockDestination: NodeDestination.Destination = {
    config: {},
    push: mockDestinationPush,
  };
  let mockEvent: WalkerOS.Event;
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

    mockEvent = {
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
      version: { client: expect.any(String), tagging: expect.any(Number) },
      source: {
        type: 'node',
        id: '',
        previous_id: '',
      },
    };
  });

  test('create', () => {
    const { elb, instance } = getClient();
    expect(elb).toBeDefined();
    expect(instance).toBeDefined();
    expect(elb).toBe(instance.push);
  });

  test('add destination', async () => {
    const { elb, instance } = getClient({});
    expect(instance.destinations).toEqual({});
    elb('walker destination', mockDestination, { id: 'mock' });
    expect(instance.destinations).toEqual({
      mock: {
        config: { id: 'mock' },
        queue: [],
        push: mockDestinationPush,
      },
    });
  });

  test('push regular', async () => {
    const { elb } = getClient();
    result = await elb(mockEvent);
    expect(mockDestinationPush).toHaveBeenCalledTimes(1);
    expect(mockDestinationPush).toHaveBeenCalledWith(
      [{ event: mockEvent }],
      mockDestination.config,
    );
    expect(result).toEqual({
      event: mockEvent,
      status: { ok: true },
      successful: [{ id: 'mock', destination: mockDestination }],
      queued: [],
      failed: [],
    });
  });

  test('push event', async () => {
    const { elb } = getClient({
      destinations: { mock: mockDestination },
      globalsStatic: { glow: 'balls' },
      user: { id: 'us3r1d' },
      consent: { test: true },
      tagging: 42,
    });
    const event = {
      event: 'e a',
      data: {},
      context: {},
      custom: {},
      globals: { glow: 'balls' },
      user: { id: 'us3r1d' },
      nested: [],
      consent: { test: true },
      id: expect.any(String),
      trigger: '',
      entity: 'e',
      action: 'a',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 1,
      version: {
        client: expect.any(String),
        tagging: 42,
      },
      source: {
        type: 'node',
        id: '',
        previous_id: '',
      },
    };

    await elb('e a');
    expect(mockDestinationPush).toHaveBeenCalledTimes(1);
    expect(mockDestinationPush).toHaveBeenCalledWith(
      [
        {
          event,
        },
      ],
      mockDestination.config,
    );
  });

  test('push failure', async () => {
    const { elb } = getClient();
    const elbWithZeroParams =
      elb as unknown as () => Promise<NodeClient.PushResult>;

    result = await elbWithZeroParams();

    expect(result.status).toHaveProperty('ok', false);
    expect(result.status.error).toBe('Error: Event name is required');

    result = await elb('foo');
    expect(result.status).toHaveProperty('ok', false);
    expect(result.status.error).toBe('Error: Event name is invalid');
  });

  test('globals', async () => {
    let { instance } = getClient({});
    expect(instance).toHaveProperty('globals', {});
    expect(instance.config).toHaveProperty('globalsStatic', {});

    ({ instance } = getClient({ globalsStatic: { foo: 'bar' } }));
    expect(instance).toHaveProperty('globals', { foo: 'bar' });
    expect(instance.config).toHaveProperty('globalsStatic', { foo: 'bar' });

    ({ instance } = getClient({ globalsStatic: { foo: 'bar' } }));
    instance.globals.a = 1;
    await instance.push('walker globals', { b: 2 });
    let result = await instance.push('e a');
    expect(result.event).toHaveProperty('count', 1);
    expect(result.event).toHaveProperty('globals', { foo: 'bar', a: 1, b: 2 });

    await instance.push('walker run', { globals: { c: 3 } });
    result = await instance.push('e a');
    expect(result.event).toHaveProperty('count', 1);
    expect(result.event).toHaveProperty('globals', { foo: 'bar', c: 3 });
  });

  test('timing', async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    const { elb } = getClient();

    jest.advanceTimersByTime(2500); // 2.5 sec load time
    let result = await elb(mockEvent);
    expect(result.event?.timing).toEqual(2.5);

    jest.advanceTimersByTime(1000); // 1 sec to new run
    await elb('walker run');
    result = await elb(mockEvent);
    expect(result.event?.timing).toEqual(0);

    jest.advanceTimersByTime(5000); // wait 5 sec
    result = await elb(mockEvent);
    expect(result.event?.timing).toEqual(5);
  });

  test('source', async () => {
    const { elb } = getClient();

    mockEvent.source = { type: 'node', id: '1d', previous_id: 'pr3v10us' };
    result = await elb(mockEvent);

    expect(result.event).toHaveProperty('source', {
      type: 'node',
      id: '1d',
      previous_id: 'pr3v10us',
    });
  });
});
